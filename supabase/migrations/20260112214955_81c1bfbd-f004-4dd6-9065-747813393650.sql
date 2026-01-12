
-- Drop and recreate the financial_ledger view with fixes:
-- 1. Invoice payment_method now fetches from payment_receipts if NULL
-- 2. Receipt status changed from 'confirmed' to 'paid'
-- 3. Fixed all column references based on actual table schemas

DROP VIEW IF EXISTS public.financial_ledger;

CREATE VIEW public.financial_ledger AS

-- Invoices (excluding cancelled)
SELECT 
  i.id,
  i.company_id,
  'invoice'::text AS event_type,
  i.invoice_number AS reference_number,
  i.total AS amount,
  'CAD'::text AS currency,
  COALESCE(i.payment_method, (
    SELECT pr.payment_method 
    FROM public.payment_receipts pr 
    WHERE pr.job_id = i.job_id 
    LIMIT 1
  )) AS payment_method,
  i.service_date AS event_date,
  i.status,
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  j.job_type,
  i.notes,
  i.created_at
FROM public.invoices i
LEFT JOIN public.clients c ON c.id = i.client_id
LEFT JOIN public.jobs j ON j.id = i.job_id
LEFT JOIN public.profiles p ON p.id = COALESCE(i.cleaner_id, j.cleaner_id)
WHERE i.status != 'cancelled'

UNION ALL

-- Payment Receipts
SELECT 
  pr.id,
  pr.company_id,
  'receipt'::text AS event_type,
  pr.receipt_number AS reference_number,
  pr.total AS amount,
  'CAD'::text AS currency,
  pr.payment_method,
  pr.service_date AS event_date,
  'paid'::text AS status,
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  j.job_type,
  pr.notes,
  pr.created_at
FROM public.payment_receipts pr
LEFT JOIN public.clients c ON c.id = pr.client_id
LEFT JOIN public.jobs j ON j.id = pr.job_id
LEFT JOIN public.profiles p ON p.id = COALESCE(pr.cleaner_id, j.cleaner_id)

UNION ALL

-- Cleaner Payments
SELECT 
  cp.id,
  cp.company_id,
  'cleaner_payment'::text AS event_type,
  'CP-' || LPAD(ROW_NUMBER() OVER (ORDER BY cp.created_at)::text, 4, '0') AS reference_number,
  cp.amount_due AS amount,
  'CAD'::text AS currency,
  cp.payment_model AS payment_method,
  cp.service_date AS event_date,
  cp.status,
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  j.job_type,
  cp.notes,
  cp.created_at
FROM public.cleaner_payments cp
LEFT JOIN public.jobs j ON j.id = cp.job_id
LEFT JOIN public.clients c ON c.id = j.client_id
LEFT JOIN public.profiles p ON p.id = cp.cleaner_id;
