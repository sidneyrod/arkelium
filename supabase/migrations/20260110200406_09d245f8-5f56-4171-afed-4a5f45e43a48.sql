-- =====================================================
-- PHASE 1: Recreate financial_ledger view with ONLY APPROVED/FINALIZED transactions
-- This view is the ACCOUNTING SOURCE OF TRUTH
-- =====================================================

DROP VIEW IF EXISTS public.financial_ledger;

CREATE VIEW public.financial_ledger 
WITH (security_invoker = true)
AS
-- INVOICES: Only PAID invoices appear in accounting ledger
SELECT 
  i.id,
  i.company_id,
  i.client_id,
  c.name as client_name,
  i.cleaner_id,
  COALESCE(p.first_name || ' ' || p.last_name, '') as cleaner_name,
  i.job_id,
  'invoice'::text as event_type,
  COALESCE(i.service_date, i.created_at::date) as transaction_date,
  i.invoice_number as service_reference,
  i.total as gross_amount,
  COALESCE(i.tax_amount, 0) as deductions,
  i.subtotal as net_amount,
  i.payment_method,
  i.payment_reference as reference_number,
  i.status,
  i.notes,
  i.created_at
FROM public.invoices i
LEFT JOIN public.clients c ON c.id = i.client_id
LEFT JOIN public.profiles p ON p.id = i.cleaner_id
WHERE i.status = 'paid'  -- CRITICAL: Only paid invoices
  AND (i.job_id IS NULL OR EXISTS (
    SELECT 1 FROM public.jobs j WHERE j.id = i.job_id AND j.is_billable = true
  ))

UNION ALL

-- PAYMENT RECEIPTS: Only SENT/CONFIRMED receipts appear in accounting ledger
SELECT 
  r.id,
  r.company_id,
  r.client_id,
  c.name as client_name,
  r.cleaner_id,
  COALESCE(p.first_name || ' ' || p.last_name, '') as cleaner_name,
  r.job_id,
  'payment'::text as event_type,
  r.service_date as transaction_date,
  r.receipt_number as service_reference,
  r.total as gross_amount,
  COALESCE(r.tax_amount, 0) as deductions,
  r.amount as net_amount,
  r.payment_method,
  NULL as reference_number,
  'confirmed'::text as status,  -- Always confirmed since it passed the filter
  r.notes,
  r.created_at
FROM public.payment_receipts r
LEFT JOIN public.clients c ON c.id = r.client_id
LEFT JOIN public.profiles p ON p.id = r.cleaner_id
WHERE r.sent_at IS NOT NULL  -- CRITICAL: Only confirmed receipts

UNION ALL

-- CASH COLLECTIONS: Only APPROVED or SETTLED cash collections appear in accounting ledger
SELECT 
  cc.id,
  cc.company_id,
  cc.client_id,
  cl.name as client_name,
  cc.cleaner_id,
  COALESCE(p.first_name || ' ' || p.last_name, '') as cleaner_name,
  cc.job_id,
  'cash_collection'::text as event_type,
  cc.service_date as transaction_date,
  cc.id::text as service_reference,  -- Use ID as reference since no receipt number
  cc.amount as gross_amount,
  0 as deductions,
  cc.amount as net_amount,
  cc.cash_handling as payment_method,  -- 'kept_by_cleaner' or 'delivered_to_office'
  NULL as reference_number,
  cc.compensation_status as status,
  cc.notes,
  cc.created_at
FROM public.cash_collections cc
LEFT JOIN public.clients cl ON cl.id = cc.client_id
LEFT JOIN public.profiles p ON p.id = cc.cleaner_id
WHERE cc.compensation_status IN ('approved', 'settled')  -- CRITICAL: Only approved/settled

UNION ALL

-- FINANCIAL ADJUSTMENTS: Only APPROVED or COMPLETED adjustments
SELECT 
  fa.id,
  fa.company_id,
  fa.client_id,
  c.name as client_name,
  fa.cleaner_id,
  COALESCE(p.first_name || ' ' || p.last_name, '') as cleaner_name,
  fa.job_id,
  fa.event_type::text,
  fa.transaction_date,
  fa.reference_number as service_reference,
  fa.gross_amount,
  fa.deductions,
  fa.net_amount,
  fa.payment_method::text,
  fa.reference_number,
  fa.status,
  fa.notes,
  fa.created_at
FROM public.financial_adjustments fa
LEFT JOIN public.clients c ON c.id = fa.client_id
LEFT JOIN public.profiles p ON p.id = fa.cleaner_id
WHERE fa.status IN ('approved', 'completed');  -- CRITICAL: Only finalized adjustments

-- Grant select on financial_ledger to authenticated users
GRANT SELECT ON public.financial_ledger TO authenticated;

-- Add comment explaining the view purpose
COMMENT ON VIEW public.financial_ledger IS 'Accounting Ledger - Source of Truth. Contains ONLY finalized, approved, immutable financial data for accounting purposes. No drafts, pending, or disputed items.';