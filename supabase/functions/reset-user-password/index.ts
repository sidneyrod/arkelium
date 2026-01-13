import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a strong random password
function generateStrongPassword(): string {
  const length = 16;
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*?';
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

interface ResetPasswordRequest {
  userId: string;
  companyId?: string; // Company context for multi-tenant admin validation
  newPassword?: string; // Optional - if not provided, generate a strong password
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
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Requesting user ID:', requestingUser.id);

    const body: ResetPasswordRequest = await req.json();
    const { userId, companyId, newPassword: providedPassword } = body;

    console.log('Request body - userId:', userId, 'companyId:', companyId);

    // Validate required fields
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine effective company ID
    let effectiveCompanyId = companyId;
    
    if (!effectiveCompanyId) {
      // Fallback: get from requesting user's profile
      const { data: requestingProfile } = await supabaseAdmin
        .from('profiles')
        .select('company_id')
        .eq('id', requestingUser.id)
        .single();
      
      effectiveCompanyId = requestingProfile?.company_id;
      console.log('Fallback company_id from profile:', effectiveCompanyId);
    }

    if (!effectiveCompanyId) {
      console.error('No company context available');
      return new Response(
        JSON.stringify({ error: 'Company context required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Effective company ID:', effectiveCompanyId);

    // Check if requesting user is admin in the effective company
    // Using .maybeSingle() to avoid "multiple rows" error
    const { data: adminRole, error: adminRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .eq('company_id', effectiveCompanyId)
      .eq('role', 'admin')
      .eq('status', 'active')
      .maybeSingle();

    console.log('Admin role check result:', adminRole, 'Error:', adminRoleError);

    if (adminRoleError) {
      console.error('Error checking admin role:', adminRoleError);
      return new Response(
        JSON.stringify({ error: 'Error verifying admin permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!adminRole) {
      console.error('User is not admin in company:', effectiveCompanyId);
      return new Response(
        JSON.stringify({ error: 'Only admins can reset passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user belongs to the same company via user_roles (more robust for multi-tenant)
    const { data: targetUserRole, error: targetRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .eq('user_id', userId)
      .eq('company_id', effectiveCompanyId)
      .eq('status', 'active')
      .maybeSingle();

    console.log('Target user role check:', targetUserRole, 'Error:', targetRoleError);

    if (targetRoleError) {
      console.error('Error checking target user:', targetRoleError);
      return new Response(
        JSON.stringify({ error: 'Error verifying target user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetUserRole) {
      console.error('Target user not found in company:', effectiveCompanyId);
      return new Response(
        JSON.stringify({ error: 'User not found in your company' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use provided password or generate a strong one
    const passwordToSet = providedPassword || generateStrongPassword();

    if (providedPassword && providedPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resetting password for user:', userId);

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: passwordToSet }
    );

    if (updateError) {
      console.error('Error resetting password:', updateError);
      
      // Handle weak password error specifically
      if (updateError.code === 'weak_password' || updateError.message?.includes('weak')) {
        return new Response(
          JSON.stringify({ 
            error: 'Password rejected for security reasons. Please use a stronger password.',
            code: 'weak_password'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark user to change password on next login
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    if (profileUpdateError) {
      console.warn('Warning: Could not set must_change_password flag:', profileUpdateError);
      // Don't fail the request, password was already reset successfully
    }

    console.log('Password reset successful for user:', userId);

    // Return the generated password if we generated one
    const responseData: { success: boolean; tempPassword?: string } = { success: true };
    if (!providedPassword) {
      responseData.tempPassword = passwordToSet;
    }

    return new Response(
      JSON.stringify(responseData),
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
