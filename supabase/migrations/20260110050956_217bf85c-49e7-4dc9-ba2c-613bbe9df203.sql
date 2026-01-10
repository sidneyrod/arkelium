-- Fix companies UPDATE policy to allow admins to update any company they have admin role in
DROP POLICY IF EXISTS "Admins can update their company" ON companies;

CREATE POLICY "Admins can update their companies"
  ON companies
  FOR UPDATE
  TO public
  USING (
    public.has_role_in_company(id, 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role_in_company(id, 'admin'::public.app_role)
  );

-- Also update companies DELETE policy
DROP POLICY IF EXISTS "Admins can delete their company" ON companies;

CREATE POLICY "Admins can delete their companies"
  ON companies
  FOR DELETE
  TO public
  USING (
    public.has_role_in_company(id, 'admin'::public.app_role)
  );