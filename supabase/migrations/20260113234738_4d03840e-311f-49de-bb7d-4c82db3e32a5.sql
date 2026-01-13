-- Create function to check if user has access to a specific company
CREATE OR REPLACE FUNCTION public.user_has_access_to_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND company_id = p_company_id
    AND status = 'active'
  );
$$;

-- Update RLS policies for jobs table
DROP POLICY IF EXISTS "Users can view jobs in their company" ON public.jobs;
CREATE POLICY "Users can view jobs in companies they have access to"
ON public.jobs FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert jobs in their company" ON public.jobs;
CREATE POLICY "Users can insert jobs in companies they have access to"
ON public.jobs FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update jobs in their company" ON public.jobs;
CREATE POLICY "Users can update jobs in companies they have access to"
ON public.jobs FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete jobs in their company" ON public.jobs;
CREATE POLICY "Users can delete jobs in companies they have access to"
ON public.jobs FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for invoices table
DROP POLICY IF EXISTS "Users can view invoices in their company" ON public.invoices;
CREATE POLICY "Users can view invoices in companies they have access to"
ON public.invoices FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert invoices in their company" ON public.invoices;
CREATE POLICY "Users can insert invoices in companies they have access to"
ON public.invoices FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update invoices in their company" ON public.invoices;
CREATE POLICY "Users can update invoices in companies they have access to"
ON public.invoices FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete invoices in their company" ON public.invoices;
CREATE POLICY "Users can delete invoices in companies they have access to"
ON public.invoices FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for cash_collections table
DROP POLICY IF EXISTS "Users can view cash collections in their company" ON public.cash_collections;
CREATE POLICY "Users can view cash collections in companies they have access to"
ON public.cash_collections FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert cash collections in their company" ON public.cash_collections;
CREATE POLICY "Users can insert cash collections in companies they have access to"
ON public.cash_collections FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update cash collections in their company" ON public.cash_collections;
CREATE POLICY "Users can update cash collections in companies they have access to"
ON public.cash_collections FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete cash collections in their company" ON public.cash_collections;
CREATE POLICY "Users can delete cash collections in companies they have access to"
ON public.cash_collections FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for contracts table
DROP POLICY IF EXISTS "Users can view contracts in their company" ON public.contracts;
CREATE POLICY "Users can view contracts in companies they have access to"
ON public.contracts FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert contracts in their company" ON public.contracts;
CREATE POLICY "Users can insert contracts in companies they have access to"
ON public.contracts FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update contracts in their company" ON public.contracts;
CREATE POLICY "Users can update contracts in companies they have access to"
ON public.contracts FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete contracts in their company" ON public.contracts;
CREATE POLICY "Users can delete contracts in companies they have access to"
ON public.contracts FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for clients table
DROP POLICY IF EXISTS "Users can view clients in their company" ON public.clients;
CREATE POLICY "Users can view clients in companies they have access to"
ON public.clients FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert clients in their company" ON public.clients;
CREATE POLICY "Users can insert clients in companies they have access to"
ON public.clients FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update clients in their company" ON public.clients;
CREATE POLICY "Users can update clients in companies they have access to"
ON public.clients FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete clients in their company" ON public.clients;
CREATE POLICY "Users can delete clients in companies they have access to"
ON public.clients FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for client_locations table
DROP POLICY IF EXISTS "Users can view client locations in their company" ON public.client_locations;
CREATE POLICY "Users can view client locations in companies they have access to"
ON public.client_locations FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert client locations in their company" ON public.client_locations;
CREATE POLICY "Users can insert client locations in companies they have access to"
ON public.client_locations FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update client locations in their company" ON public.client_locations;
CREATE POLICY "Users can update client locations in companies they have access to"
ON public.client_locations FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete client locations in their company" ON public.client_locations;
CREATE POLICY "Users can delete client locations in companies they have access to"
ON public.client_locations FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for payment_receipts table
DROP POLICY IF EXISTS "Users can view payment receipts in their company" ON public.payment_receipts;
CREATE POLICY "Users can view payment receipts in companies they have access to"
ON public.payment_receipts FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert payment receipts in their company" ON public.payment_receipts;
CREATE POLICY "Users can insert payment receipts in companies they have access to"
ON public.payment_receipts FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update payment receipts in their company" ON public.payment_receipts;
CREATE POLICY "Users can update payment receipts in companies they have access to"
ON public.payment_receipts FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete payment receipts in their company" ON public.payment_receipts;
CREATE POLICY "Users can delete payment receipts in companies they have access to"
ON public.payment_receipts FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for absence_requests table
DROP POLICY IF EXISTS "Users can view absence requests in their company" ON public.absence_requests;
CREATE POLICY "Users can view absence requests in companies they have access to"
ON public.absence_requests FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert absence requests in their company" ON public.absence_requests;
CREATE POLICY "Users can insert absence requests in companies they have access to"
ON public.absence_requests FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update absence requests in their company" ON public.absence_requests;
CREATE POLICY "Users can update absence requests in companies they have access to"
ON public.absence_requests FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete absence requests in their company" ON public.absence_requests;
CREATE POLICY "Users can delete absence requests in companies they have access to"
ON public.absence_requests FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for cleaner_availability table
DROP POLICY IF EXISTS "Users can view cleaner availability in their company" ON public.cleaner_availability;
CREATE POLICY "Users can view cleaner availability in companies they have access to"
ON public.cleaner_availability FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert cleaner availability in their company" ON public.cleaner_availability;
CREATE POLICY "Users can insert cleaner availability in companies they have access to"
ON public.cleaner_availability FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update cleaner availability in their company" ON public.cleaner_availability;
CREATE POLICY "Users can update cleaner availability in companies they have access to"
ON public.cleaner_availability FOR UPDATE
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can delete cleaner availability in their company" ON public.cleaner_availability;
CREATE POLICY "Users can delete cleaner availability in companies they have access to"
ON public.cleaner_availability FOR DELETE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for notifications table
DROP POLICY IF EXISTS "Users can view notifications in their company" ON public.notifications;
CREATE POLICY "Users can view notifications in companies they have access to"
ON public.notifications FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert notifications in their company" ON public.notifications;
CREATE POLICY "Users can insert notifications in companies they have access to"
ON public.notifications FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update notifications in their company" ON public.notifications;
CREATE POLICY "Users can update notifications in companies they have access to"
ON public.notifications FOR UPDATE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for activity_logs table
DROP POLICY IF EXISTS "Users can view activity logs in their company" ON public.activity_logs;
CREATE POLICY "Users can view activity logs in companies they have access to"
ON public.activity_logs FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert activity logs in their company" ON public.activity_logs;
CREATE POLICY "Users can insert activity logs in companies they have access to"
ON public.activity_logs FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

-- Update RLS policies for financial_transactions table
DROP POLICY IF EXISTS "Users can view financial transactions in their company" ON public.financial_transactions;
CREATE POLICY "Users can view financial transactions in companies they have access to"
ON public.financial_transactions FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert financial transactions in their company" ON public.financial_transactions;
CREATE POLICY "Users can insert financial transactions in companies they have access to"
ON public.financial_transactions FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update financial transactions in their company" ON public.financial_transactions;
CREATE POLICY "Users can update financial transactions in companies they have access to"
ON public.financial_transactions FOR UPDATE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for ledger_entries table
DROP POLICY IF EXISTS "Users can view ledger entries in their company" ON public.ledger_entries;
CREATE POLICY "Users can view ledger entries in companies they have access to"
ON public.ledger_entries FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert ledger entries in their company" ON public.ledger_entries;
CREATE POLICY "Users can insert ledger entries in companies they have access to"
ON public.ledger_entries FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

-- Update RLS policies for financial_periods table
DROP POLICY IF EXISTS "Users can view financial periods in their company" ON public.financial_periods;
CREATE POLICY "Users can view financial periods in companies they have access to"
ON public.financial_periods FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert financial periods in their company" ON public.financial_periods;
CREATE POLICY "Users can insert financial periods in companies they have access to"
ON public.financial_periods FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update financial periods in their company" ON public.financial_periods;
CREATE POLICY "Users can update financial periods in companies they have access to"
ON public.financial_periods FOR UPDATE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for payroll_periods table
DROP POLICY IF EXISTS "Users can view payroll periods in their company" ON public.payroll_periods;
CREATE POLICY "Users can view payroll periods in companies they have access to"
ON public.payroll_periods FOR SELECT
USING (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can insert payroll periods in their company" ON public.payroll_periods;
CREATE POLICY "Users can insert payroll periods in companies they have access to"
ON public.payroll_periods FOR INSERT
WITH CHECK (public.user_has_access_to_company(company_id));

DROP POLICY IF EXISTS "Users can update payroll periods in their company" ON public.payroll_periods;
CREATE POLICY "Users can update payroll periods in companies they have access to"
ON public.payroll_periods FOR UPDATE
USING (public.user_has_access_to_company(company_id));

-- Update RLS policies for invoice_items table
DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_items;
CREATE POLICY "Users can view invoice items in companies they have access to"
ON public.invoice_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.user_has_access_to_company(i.company_id)
  )
);

DROP POLICY IF EXISTS "Users can insert invoice items" ON public.invoice_items;
CREATE POLICY "Users can insert invoice items in companies they have access to"
ON public.invoice_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.user_has_access_to_company(i.company_id)
  )
);

DROP POLICY IF EXISTS "Users can update invoice items" ON public.invoice_items;
CREATE POLICY "Users can update invoice items in companies they have access to"
ON public.invoice_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.user_has_access_to_company(i.company_id)
  )
);

DROP POLICY IF EXISTS "Users can delete invoice items" ON public.invoice_items;
CREATE POLICY "Users can delete invoice items in companies they have access to"
ON public.invoice_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i 
    WHERE i.id = invoice_id 
    AND public.user_has_access_to_company(i.company_id)
  )
);