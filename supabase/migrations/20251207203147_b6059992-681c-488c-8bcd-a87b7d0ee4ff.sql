-- Create a policy to allow authenticated users to create a company (for onboarding)
CREATE POLICY "Authenticated users can create a company" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create a policy to allow authenticated users to create company_branding for their company
CREATE POLICY "Users can create branding for their company" 
ON public.company_branding 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id());

-- Create a policy to allow authenticated users to create company_estimate_config for their company
CREATE POLICY "Users can create estimate config for their company" 
ON public.company_estimate_config 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id());

-- Allow users to insert clients in their company
CREATE POLICY "Users can insert clients" 
ON public.clients 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND is_admin_or_manager());

-- Allow users to insert client locations in their company
CREATE POLICY "Users can insert client locations" 
ON public.client_locations 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND is_admin_or_manager());

-- Allow users to insert client payment methods in their company
CREATE POLICY "Users can insert payment methods" 
ON public.client_payment_methods 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND is_admin_or_manager());

-- Allow users to insert jobs in their company
CREATE POLICY "Users can insert jobs" 
ON public.jobs 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND is_admin_or_manager());

-- Allow users to insert contracts in their company
CREATE POLICY "Users can insert contracts" 
ON public.contracts 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND is_admin_or_manager());

-- Allow users to insert invoices in their company
CREATE POLICY "Users can insert invoices" 
ON public.invoices 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND is_admin_or_manager());

-- Allow users to insert invoice items
CREATE POLICY "Users can insert invoice items" 
ON public.invoice_items 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM invoices i
    WHERE i.id = invoice_items.invoice_id 
    AND i.company_id = get_user_company_id() 
    AND is_admin_or_manager()
  )
);

-- Allow admins to insert payroll periods
CREATE POLICY "Admins can insert payroll periods" 
ON public.payroll_periods 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'::app_role));

-- Allow admins to insert payroll entries
CREATE POLICY "Admins can insert payroll entries" 
ON public.payroll_entries 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'::app_role));

-- Allow admins to insert extra fees
CREATE POLICY "Admins can insert extra fees" 
ON public.extra_fees 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'::app_role));

-- Allow admins to insert checklist items
CREATE POLICY "Admins can insert checklist items" 
ON public.checklist_items 
FOR INSERT 
TO authenticated
WITH CHECK (company_id = get_user_company_id() AND has_role('admin'::app_role));

-- Allow users to insert cleaner availability
CREATE POLICY "Users can insert availability" 
ON public.cleaner_availability 
FOR INSERT 
TO authenticated
WITH CHECK (
  company_id = get_user_company_id() AND 
  (cleaner_id = auth.uid() OR is_admin_or_manager())
);