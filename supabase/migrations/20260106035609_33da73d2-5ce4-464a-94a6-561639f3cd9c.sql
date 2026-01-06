-- Drop the existing restrictive policy that only allows admins
DROP POLICY IF EXISTS "Admin can manage cash collections" ON cash_collections;

-- Create new policy that allows both admin AND manager to manage cash collections
CREATE POLICY "Admin or Manager can manage cash collections"
  ON cash_collections
  FOR ALL
  USING (
    company_id = get_user_company_id() 
    AND is_admin_or_manager()
  )
  WITH CHECK (
    company_id = get_user_company_id() 
    AND is_admin_or_manager()
  );