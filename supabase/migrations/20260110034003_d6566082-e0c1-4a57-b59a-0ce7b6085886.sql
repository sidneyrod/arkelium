-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Create new policy that allows users to view companies where they have an active role
CREATE POLICY "Users can view companies where they have a role"
  ON companies
  FOR SELECT
  TO public
  USING (
    id IN (
      SELECT company_id 
      FROM user_roles 
      WHERE user_id = auth.uid() 
      AND status = 'active'
    )
  );