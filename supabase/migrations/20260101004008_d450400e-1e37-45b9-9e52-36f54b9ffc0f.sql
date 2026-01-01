-- Add visit outcome fields to jobs table
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS visit_outcome text,
ADD COLUMN IF NOT EXISTS visit_notes text,
ADD COLUMN IF NOT EXISTS visit_next_action text;

-- Add constraint for valid outcomes using a trigger instead of CHECK (for flexibility)
CREATE OR REPLACE FUNCTION public.validate_visit_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.visit_outcome IS NOT NULL AND NEW.visit_outcome NOT IN ('visited', 'no_show', 'rescheduled', 'follow_up_needed') THEN
    RAISE EXCEPTION 'Invalid visit_outcome value: %. Must be one of: visited, no_show, rescheduled, follow_up_needed', NEW.visit_outcome;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS validate_visit_outcome_trigger ON public.jobs;
CREATE TRIGGER validate_visit_outcome_trigger
BEFORE INSERT OR UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.validate_visit_outcome();