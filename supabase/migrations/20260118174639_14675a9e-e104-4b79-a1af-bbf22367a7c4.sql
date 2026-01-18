-- Drop the problematic policy that includes is_active = true check
DROP POLICY IF EXISTS "Admins can manage company activities" ON company_activities;

-- Create corrected policy without is_active check in USING clause
-- The is_active filter should be in SELECT queries, not in RLS for mutations
CREATE POLICY "Admins can manage company activities"
ON company_activities
FOR ALL
TO public
USING (
  -- Admin in the company OR super admin
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.company_id = company_activities.company_id
    AND user_roles.role = 'admin'
    AND user_roles.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
)
WITH CHECK (
  -- Same check for inserts/updates
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.company_id = company_activities.company_id
    AND user_roles.role = 'admin'
    AND user_roles.status = 'active'
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_super_admin = true
  )
);