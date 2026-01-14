-- Add super_admin flag to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- Update user_has_access_to_company to check super-admin status first
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins have access to all companies
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
  OR
  -- Regular users need an active role in the company
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND status = 'active'
  );
$$;

-- Also update has_role to consider super-admin as having all roles
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins have all roles
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
  OR
  -- Regular check
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = _role
      AND company_id = public.get_user_company_id()
  )
$$;

-- Update has_role_in_company similarly
CREATE OR REPLACE FUNCTION public.has_role_in_company(p_company_id uuid, p_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins have all roles in all companies
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
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

-- Update is_admin_or_manager to consider super-admin
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Super-admins are always admin/manager
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_super_admin = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'manager')
      AND company_id = public.get_user_company_id()
  )
$$;

-- RLS policy for profiles to allow super-admins to view all profiles
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
);

-- Protect the is_super_admin column - only super-admins can modify it
DROP POLICY IF EXISTS "Only super admins can update super admin status" ON public.profiles;
CREATE POLICY "Only super admins can update super admin status"
ON public.profiles
FOR UPDATE
USING (
  -- Can update own profile OR is super-admin
  id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
)
WITH CHECK (
  -- If trying to change is_super_admin, must be a super-admin
  (is_super_admin = (SELECT is_super_admin FROM public.profiles WHERE id = profiles.id))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.is_super_admin = true
  )
);