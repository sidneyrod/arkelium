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
  companyId: string; // Target company - REQUIRED
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

    // Verify the requesting user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', code: 'missing_auth' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', code: 'unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      companyId,
      hourlyRate,
      salary,
      province,
      employmentType,
    } = body;

    // Validate required fields
    if (!email || !firstName) {
      return new Response(
        JSON.stringify({ error: 'Email and first name are required', code: 'missing_fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate companyId is provided
    if (!companyId) {
      return new Response(
        JSON.stringify({ error: 'Company ID is required', code: 'missing_company' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requesting user is admin IN THE TARGET COMPANY
    const { data: requestingUserRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('company_id', companyId)
      .eq('status', 'active')
      .single();

    if (roleError || requestingUserRole?.role !== 'admin') {
      console.error('User is not admin in target company or role error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Only admins can create users in this company', code: 'not_admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate custom_role_id if provided
    if (roleId) {
      const { data: customRole, error: customRoleError } = await supabaseAdmin
        .from('custom_roles')
        .select('id, is_active')
        .eq('id', roleId)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .single();

      if (customRoleError || !customRole) {
        console.error('Invalid custom role for company:', customRoleError);
        return new Response(
          JSON.stringify({ error: 'Cargo personalizado inválido para esta empresa.', code: 'invalid_role' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Creating user:', email, 'for company:', companyId);

    // Create user in auth with default password
    // Include company_id in metadata so the handle_new_user trigger can insert it into profiles
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        company_id: companyId,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      
      // Handle specific error: email already exists
      if (createError.code === 'email_exists') {
        return new Response(
          JSON.stringify({ 
            error: 'Este e-mail já está cadastrado no sistema.', 
            code: 'email_exists' 
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle other auth errors
      return new Response(
        JSON.stringify({ 
          error: createError.message, 
          code: createError.code || 'auth_error' 
        }),
        { status: createError.status || 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created in auth:', newUser.user.id);

    // Update profile with company_id and other details, set must_change_password flag
    // Using upsert to ensure profile is created/updated correctly
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        company_id: companyId,
        email: email,
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
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Error upserting profile:', profileError);
      // Rollback: delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao criar perfil do usuário. Tente novamente.', 
          code: 'profile_error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user role with custom_role_id if provided
    // Using upsert to ensure role is created/updated correctly
    const validRole = role === 'admin' || role === 'manager' || role === 'cleaner' ? role : 'cleaner';
    
    const userRoleData: {
      user_id: string;
      company_id: string;
      role: string;
      custom_role_id?: string | null;
      status: string;
    } = {
      user_id: newUser.user.id,
      company_id: companyId,
      role: validRole,
      custom_role_id: roleId || null,
      status: 'active',
    };
    
    const { error: insertRoleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(userRoleData, {
        onConflict: 'user_id,company_id'
      });

    if (insertRoleError) {
      console.error('Error upserting role:', insertRoleError);
      // Rollback: delete the auth user and profile we just created
      await supabaseAdmin.from('profiles').delete().eq('id', newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao atribuir cargo ao usuário. Tente novamente.', 
          code: 'role_error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User setup complete:', newUser.user.id, 'with role:', validRole, 'in company:', companyId);

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
      JSON.stringify({ error: 'Internal server error', code: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
