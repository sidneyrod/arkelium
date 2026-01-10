-- Fix: Change activity_logs FK to prevent deletion conflicts with audit immutability trigger
-- Drop existing FK with ON DELETE SET NULL
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_company_id_fkey;

-- Recreate with ON DELETE NO ACTION (prevents deletion if logs exist)
ALTER TABLE public.activity_logs
ADD CONSTRAINT activity_logs_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE NO ACTION;

-- Update check_company_can_delete to include activity_logs count
CREATE OR REPLACE FUNCTION public.check_company_can_delete(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clients_count integer;
  v_jobs_count integer;
  v_invoices_count integer;
  v_contracts_count integer;
  v_users_count integer;
  v_activity_logs_count integer;
  v_dependencies jsonb;
  v_can_delete boolean := true;
  v_reason text;
BEGIN
  -- Count clients
  SELECT COUNT(*) INTO v_clients_count FROM clients WHERE company_id = p_company_id;
  
  -- Count jobs
  SELECT COUNT(*) INTO v_jobs_count FROM jobs WHERE company_id = p_company_id;
  
  -- Count invoices
  SELECT COUNT(*) INTO v_invoices_count FROM invoices WHERE company_id = p_company_id;
  
  -- Count contracts
  SELECT COUNT(*) INTO v_contracts_count FROM contracts WHERE company_id = p_company_id;
  
  -- Count users (excluding the current admin who might be deleting)
  SELECT COUNT(*) INTO v_users_count FROM user_roles WHERE company_id = p_company_id AND user_id != auth.uid();
  
  -- Count activity logs (audit compliance - cannot delete companies with audit trail)
  SELECT COUNT(*) INTO v_activity_logs_count FROM activity_logs WHERE company_id = p_company_id;

  -- Build dependencies object
  v_dependencies := jsonb_build_object(
    'clients', v_clients_count,
    'jobs', v_jobs_count,
    'invoices', v_invoices_count,
    'contracts', v_contracts_count,
    'users', v_users_count,
    'activity_logs', v_activity_logs_count
  );

  -- Check if any dependencies exist
  IF v_clients_count > 0 OR v_jobs_count > 0 OR v_invoices_count > 0 OR 
     v_contracts_count > 0 OR v_users_count > 0 OR v_activity_logs_count > 0 THEN
    v_can_delete := false;
    v_reason := 'Company has associated data that must be removed first';
  END IF;

  RETURN jsonb_build_object(
    'can_delete', v_can_delete,
    'reason', v_reason,
    'dependencies', v_dependencies
  );
END;
$$;