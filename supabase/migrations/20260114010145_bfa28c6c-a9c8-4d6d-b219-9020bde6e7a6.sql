-- Allow Super-Admins to view all companies
CREATE POLICY "Super admins can view all companies"
ON public.companies
FOR SELECT
USING (public.is_super_admin_safe());