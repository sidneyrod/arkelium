-- Fix financial_ledger view: Remove cash_collection as independent revenue event
-- Cash revenue is already captured via payment_receipts (no duplication)
-- Cash handling details will be shown as metadata/tooltip on Receipt lines

DROP VIEW IF EXISTS financial_ledger;

CREATE OR REPLACE VIEW financial_ledger AS
-- Paid Invoices (for non-cash payments that went through invoice flow)
SELECT 
    i.id,
    i.company_id,
    i.client_id,
    c.name AS client_name,
    i.cleaner_id,
    COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
    i.job_id,
    'invoice'::text AS event_type,
    COALESCE(i.service_date, i.created_at::date) AS transaction_date,
    i.invoice_number AS service_reference,
    i.total AS gross_amount,
    COALESCE(i.tax_amount, 0) AS deductions,
    i.subtotal AS net_amount,
    i.payment_method,
    -- Use INV-prefixed reference for invoices
    i.invoice_number AS reference_number,
    i.status,
    i.notes,
    i.created_at
FROM invoices i
LEFT JOIN clients c ON c.id = i.client_id
LEFT JOIN profiles p ON p.id = i.cleaner_id
WHERE i.status = 'paid'
  AND (i.job_id IS NULL OR EXISTS (
    SELECT 1 FROM jobs j WHERE j.id = i.job_id AND j.is_billable = true
  ))

UNION ALL

-- Confirmed Receipts (primary revenue source for all payment methods including cash)
SELECT 
    r.id,
    r.company_id,
    r.client_id,
    c.name AS client_name,
    r.cleaner_id,
    COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
    r.job_id,
    'payment'::text AS event_type,
    r.service_date AS transaction_date,
    r.receipt_number AS service_reference,
    r.total AS gross_amount,
    COALESCE(r.tax_amount, 0) AS deductions,
    r.amount AS net_amount,
    r.payment_method,
    -- Use receipt_number as human-readable reference
    r.receipt_number AS reference_number,
    'confirmed'::text AS status,
    r.notes,
    r.created_at
FROM payment_receipts r
LEFT JOIN clients c ON c.id = r.client_id
LEFT JOIN profiles p ON p.id = r.cleaner_id
WHERE r.sent_at IS NOT NULL

UNION ALL

-- Financial Adjustments (refunds, adjustments, etc.)
SELECT 
    fa.id,
    fa.company_id,
    fa.client_id,
    c.name AS client_name,
    fa.cleaner_id,
    COALESCE(p.first_name || ' ' || p.last_name, '') AS cleaner_name,
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

-- Add comment explaining the view structure
COMMENT ON VIEW financial_ledger IS 'Consolidated financial ledger showing only finalized transactions: Paid Invoices, Confirmed Receipts (sent_at NOT NULL), and Approved Adjustments. Cash Collections are NOT included as separate revenue events to prevent duplication - cash revenue is captured via payment_receipts.';