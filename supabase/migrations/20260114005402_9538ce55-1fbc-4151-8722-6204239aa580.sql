-- Fix infinite recursion in RLS policies for profiles table

-- 1. Create safe SECURITY DEFINER function to check Super-Admin status
CREATE OR REPLACE FUNCTION public.is_super_admin_safe()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 2. Drop problematic RLS policies on profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only super admins can update super admin status" ON public.profiles;

-- 3. Update user_has_access_to_company to use safe function
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins have access to all companies (using safe function)
  SELECT public.is_super_admin_safe()
  OR
  -- Regular users need an active role in the company
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND status = 'active'
  );
$$;

-- 4. Update has_role to use safe function
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins have all roles (using safe function)
  SELECT public.is_super_admin_safe()
  OR
  -- Regular check
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
      AND company_id = public.get_user_company_id()
  );
$$;

-- 5. Update has_role_in_company to use safe function
CREATE OR REPLACE FUNCTION public.has_role_in_company(p_company_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins have all roles in all companies (using safe function)
  SELECT public.is_super_admin_safe()
  OR
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = p_company_id
      AND ur.role = p_role
      AND ur.status = 'active'
  );
$$;

-- 6. Update is_admin_or_manager to use safe function
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins are always admin/manager (using safe function)
  SELECT public.is_super_admin_safe()
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
      AND company_id = public.get_user_company_id()
  );
$$;

-- 7. Drop existing profiles policies to recreate them safely
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update company profiles" ON public.profiles;

-- 8. Recreate safe RLS policies for profiles
-- SELECT: Users can view their own profile, or profiles in companies they have access to, or if super-admin
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid()
  OR public.is_super_admin_safe()
  OR public.user_has_access_to_company(company_id)
);

-- UPDATE: Users can update their own profile, or super-admins can update any
-- But is_super_admin column can only be changed by super-admins
CREATE POLICY "Users can update profiles"
ON public.profiles
FOR UPDATE
USING (
  id = auth.uid() 
  OR public.is_super_admin_safe()
)
WITH CHECK (
  -- Allow if not changing is_super_admin OR if user is super-admin
  (
    is_super_admin IS NOT DISTINCT FROM (SELECT p.is_super_admin FROM public.profiles p WHERE p.id = profiles.id)
  )
  OR public.is_super_admin_safe()
);

-- INSERT: Only system can insert (via trigger on auth.users)
CREATE POLICY "System can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);