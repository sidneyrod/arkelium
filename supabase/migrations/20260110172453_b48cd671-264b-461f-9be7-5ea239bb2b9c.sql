-- Security lint fix: Replace overly permissive RLS policy WITH CHECK (true)
-- This addresses the security warning about using true for INSERT
DROP POLICY IF EXISTS "Authenticated users can create a company" ON public.companies;
CREATE POLICY "Authenticated users can create a company" ON public.companies
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Restore check_company_can_delete without activity_logs as dependency
-- Activity logs no longer have FK to companies, so they won't block deletion
CREATE OR REPLACE FUNCTION public.check_company_can_delete(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clients_count int;
  v_jobs_count int;
  v_invoices_count int;
  v_contracts_count int;
  v_users_count int;
  v_payroll_count int;
  v_financial_count int;
  v_reason text;
BEGIN
  -- Count dependencies (activity_logs not included - no longer has FK)
  SELECT COUNT(*) INTO v_clients_count FROM public.clients WHERE company_id = p_company_id;
  SELECT COUNT(*) INTO v_jobs_count FROM public.jobs WHERE company_id = p_company_id;
  SELECT COUNT(*) INTO v_invoices_count FROM public.invoices WHERE company_id = p_company_id;
  SELECT COUNT(*) INTO v_contracts_count FROM public.contracts WHERE company_id = p_company_id;

  -- Count users (excluding the current admin who might be deleting)
  SELECT COUNT(*) INTO v_users_count
  FROM public.user_roles
  WHERE company_id = p_company_id
    AND user_id != auth.uid();

  SELECT COUNT(*) INTO v_payroll_count FROM public.payroll_periods WHERE company_id = p_company_id;
  SELECT COUNT(*) INTO v_financial_count FROM public.financial_transactions WHERE company_id = p_company_id;

  IF v_clients_count > 0
     OR v_jobs_count > 0
     OR v_invoices_count > 0
     OR v_contracts_count > 0
     OR v_users_count > 0
     OR v_payroll_count > 0
     OR v_financial_count > 0 THEN

    v_reason := format(
      'Company has data: %s clients, %s jobs, %s invoices, %s contracts, %s other users, %s payroll periods, %s transactions',
      v_clients_count, v_jobs_count, v_invoices_count, v_contracts_count,
      v_users_count, v_payroll_count, v_financial_count
    );

    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', v_reason,
      'dependencies', jsonb_build_object(
        'clients', v_clients_count,
        'jobs', v_jobs_count,
        'invoices', v_invoices_count,
        'contracts', v_contracts_count,
        'users', v_users_count,
        'payroll_periods', v_payroll_count,
        'financial_transactions', v_financial_count
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'can_delete', true,
    'reason', null,
    'dependencies', null
  );
END;
$$;