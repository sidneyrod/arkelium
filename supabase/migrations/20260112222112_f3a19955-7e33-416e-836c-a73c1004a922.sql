-- Fix historical invoices with missing payment_method
UPDATE public.invoices 
SET payment_method = 'e_transfer' 
WHERE status = 'paid' AND payment_method IS NULL;

-- Recreate view with additional fallback to prevent future NULL values
DROP VIEW IF EXISTS public.financial_ledger;

CREATE VIEW public.financial_ledger WITH (security_invoker = true) AS

-- Invoices (excluding cancelled)
SELECT 
  i.id,
  i.company_id,
  i.client_id,
  COALESCE(i.cleaner_id, j.cleaner_id) AS cleaner_id,
  i.job_id,
  i.service_date AS transaction_date,
  'invoice'::text AS event_type,
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  j.job_type AS service_reference,
  i.invoice_number AS reference_number,
  COALESCE(i.payment_method, (
    SELECT pr.payment_method 
    FROM public.payment_receipts pr 
    WHERE pr.job_id = i.job_id 
      AND pr.sent_at IS NOT NULL
    LIMIT 1
  ), 'unknown') AS payment_method,
  COALESCE(i.total, 0) AS gross_amount,
  0::numeric AS deductions,
  COALESCE(i.total, 0) AS net_amount,
  i.status,
  i.created_at,
  i.notes
FROM public.invoices i
LEFT JOIN public.clients c ON c.id = i.client_id
LEFT JOIN public.jobs j ON j.id = i.job_id
LEFT JOIN public.profiles p ON p.id = COALESCE(i.cleaner_id, j.cleaner_id)
WHERE i.status != 'cancelled'

UNION ALL

-- Payment Receipts (finalized only - sent_at IS NOT NULL)
SELECT 
  pr.id,
  pr.company_id,
  pr.client_id,
  COALESCE(pr.cleaner_id, j.cleaner_id) AS cleaner_id,
  pr.job_id,
  pr.service_date AS transaction_date,
  'payment'::text AS event_type,
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  j.job_type AS service_reference,
  pr.receipt_number AS reference_number,
  COALESCE(pr.payment_method, 'unknown') AS payment_method,
  COALESCE(pr.total, 0) AS gross_amount,
  0::numeric AS deductions,
  COALESCE(pr.total, 0) AS net_amount,
  'paid'::text AS status,
  pr.created_at,
  pr.notes
FROM public.payment_receipts pr
LEFT JOIN public.clients c ON c.id = pr.client_id
LEFT JOIN public.jobs j ON j.id = pr.job_id
LEFT JOIN public.profiles p ON p.id = COALESCE(pr.cleaner_id, j.cleaner_id)
WHERE pr.sent_at IS NOT NULL

UNION ALL

-- Cleaner Payments (payroll entries)
SELECT 
  cp.id,
  cp.company_id,
  j.client_id,
  cp.cleaner_id,
  cp.job_id,
  cp.service_date AS transaction_date,
  'payroll'::text AS event_type,
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  j.job_type AS service_reference,
  'CP-' || LPAD(cp.id::text, 6, '0') AS reference_number,
  COALESCE(cp.payment_model, 'unknown') AS payment_method,
  COALESCE(cp.amount_due, 0) AS gross_amount,
  0::numeric AS deductions,
  COALESCE(cp.amount_due, 0) AS net_amount,
  cp.status,
  cp.created_at,
  cp.notes
FROM public.cleaner_payments cp
LEFT JOIN public.jobs j ON j.id = cp.job_id
LEFT JOIN public.clients c ON c.id = j.client_id
LEFT JOIN public.profiles p ON p.id = cp.cleaner_id;

-- Grant access to authenticated users
GRANT SELECT ON public.financial_ledger TO authenticated;

COMMENT ON VIEW public.financial_ledger IS 'Accounting Ledger: Single source of truth for finalized financial transactions. Includes fallback for payment_method to prevent NULL values.';