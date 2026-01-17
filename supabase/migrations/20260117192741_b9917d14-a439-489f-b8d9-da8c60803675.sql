-- =====================================================
-- ENTERPRISE DELETE GOVERNANCE MIGRATION
-- Anti-Tamper + Auditor-Friendly System
-- =====================================================

-- =====================================================
-- PHASE 1: Add Soft Delete/Void Fields to Tables
-- =====================================================

-- 1.1 JOBS - Soft Delete + Cancel Fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS delete_reason text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS cancel_reason text;

-- 1.2 INVOICES - Void + Cancel Fields
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id);

-- 1.3 PAYMENT_RECEIPTS - Void Fields
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false;
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS void_reason text;

-- 1.4 CASH_COLLECTIONS - Void Fields
ALTER TABLE public.cash_collections ADD COLUMN IF NOT EXISTS is_voided boolean DEFAULT false;
ALTER TABLE public.cash_collections ADD COLUMN IF NOT EXISTS voided_at timestamptz;
ALTER TABLE public.cash_collections ADD COLUMN IF NOT EXISTS voided_by uuid REFERENCES public.profiles(id);
ALTER TABLE public.cash_collections ADD COLUMN IF NOT EXISTS void_reason text;

-- =====================================================
-- PHASE 2: Block Hard Delete via Triggers
-- =====================================================

-- 2.1 JOBS - Prevent Hard Delete
CREATE OR REPLACE FUNCTION public.prevent_job_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed on jobs. Use cancel/soft-delete instead. Job ID: %', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS prevent_job_delete ON public.jobs;
CREATE TRIGGER prevent_job_delete
  BEFORE DELETE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_job_hard_delete();

-- 2.2 INVOICES - Prevent Hard Delete
CREATE OR REPLACE FUNCTION public.prevent_invoice_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed on invoices. Use void/cancel instead. Invoice ID: %', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS prevent_invoice_delete ON public.invoices;
CREATE TRIGGER prevent_invoice_delete
  BEFORE DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_invoice_hard_delete();

-- 2.3 PAYMENT_RECEIPTS - Prevent Hard Delete
CREATE OR REPLACE FUNCTION public.prevent_receipt_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed on payment_receipts. Use void instead. Receipt ID: %', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS prevent_receipt_delete ON public.payment_receipts;
CREATE TRIGGER prevent_receipt_delete
  BEFORE DELETE ON public.payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_receipt_hard_delete();

-- 2.4 CASH_COLLECTIONS - Prevent Hard Delete
CREATE OR REPLACE FUNCTION public.prevent_cash_collection_hard_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'Hard delete is not allowed on cash_collections. Use void instead. Cash Collection ID: %', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS prevent_cash_collection_delete ON public.cash_collections;
CREATE TRIGGER prevent_cash_collection_delete
  BEFORE DELETE ON public.cash_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_cash_collection_hard_delete();

-- =====================================================
-- PHASE 3: Remove RLS DELETE Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can delete jobs in companies they have access to" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete cash collections in companies they have access" ON public.cash_collections;
DROP POLICY IF EXISTS "Users can delete invoices in companies they have access to" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete payment_receipts in companies they have access" ON public.payment_receipts;

-- =====================================================
-- PHASE 4: Audit Triggers for Sensitive Actions
-- =====================================================

-- 4.1 Audit Job Cancellation/Soft Delete
CREATE OR REPLACE FUNCTION public.audit_job_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_reason text;
BEGIN
  -- Check for cancellation
  IF (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled') THEN
    v_action := 'job_cancelled';
    v_reason := NEW.cancel_reason;
    
    -- Enforce reason requirement
    IF v_reason IS NULL OR trim(v_reason) = '' THEN
      RAISE EXCEPTION 'A cancellation reason is required when cancelling a job';
    END IF;
    
    -- Auto-set cancelled_at if not set
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;
  
  -- Check for soft delete
  IF (COALESCE(OLD.is_deleted, false) = false AND NEW.is_deleted = true) THEN
    v_action := 'job_soft_deleted';
    v_reason := NEW.delete_reason;
    
    -- Enforce reason requirement
    IF v_reason IS NULL OR trim(v_reason) = '' THEN
      RAISE EXCEPTION 'A delete reason is required when soft-deleting a job';
    END IF;
    
    -- Auto-set deleted_at if not set
    IF NEW.deleted_at IS NULL THEN
      NEW.deleted_at := now();
    END IF;
  END IF;
  
  -- Log the audit entry if action occurred
  IF v_action IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      reason,
      source,
      performed_by_user_id
    ) VALUES (
      NEW.company_id,
      COALESCE(NEW.cancelled_by, NEW.deleted_by, auth.uid()),
      v_action,
      'job',
      NEW.id::text,
      jsonb_build_object('status', OLD.status, 'is_deleted', OLD.is_deleted),
      jsonb_build_object('status', NEW.status, 'is_deleted', NEW.is_deleted),
      v_reason,
      'system',
      COALESCE(NEW.cancelled_by, NEW.deleted_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_job_status_change ON public.jobs;
CREATE TRIGGER audit_job_status_change
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_job_status_change();

-- 4.2 Audit Invoice Void/Cancel
CREATE OR REPLACE FUNCTION public.audit_invoice_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_reason text;
BEGIN
  -- Check for voiding
  IF (COALESCE(OLD.is_voided, false) = false AND NEW.is_voided = true) THEN
    v_action := 'invoice_voided';
    v_reason := NEW.void_reason;
    
    IF v_reason IS NULL OR trim(v_reason) = '' THEN
      RAISE EXCEPTION 'A void reason is required when voiding an invoice';
    END IF;
    
    IF NEW.voided_at IS NULL THEN
      NEW.voided_at := now();
    END IF;
  END IF;
  
  -- Check for cancellation
  IF (OLD.status IS DISTINCT FROM 'cancelled' AND NEW.status = 'cancelled') THEN
    v_action := 'invoice_cancelled';
    v_reason := NEW.cancel_reason;
    
    IF v_reason IS NULL OR trim(v_reason) = '' THEN
      RAISE EXCEPTION 'A cancel reason is required when cancelling an invoice';
    END IF;
    
    IF NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;
  
  IF v_action IS NOT NULL THEN
    INSERT INTO public.activity_logs (
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      reason,
      source,
      performed_by_user_id
    ) VALUES (
      NEW.company_id,
      COALESCE(NEW.voided_by, NEW.cancelled_by, auth.uid()),
      v_action,
      'invoice',
      NEW.id::text,
      jsonb_build_object('status', OLD.status, 'is_voided', OLD.is_voided),
      jsonb_build_object('status', NEW.status, 'is_voided', NEW.is_voided),
      v_reason,
      'system',
      COALESCE(NEW.voided_by, NEW.cancelled_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_invoice_status_change ON public.invoices;
CREATE TRIGGER audit_invoice_status_change
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_invoice_status_change();

-- 4.3 Audit Receipt Void
CREATE OR REPLACE FUNCTION public.audit_receipt_void()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (COALESCE(OLD.is_voided, false) = false AND NEW.is_voided = true) THEN
    IF NEW.void_reason IS NULL OR trim(NEW.void_reason) = '' THEN
      RAISE EXCEPTION 'A void reason is required when voiding a receipt';
    END IF;
    
    IF NEW.voided_at IS NULL THEN
      NEW.voided_at := now();
    END IF;
    
    INSERT INTO public.activity_logs (
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      reason,
      source,
      performed_by_user_id
    ) VALUES (
      NEW.company_id,
      COALESCE(NEW.voided_by, auth.uid()),
      'receipt_voided',
      'payment_receipt',
      NEW.id::text,
      jsonb_build_object('is_voided', OLD.is_voided),
      jsonb_build_object('is_voided', NEW.is_voided),
      NEW.void_reason,
      'system',
      COALESCE(NEW.voided_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_receipt_void ON public.payment_receipts;
CREATE TRIGGER audit_receipt_void
  BEFORE UPDATE ON public.payment_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_receipt_void();

-- 4.4 Audit Cash Collection Void
CREATE OR REPLACE FUNCTION public.audit_cash_collection_void()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF (COALESCE(OLD.is_voided, false) = false AND NEW.is_voided = true) THEN
    IF NEW.void_reason IS NULL OR trim(NEW.void_reason) = '' THEN
      RAISE EXCEPTION 'A void reason is required when voiding a cash collection';
    END IF;
    
    IF NEW.voided_at IS NULL THEN
      NEW.voided_at := now();
    END IF;
    
    INSERT INTO public.activity_logs (
      company_id,
      user_id,
      action,
      entity_type,
      entity_id,
      before_data,
      after_data,
      reason,
      source,
      performed_by_user_id
    ) VALUES (
      NEW.company_id,
      COALESCE(NEW.voided_by, auth.uid()),
      'cash_voided',
      'cash_collection',
      NEW.id::text,
      jsonb_build_object('is_voided', OLD.is_voided, 'compensation_status', OLD.compensation_status),
      jsonb_build_object('is_voided', NEW.is_voided, 'compensation_status', NEW.compensation_status),
      NEW.void_reason,
      'system',
      COALESCE(NEW.voided_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_cash_collection_void ON public.cash_collections;
CREATE TRIGGER audit_cash_collection_void
  BEFORE UPDATE ON public.cash_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_cash_collection_void();

-- =====================================================
-- PHASE 5: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_jobs_is_deleted ON public.jobs(is_deleted) WHERE is_deleted = true;
CREATE INDEX IF NOT EXISTS idx_jobs_cancelled ON public.jobs(status) WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_invoices_is_voided ON public.invoices(is_voided) WHERE is_voided = true;
CREATE INDEX IF NOT EXISTS idx_invoices_cancelled ON public.invoices(status) WHERE status = 'cancelled';
CREATE INDEX IF NOT EXISTS idx_receipts_is_voided ON public.payment_receipts(is_voided) WHERE is_voided = true;
CREATE INDEX IF NOT EXISTS idx_cash_collections_is_voided ON public.cash_collections(is_voided) WHERE is_voided = true;