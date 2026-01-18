-- =====================================================
-- ENTERPRISE CANCEL/VOID GOVERNANCE PACK
-- =====================================================
-- 1. Fix financial_ledger view (exclude voided/cancelled)
-- 2. Add state machine triggers for all financial entities
-- =====================================================

-- =====================================================
-- 1. RECREATE FINANCIAL_LEDGER VIEW WITH EXPLICIT FILTERS
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
  'invoice'::text AS source_type,
  'received'::text AS transaction_type,
  i.invoice_number AS reference_number,
  i.total AS amount_gross,
  COALESCE(i.tax_amount, 0) AS amount_tax,
  i.subtotal AS amount_net,
  i.payment_method,
  i.service_date AS accounting_date,
  i.paid_at AS transaction_date,
  i.status,
  i.created_at,
  i.updated_at
FROM public.invoices i
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
  'payment_receipt'::text AS source_type,
  'received'::text AS transaction_type,
  pr.receipt_number AS reference_number,
  pr.total AS amount_gross,
  COALESCE(pr.tax_amount, 0) AS amount_tax,
  pr.amount AS amount_net,
  pr.payment_method,
  pr.service_date AS accounting_date,
  COALESCE(pr.sent_at, pr.created_at) AS transaction_date,
  'paid'::text AS status,
  pr.created_at,
  pr.updated_at
FROM public.payment_receipts pr
WHERE pr.sent_at IS NOT NULL
  AND COALESCE(pr.is_voided, false) = false
  AND pr.voided_at IS NULL

UNION ALL

-- CLEANER PAYMENTS: Only APPROVED/SETTLED (no void fields on this table)
SELECT 
  cp.id,
  cp.company_id,
  NULL::uuid AS client_id,
  cp.cleaner_id,
  cp.job_id,
  'cleaner_payment'::text AS source_type,
  'paid_out'::text AS transaction_type,
  'CP-' || SUBSTRING(cp.id::text, 1, 8) AS reference_number,
  cp.amount_due AS amount_gross,
  0::numeric AS amount_tax,
  cp.amount_due AS amount_net,
  COALESCE(cp.payment_model, 'unknown') AS payment_method,
  cp.service_date AS accounting_date,
  COALESCE(cp.paid_at, cp.created_at) AS transaction_date,
  cp.status,
  cp.created_at,
  cp.updated_at
FROM public.cleaner_payments cp
WHERE cp.status IN ('approved', 'settled');

-- Grant access to the view
GRANT SELECT ON public.financial_ledger TO authenticated;
GRANT SELECT ON public.financial_ledger TO anon;

-- =====================================================
-- 2. STATE MACHINE TRIGGERS
-- =====================================================

-- 2.1 JOBS: Validate status transitions
CREATE OR REPLACE FUNCTION public.validate_job_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only validate if status is actually changing
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    -- Check soft-delete restoration attempt
    IF COALESCE(OLD.is_deleted, false) = true AND COALESCE(NEW.is_deleted, false) = false THEN
      RAISE EXCEPTION 'Cannot restore a soft-deleted job. Job ID: %', NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  -- Block: completed cannot go back to scheduled/in-progress
  IF OLD.status = 'completed' AND NEW.status IN ('scheduled', 'in-progress') THEN
    RAISE EXCEPTION 'Invalid status transition: completed → % is not allowed. Job ID: %', NEW.status, NEW.id;
  END IF;
  
  -- Block: cancelled cannot transition to any other status
  IF OLD.status = 'cancelled' AND NEW.status != 'cancelled' THEN
    RAISE EXCEPTION 'Invalid status transition: cancelled → % is not allowed. Cancelled jobs cannot be restored. Job ID: %', NEW.status, NEW.id;
  END IF;
  
  -- Block: soft-deleted jobs cannot be restored
  IF COALESCE(OLD.is_deleted, false) = true AND COALESCE(NEW.is_deleted, false) = false THEN
    RAISE EXCEPTION 'Cannot restore a soft-deleted job. Job ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_job_status_transition_trigger ON public.jobs;
CREATE TRIGGER validate_job_status_transition_trigger
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_job_status_transition();

-- 2.2 INVOICES: Validate status transitions
CREATE OR REPLACE FUNCTION public.validate_invoice_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block: voided invoices cannot be restored
  IF COALESCE(OLD.is_voided, false) = true AND COALESCE(NEW.is_voided, false) = false THEN
    RAISE EXCEPTION 'Cannot restore a voided invoice. Invoice ID: %', NEW.id;
  END IF;

  -- Only validate status if it's actually changing
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Block: paid cannot go back to draft/sent
  IF OLD.status = 'paid' AND NEW.status IN ('draft', 'sent') THEN
    RAISE EXCEPTION 'Invalid status transition: paid → % is not allowed. Invoice ID: %', NEW.status, NEW.id;
  END IF;
  
  -- Block: cancelled cannot become paid
  IF OLD.status = 'cancelled' AND NEW.status = 'paid' THEN
    RAISE EXCEPTION 'Invalid status transition: cancelled → paid is not allowed. Invoice ID: %', NEW.id;
  END IF;
  
  -- Block: voided cannot change status
  IF COALESCE(OLD.is_voided, false) = true AND OLD.status != NEW.status THEN
    RAISE EXCEPTION 'Cannot change status of a voided invoice. Invoice ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_invoice_status_transition_trigger ON public.invoices;
CREATE TRIGGER validate_invoice_status_transition_trigger
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice_status_transition();

-- 2.3 PAYMENT RECEIPTS: Validate void transitions
CREATE OR REPLACE FUNCTION public.validate_receipt_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block: voided receipts cannot be restored
  IF COALESCE(OLD.is_voided, false) = true AND COALESCE(NEW.is_voided, false) = false THEN
    RAISE EXCEPTION 'Cannot restore a voided receipt. Receipt ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_receipt_status_transition_trigger ON public.payment_receipts;
CREATE TRIGGER validate_receipt_status_transition_trigger
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_receipt_status_transition();

-- 2.4 CASH COLLECTIONS: Validate status transitions
CREATE OR REPLACE FUNCTION public.validate_cash_collection_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block: voided cash collections cannot be restored
  IF COALESCE(OLD.is_voided, false) = true AND COALESCE(NEW.is_voided, false) = false THEN
    RAISE EXCEPTION 'Cannot restore a voided cash collection. Cash Collection ID: %', NEW.id;
  END IF;
  
  -- Only validate compensation_status if it's actually changing
  IF OLD.compensation_status IS NOT DISTINCT FROM NEW.compensation_status THEN
    RETURN NEW;
  END IF;

  -- Block: settled cannot go back to pending
  IF OLD.compensation_status = 'settled' AND NEW.compensation_status = 'pending' THEN
    RAISE EXCEPTION 'Invalid status transition: settled → pending is not allowed. Cash Collection ID: %', NEW.id;
  END IF;
  
  -- Block: voided cannot change compensation_status
  IF COALESCE(OLD.is_voided, false) = true AND OLD.compensation_status != NEW.compensation_status THEN
    RAISE EXCEPTION 'Cannot change status of a voided cash collection. Cash Collection ID: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_cash_collection_transition_trigger ON public.cash_collections;
CREATE TRIGGER validate_cash_collection_transition_trigger
  BEFORE UPDATE ON public.cash_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_cash_collection_transition();