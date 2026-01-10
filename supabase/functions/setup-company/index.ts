import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupCompanyRequest {
  companyName: string;
  legalName: string;
  email?: string;
  phone?: string;
  province?: string;
  businessNumber?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  // If true, skip the check for existing company (for admin registering additional companies)
  skipCompanyCheck?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create user client to get the authenticated user
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: {
        headers: { Authorization: authHeader }
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Failed to get user:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Setting up company for user:', user.id);

    // Parse request body
    const body: SetupCompanyRequest = await req.json();
    const { 
      companyName, legalName, email, phone, province, businessNumber,
      address, city, postalCode, website, timezone, skipCompanyCheck 
    } = body;

    if (!companyName || !legalName) {
      return new Response(
        JSON.stringify({ error: 'Company name and legal name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already belongs to a company (skip for admin registering additional companies)
    if (!skipCompanyCheck) {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      // Only block if user has no company yet AND we're not in skip mode
      // This allows the first company setup while letting admins register additional companies
      if (existingProfile?.company_id) {
        console.log('User already has a company, creating additional company without changing user profile');
      }
    }

    // Check if user already has a company
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const userAlreadyHasCompany = !!existingProfile?.company_id;

    // Create the company
    const { data: company, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({
        trade_name: companyName,
        legal_name: legalName,
        email: email || user.email,
        phone: phone || null,
        province: province || 'Ontario',
        business_number: businessNumber || null,
        address: address || null,
        city: city || null,
        postal_code: postalCode || null,
        website: website || null,
        timezone: timezone || 'America/Toronto',
        status: 'active',
        tenant_mode: 'shared',
      })
      .select()
      .single();

    if (companyError) {
      console.error('Failed to create company:', companyError);
      return new Response(
        JSON.stringify({ error: 'Failed to create company', details: companyError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Company created:', company.id);

    // Only update user profile if user doesn't already have a company
    if (!userAlreadyHasCompany) {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({ company_id: company.id })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        // Rollback: delete the company
        await supabaseAdmin.from('companies').delete().eq('id', company.id);
        return new Response(
          JSON.stringify({ error: 'Failed to update profile', details: profileError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create user_role as admin for this company
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: user.id,
        company_id: company.id,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString(),
      });

    if (roleError) {
      console.error('Failed to create role:', roleError);
      // Rollback: delete company and reset profile
      await supabaseAdmin.from('profiles').update({ company_id: null }).eq('id', user.id);
      await supabaseAdmin.from('companies').delete().eq('id', company.id);
      return new Response(
        JSON.stringify({ error: 'Failed to create user role', details: roleError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User role created as admin');

    // Create default chart of accounts
    try {
      await supabaseAdmin.rpc('create_default_chart_of_accounts', { p_company_id: company.id });
      console.log('Default chart of accounts created');
    } catch (chartError) {
      console.warn('Failed to create chart of accounts (non-fatal):', chartError);
    }

    // Create company branding with defaults
    const { error: brandingError } = await supabaseAdmin
      .from('company_branding')
      .insert({
        company_id: company.id,
        primary_color: '#1a3d2e',
        secondary_color: '#2d5a45',
        accent_color: '#4ade80',
      });

    if (brandingError) {
      console.warn('Failed to create branding (non-fatal):', brandingError);
    }

    // Create company estimate config with defaults
    const { error: configError } = await supabaseAdmin
      .from('company_estimate_config')
      .insert({
        company_id: company.id,
        default_hourly_rate: 35.00,
        tax_rate: 13.00,
        invoice_generation_mode: 'manual',
        accounting_method: 'cash',
        accounting_date_field: 'received_at',
      });

    if (configError) {
      console.warn('Failed to create estimate config (non-fatal):', configError);
    }

    // Create tax configuration for current year
    const currentYear = new Date().getFullYear();
    const { error: taxError } = await supabaseAdmin
      .from('tax_configurations')
      .insert({
        company_id: company.id,
        year: currentYear,
        cpp_employer_rate: 5.95,
        cpp_employee_rate: 5.95,
        cpp_max_contribution: 3867.50,
        ei_employer_rate: 2.21,
        ei_employee_rate: 1.58,
        ei_max_contribution: 1049.12,
      });

    if (taxError) {
      console.warn('Failed to create tax config (non-fatal):', taxError);
    }

    // Log the setup action
    await supabaseAdmin
      .from('activity_logs')
      .insert({
        company_id: company.id,
        user_id: user.id,
        action: 'company_created',
        entity_type: 'company',
        entity_id: company.id,
        after_data: company,
        source: 'api',
        performed_by_user_id: user.id,
        details: {
          setup_type: 'new_company',
          admin_email: user.email,
        },
      });

    console.log('Company setup completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        company: {
          id: company.id,
          tradeName: company.trade_name,
          legalName: company.legal_name,
        },
        message: 'Company setup completed successfully',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in setup-company:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
