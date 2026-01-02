-- Update the no-parameter version of get_completed_services_pending_invoices to exclude visits
CREATE OR REPLACE FUNCTION public.get_completed_services_pending_invoices()
 RETURNS TABLE(id uuid, client_id uuid, client_name text, address text, scheduled_date date, duration_minutes integer, cleaner_id uuid, cleaner_first_name text, cleaner_last_name text, job_type text, completed_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND j.is_billable = true
    AND (j.job_type IS NULL OR j.job_type != 'visit')
    AND public.is_admin_or_manager() = true
    AND NOT EXISTS (
      SELECT 1 FROM public.invoices i 
      WHERE i.job_id = j.id 
        AND i.company_id = j.company_id
    )
  ORDER BY j.completed_at DESC;
$function$;