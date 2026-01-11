-- Update financial_ledger view to show receipt_number for cash collections
-- instead of the UUID, making it easier for accountants to cross-reference

CREATE OR REPLACE VIEW public.financial_ledger AS
-- PAID INVOICES: Only paid invoices for billable jobs
SELECT 
  i.id,
  i.company_id,
  i.client_id,
  c.name AS client_name,
  i.cleaner_id,
  COALESCE((p.first_name || ' '::text) || p.last_name, ''::text) AS cleaner_name,
  i.job_id,
  'invoice'::text AS event_type,
  COALESCE(i.service_date, i.created_at::date) AS transaction_date,
  i.invoice_number AS service_reference,
  i.total AS gross_amount,
  COALESCE(i.tax_amount, 0::numeric) AS deductions,
  i.subtotal AS net_amount,
  i.payment_method,
  i.payment_reference AS reference_number,
  i.status,
  i.notes,
  i.created_at
FROM invoices i
LEFT JOIN clients c ON c.id = i.client_id
LEFT JOIN profiles p ON p.id = i.cleaner_id
WHERE i.status = 'paid'::text 
  AND (i.job_id IS NULL OR EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = i.job_id AND j.is_billable = true
  ))

UNION ALL

-- PAYMENT RECEIPTS: Only sent receipts
SELECT 
  r.id,
  r.company_id,
  r.client_id,
  c.name AS client_name,
  r.cleaner_id,
  COALESCE((p.first_name || ' '::text) || p.last_name, ''::text) AS cleaner_name,
  r.job_id,
  'payment'::text AS event_type,
  r.service_date AS transaction_date,
  r.receipt_number AS service_reference,
  r.total AS gross_amount,
  COALESCE(r.tax_amount, 0::numeric) AS deductions,
  r.amount AS net_amount,
  r.payment_method,
  NULL::text AS reference_number,
  'confirmed'::text AS status,
  r.notes,
  r.created_at
FROM payment_receipts r
LEFT JOIN clients c ON c.id = r.client_id
LEFT JOIN profiles p ON p.id = r.cleaner_id
WHERE r.sent_at IS NOT NULL

UNION ALL

-- CASH COLLECTIONS: Only approved or settled, with receipt number if available
SELECT 
  cc.id,
  cc.company_id,
  cc.client_id,
  cl.name AS client_name,
  cc.cleaner_id,
  COALESCE((p.first_name || ' '::text) || p.last_name, ''::text) AS cleaner_name,
  cc.job_id,
  'cash_collection'::text AS event_type,
  cc.service_date AS transaction_date,
  -- Use receipt number if available, otherwise fallback to CC-prefixed short UUID
  COALESCE(pr.receipt_number, 'CC-' || SUBSTRING(cc.id::text FROM 1 FOR 8)) AS service_reference,
  cc.amount AS gross_amount,
  0 AS deductions,
  cc.amount AS net_amount,
  cc.cash_handling AS payment_method,
  NULL::text AS reference_number,
  cc.compensation_status AS status,
  cc.notes,
  cc.created_at
FROM cash_collections cc
LEFT JOIN clients cl ON cl.id = cc.client_id
LEFT JOIN profiles p ON p.id = cc.cleaner_id
LEFT JOIN payment_receipts pr ON pr.job_id = cc.job_id  -- Join to get receipt number
WHERE cc.compensation_status IN ('approved', 'settled')

UNION ALL

-- FINANCIAL ADJUSTMENTS: Only approved or completed
SELECT 
  fa.id,
  fa.company_id,
  fa.client_id,
  c.name AS client_name,
  fa.cleaner_id,
  COALESCE((p.first_name || ' '::text) || p.last_name, ''::text) AS cleaner_name,
  fa.job_id,
  fa.event_type::text AS event_type,
  fa.transaction_date,
  fa.reference_number AS service_reference,
  fa.gross_amount,
  fa.deductions,
  fa.net_amount,
  fa.payment_method::text AS payment_method,
  fa.reference_number,
  fa.status,
  fa.notes,
  fa.created_at
FROM financial_adjustments fa
LEFT JOIN clients c ON c.id = fa.client_id
LEFT JOIN profiles p ON p.id = fa.cleaner_id
WHERE fa.status IN ('approved', 'completed');