-- =====================================================
-- FIX: Recreate financial_ledger view with all required fields
-- Including client_name, cleaner_name, and legacy column names
-- =====================================================

DROP VIEW IF EXISTS public.financial_ledger;

CREATE VIEW public.financial_ledger AS

-- INVOICES: Only PAID and NOT voided/cancelled
SELECT 
  i.id,
  i.company_id,
  i.client_id,
  i.cleaner_id,
  i.job_id,
  -- Source info
  'invoice'::text AS source_type,
  'invoice'::text AS event_type, -- Legacy alias for Financial.tsx
  'received'::text AS transaction_type,
  i.invoice_number AS reference_number,
  -- Amounts
  i.total AS amount_gross,
  i.total AS gross_amount, -- Legacy alias
  COALESCE(i.tax_amount, 0) AS amount_tax,
  COALESCE(i.tax_amount, 0) AS deductions, -- Legacy alias (tax as deduction)
  i.subtotal AS amount_net,
  i.subtotal AS net_amount, -- Legacy alias
  i.payment_method,
  -- Dates
  i.service_date AS accounting_date,
  i.paid_at AS transaction_date,
  -- Status
  i.status,
  i.created_at,
  i.updated_at,
  -- Joined names
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  -- Additional fields
  NULL::text AS service_reference,
  i.notes
FROM public.invoices i
LEFT JOIN public.clients c ON c.id = i.client_id
LEFT JOIN public.profiles p ON p.id = i.cleaner_id
WHERE i.status = 'paid'
  AND COALESCE(i.is_voided, false) = false
  AND i.voided_at IS NULL
  AND i.cancelled_at IS NULL

UNION ALL

-- PAYMENT RECEIPTS: Only SENT and NOT voided
SELECT 
  pr.id,
  pr.company_id,
  pr.client_id,
  pr.cleaner_id,
  pr.job_id,
  -- Source info
  'payment_receipt'::text AS source_type,
  'payment'::text AS event_type, -- Legacy alias
  'received'::text AS transaction_type,
  pr.receipt_number AS reference_number,
  -- Amounts
  pr.total AS amount_gross,
  pr.total AS gross_amount,
  COALESCE(pr.tax_amount, 0) AS amount_tax,
  COALESCE(pr.tax_amount, 0) AS deductions,
  pr.amount AS amount_net,
  pr.amount AS net_amount,
  pr.payment_method,
  -- Dates
  pr.service_date AS accounting_date,
  COALESCE(pr.sent_at, pr.created_at) AS transaction_date,
  -- Status
  'paid'::text AS status,
  pr.created_at,
  pr.updated_at,
  -- Joined names
  c.name AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  -- Additional fields
  pr.service_description AS service_reference,
  pr.notes
FROM public.payment_receipts pr
LEFT JOIN public.clients c ON c.id = pr.client_id
LEFT JOIN public.profiles p ON p.id = pr.cleaner_id
WHERE pr.sent_at IS NOT NULL
  AND COALESCE(pr.is_voided, false) = false
  AND pr.voided_at IS NULL

UNION ALL

-- CLEANER PAYMENTS: Only APPROVED/SETTLED
SELECT 
  cp.id,
  cp.company_id,
  NULL::uuid AS client_id,
  cp.cleaner_id,
  cp.job_id,
  -- Source info
  'cleaner_payment'::text AS source_type,
  'payroll'::text AS event_type, -- Legacy alias
  'paid_out'::text AS transaction_type,
  'CP-' || SUBSTRING(cp.id::text, 1, 8) AS reference_number,
  -- Amounts
  cp.amount_due AS amount_gross,
  cp.amount_due AS gross_amount,
  0::numeric AS amount_tax,
  0::numeric AS deductions,
  cp.amount_due AS amount_net,
  cp.amount_due AS net_amount,
  COALESCE(cp.payment_model, 'unknown') AS payment_method,
  -- Dates
  cp.service_date AS accounting_date,
  COALESCE(cp.paid_at, cp.created_at) AS transaction_date,
  -- Status
  cp.status,
  cp.created_at,
  cp.updated_at,
  -- Joined names
  NULL::text AS client_name,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
  -- Additional fields
  NULL::text AS service_reference,
  cp.notes
FROM public.cleaner_payments cp
LEFT JOIN public.profiles p ON p.id = cp.cleaner_id
WHERE cp.status IN ('approved', 'settled');

-- Grant access to the view
GRANT SELECT ON public.financial_ledger TO authenticated;
GRANT SELECT ON public.financial_ledger TO anon;