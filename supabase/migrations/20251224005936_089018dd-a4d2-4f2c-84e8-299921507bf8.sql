-- Add RLS policy allowing cleaners to create receipts for their own completed jobs
CREATE POLICY "Cleaners can create receipts for their jobs"
ON public.payment_receipts
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id() 
  AND cleaner_id = auth.uid()
);