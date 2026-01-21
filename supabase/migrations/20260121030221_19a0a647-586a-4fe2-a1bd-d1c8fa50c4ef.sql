-- Step 1: Replace the initialize_company_permissions function with corrected module list
CREATE OR REPLACE FUNCTION public.initialize_company_permissions(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permission_id uuid;
  v_modules text[] := ARRAY[
    'dashboard', 'schedule', 'jobs', 'completed_services', 
    'off_requests', 'clients', 'contracts', 'estimates',
    'invoices', 'receipts', 'payments_collections', 'ledger',
    'payroll', 'activity_log', 'notifications'
  ];
  v_actions text[] := ARRAY['view', 'create', 'edit', 'delete'];
  v_module text;
  v_action text;
BEGIN
  -- Create all module/action combinations
  FOREACH v_module IN ARRAY v_modules LOOP
    FOREACH v_action IN ARRAY v_actions LOOP
      INSERT INTO public.permissions (company_id, module, action, is_system)
      VALUES (p_company_id, v_module, v_action, true)
      ON CONFLICT (company_id, module, action) DO NOTHING
      RETURNING id INTO v_permission_id;
      
      -- If new permission was created, grant to admin
      IF v_permission_id IS NOT NULL THEN
        INSERT INTO public.role_permissions (company_id, role, permission_id, granted)
        VALUES (p_company_id, 'admin', v_permission_id, true)
        ON CONFLICT (company_id, role, permission_id) DO NOTHING;
        
        -- Grant view permissions to manager for most modules
        IF v_action = 'view' OR v_action IN ('create', 'edit') THEN
          INSERT INTO public.role_permissions (company_id, role, permission_id, granted)
          VALUES (p_company_id, 'manager', v_permission_id, true)
          ON CONFLICT (company_id, role, permission_id) DO NOTHING;
        END IF;
        
        -- Grant limited permissions to cleaner
        IF v_module IN ('dashboard', 'schedule', 'notifications', 'off_requests') AND v_action = 'view' THEN
          INSERT INTO public.role_permissions (company_id, role, permission_id, granted)
          VALUES (p_company_id, 'cleaner', v_permission_id, true)
          ON CONFLICT (company_id, role, permission_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Step 2: Clean up obsolete role_permissions entries
DELETE FROM public.role_permissions 
WHERE permission_id IN (
  SELECT id FROM public.permissions 
  WHERE module IN ('reports', 'access_roles', 'company_settings')
);

-- Step 3: Clean up obsolete permissions
DELETE FROM public.permissions 
WHERE module IN ('reports', 'access_roles', 'company_settings');