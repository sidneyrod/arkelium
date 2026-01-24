-- Fix the audit_job_status_change function to remove ::text cast from entity_id
CREATE OR REPLACE FUNCTION public.audit_job_status_change()
RETURNS TRIGGER AS $$
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
      NEW.id,
      jsonb_build_object('status', OLD.status, 'is_deleted', OLD.is_deleted),
      jsonb_build_object('status', NEW.status, 'is_deleted', NEW.is_deleted),
      v_reason,
      'system',
      COALESCE(NEW.cancelled_by, NEW.deleted_by, auth.uid())
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;