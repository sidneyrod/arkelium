import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Default password for new users - they must change on first login
const DEFAULT_PASSWORD = 'Admin123!';

interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  city?: string;
  province_address?: string;
  country?: string;
  postalCode?: string;
  role: 'admin' | 'manager' | 'cleaner';
  roleId?: string; // custom_role ID
  companyId: string;
  hourlyRate?: number;
  salary?: number;
  province?: string;
  employmentType?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated and is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin
    const { data: requestingUserRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (requestingUserRole?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requesting user's company_id
    const { data: requestingProfile } = await supabaseAdmin
      .from('profiles')
      .select('company_id')
      .eq('id', requestingUser.id)
      .single();

    if (!requestingProfile?.company_id) {
      return new Response(
        JSON.stringify({ error: 'Admin has no company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateUserRequest = await req.json();
    const {
      email,
      firstName,
      lastName,
      phone,
      address,
      city,
      province_address,
      country,
      postalCode,
      role,
      roleId,
      hourlyRate,
      salary,
      province,
      employmentType,
    } = body;

    // Validate required fields
    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ error: 'Email and first name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating user:', email, 'for company:', requestingProfile.company_id);

    // Create user in auth with default password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created in auth:', newUser.user.id);

    // Update profile with company_id and other details, set must_change_password flag
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_id: requestingProfile.company_id,
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        address: address || null,
        city: city || null,
        province: province_address || null,
        country: country || 'Canada',
        postal_code: postalCode || null,
        hourly_rate: hourlyRate || null,
        salary: salary || null,
        primary_province: province || 'ON',
        employment_type: employmentType || 'full-time',
        must_change_password: true, // Force password change on first login
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
    }

    // Create user role with custom_role_id if provided
    const validRole = role === 'admin' || role === 'manager' || role === 'cleaner' ? role : 'cleaner';
    
    const userRoleData: {
      user_id: string;
      company_id: string;
      role: string;
      custom_role_id?: string;
    } = {
      user_id: newUser.user.id,
      company_id: requestingProfile.company_id,
      role: validRole,
    };
    
    // Add custom_role_id if provided
    if (roleId) {
      userRoleData.custom_role_id = roleId;
    }
    
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert(userRoleData);

    if (roleError) {
      console.error('Error creating role:', roleError);
    }

    console.log('User setup complete:', newUser.user.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
