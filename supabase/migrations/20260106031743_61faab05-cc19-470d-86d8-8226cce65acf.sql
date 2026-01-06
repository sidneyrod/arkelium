-- Add approval/dispute tracking fields to cash_collections for enterprise workflow
ALTER TABLE public.cash_collections 
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS disputed_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS disputed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS dispute_reason text;

-- Add index for faster filtering of pending approvals
CREATE INDEX IF NOT EXISTS idx_cash_collections_compensation_status 
ON public.cash_collections(compensation_status);

-- Add index for cash handling type filtering
CREATE INDEX IF NOT EXISTS idx_cash_collections_cash_handling 
ON public.cash_collections(cash_handling);

-- Create audit trigger for cash_collections status changes
CREATE OR REPLACE FUNCTION public.audit_cash_collection_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when compensation_status changes
  IF OLD.compensation_status IS DISTINCT FROM NEW.compensation_status THEN
    INSERT INTO public.activity_logs (
      company_id, 
      user_id, 
      action, 
      entity_type, 
      entity_id, 
      before_data, 
      after_data, 
      source, 
      performed_by_user_id
    )
    VALUES (
      NEW.company_id, 
      auth.uid(), 
      CASE 
        WHEN NEW.compensation_status = 'approved' THEN 'cash_approved'
        WHEN NEW.compensation_status = 'disputed' THEN 'cash_disputed'
        WHEN NEW.compensation_status = 'settled' THEN 'cash_settled'
        ELSE 'cash_status_changed'
      END,
      'cash_collection', 
      NEW.id, 
      jsonb_build_object(
        'compensation_status', OLD.compensation_status,
        'amount', OLD.amount,
        'cash_handling', OLD.cash_handling
      ),
      jsonb_build_object(
        'compensation_status', NEW.compensation_status,
        'amount', NEW.amount,
        'cash_handling', NEW.cash_handling,
        'approved_by', NEW.approved_by,
        'approved_at', NEW.approved_at,
        'disputed_by', NEW.disputed_by,
        'disputed_at', NEW.disputed_at,
        'dispute_reason', NEW.dispute_reason
      ),
      'system', 
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS audit_cash_collection_changes ON public.cash_collections;

CREATE TRIGGER audit_cash_collection_changes
  AFTER UPDATE ON public.cash_collections
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_cash_collection_status();