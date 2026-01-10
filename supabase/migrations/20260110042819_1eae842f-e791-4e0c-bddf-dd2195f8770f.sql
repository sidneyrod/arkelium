-- Drop existing SELECT policies that use get_user_company_id()
DROP POLICY IF EXISTS "Users can view their company branding" ON company_branding;
DROP POLICY IF EXISTS "Users can view estimate config" ON company_estimate_config;
DROP POLICY IF EXISTS "Users can view extra fees" ON extra_fees;
DROP POLICY IF EXISTS "Users can view checklist items" ON checklist_items;

-- Create new SELECT policies that use user_roles (same pattern as companies table)
CREATE POLICY "Users can view company branding for their companies"
  ON company_branding
  FOR SELECT
  TO public
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.status = 'active'
    )
  );

CREATE POLICY "Users can view estimate config for their companies"
  ON company_estimate_config
  FOR SELECT
  TO public
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.status = 'active'
    )
  );

CREATE POLICY "Users can view extra fees for their companies"
  ON extra_fees
  FOR SELECT
  TO public
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.status = 'active'
    )
  );

CREATE POLICY "Users can view checklist items for their companies"
  ON checklist_items
  FOR SELECT
  TO public
  USING (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.status = 'active'
    )
  );

-- Also update admin policies that use has_role() which depends on get_user_company_id()
-- We need to check the role within the specific company context

DROP POLICY IF EXISTS "Admins can manage company branding" ON company_branding;
CREATE POLICY "Admins can manage company branding"
  ON company_branding
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = company_branding.company_id
      AND ur.role = 'admin'
      AND ur.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage estimate config" ON company_estimate_config;
CREATE POLICY "Admins can manage estimate config"
  ON company_estimate_config
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = company_estimate_config.company_id
      AND ur.role = 'admin'
      AND ur.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage extra fees" ON extra_fees;
CREATE POLICY "Admins can manage extra fees"
  ON extra_fees
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = extra_fees.company_id
      AND ur.role = 'admin'
      AND ur.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can insert extra fees" ON extra_fees;
CREATE POLICY "Admins can insert extra fees"
  ON extra_fees
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = extra_fees.company_id
      AND ur.role = 'admin'
      AND ur.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can manage checklist items" ON checklist_items;
CREATE POLICY "Admins can manage checklist items"
  ON checklist_items
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = checklist_items.company_id
      AND ur.role = 'admin'
      AND ur.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Admins can insert checklist items" ON checklist_items;
CREATE POLICY "Admins can insert checklist items"
  ON checklist_items
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.company_id = checklist_items.company_id
      AND ur.role = 'admin'
      AND ur.status = 'active'
    )
  );

-- Also update INSERT policies for branding and estimate config
DROP POLICY IF EXISTS "Users can create branding for their company" ON company_branding;
CREATE POLICY "Users can create branding for their company"
  ON company_branding
  FOR INSERT
  TO public
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.status = 'active'
    )
  );

DROP POLICY IF EXISTS "Users can create estimate config for their company" ON company_estimate_config;
CREATE POLICY "Users can create estimate config for their company"
  ON company_estimate_config
  FOR INSERT
  TO public
  WITH CHECK (
    company_id IN (
      SELECT ur.company_id 
      FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.status = 'active'
    )
  );