-- =====================================================
-- CRITICAL FIX #2 & #3: Single source of truth for pending invoices + idempotency
-- =====================================================

-- Add unique constraint to prevent duplicate invoices for the same job
-- This enforces idempotency at the database level
ALTER TABLE public.invoices
ADD CONSTRAINT invoices_company_job_unique UNIQUE (company_id, job_id);

-- Create a SECURITY DEFINER function to get completed services pending invoices
-- This runs with elevated privileges but checks role internally
CREATE OR REPLACE FUNCTION public.get_completed_services_pending_invoices()
RETURNS TABLE (
  id uuid,
  client_id uuid,
  client_name text,
  address text,
  scheduled_date date,
  duration_minutes integer,
  cleaner_id uuid,
  cleaner_first_name text,
  cleaner_last_name text,
  job_type text,
  completed_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First verify the caller is admin or manager
  SELECT 
    j.id,
    j.client_id,
    c.name as client_name,
    COALESCE(cl.address, '') || CASE WHEN cl.city IS NOT NULL THEN ', ' || cl.city ELSE '' END as address,
    j.scheduled_date,
    j.duration_minutes,
    j.cleaner_id,
    p.first_name as cleaner_first_name,
    p.last_name as cleaner_last_name,
    j.job_type,
    j.completed_at
  FROM public.jobs j
  LEFT JOIN public.clients c ON c.id = j.client_id
  LEFT JOIN public.client_locations cl ON cl.id = j.location_id
  LEFT JOIN public.profiles p ON p.id = j.cleaner_id
  WHERE j.company_id = public.get_user_company_id()
    AND j.status = 'completed'
    AND public.is_admin_or_manager() = true
    -- Key: Only return jobs that DON'T have an invoice
    AND NOT EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.job_id = j.id 
        AND i.company_id = j.company_id
    )
  ORDER BY j.completed_at DESC;
$$;

-- Grant execute permission to authenticated users (RLS is handled inside the function)
GRANT EXECUTE ON FUNCTION public.get_completed_services_pending_invoices() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_completed_services_pending_invoices() IS 
'Returns completed jobs that do not have an associated invoice. 
Single source of truth - uses NOT EXISTS to check the invoices table directly.
Only accessible by admin or manager roles.';