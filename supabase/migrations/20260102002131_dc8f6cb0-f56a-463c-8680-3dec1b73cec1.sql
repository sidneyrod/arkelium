-- Update the RPC function to exclude visits from pending invoices
CREATE OR REPLACE FUNCTION public.get_completed_services_pending_invoices(p_company_id uuid)
RETURNS TABLE(
  job_id uuid,
  client_id uuid,
  client_name text,
  service_date date,
  job_type text,
  duration_minutes integer,
  cleaner_id uuid,
  cleaner_name text,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has admin or manager role
  IF NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND company_id = p_company_id 
    AND role IN ('admin', 'manager')
  ) THEN
    RAISE EXCEPTION 'Access denied: admin or manager role required';
  END IF;

  RETURN QUERY
  SELECT 
    j.id as job_id,
    j.client_id,
    c.name as client_name,
    j.scheduled_date as service_date,
    j.job_type,
    j.duration_minutes,
    j.cleaner_id,
    CONCAT(p.first_name, ' ', p.last_name) as cleaner_name,
    j.completed_at
  FROM jobs j
  LEFT JOIN clients c ON j.client_id = c.id
  LEFT JOIN profiles p ON j.cleaner_id = p.id
  WHERE j.company_id = p_company_id
    AND j.status = 'completed'
    AND j.is_billable = true
    AND (j.job_type IS NULL OR j.job_type != 'visit')
    AND NOT EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.job_id = j.id 
      AND i.company_id = p_company_id
    )
  ORDER BY j.completed_at DESC;
END;
$$;