-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    module text NOT NULL,
    action text NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, module, action)
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(company_id, role, permission_id)
);

-- Create custom_roles table for company-defined roles
CREATE TABLE IF NOT EXISTS public.custom_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    UNIQUE(company_id, name)
);

-- Add last_login_at to profiles if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'last_login_at') THEN
        ALTER TABLE public.profiles ADD COLUMN last_login_at timestamptz;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- RLS policies for permissions
CREATE POLICY "permissions_select_policy" ON public.permissions
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "permissions_insert_policy" ON public.permissions
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
    );

CREATE POLICY "permissions_update_policy" ON public.permissions
    FOR UPDATE USING (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
    );

CREATE POLICY "permissions_delete_policy" ON public.permissions
    FOR DELETE USING (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
        AND is_system = false
    );

-- RLS policies for role_permissions
CREATE POLICY "role_permissions_select_policy" ON public.role_permissions
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "role_permissions_insert_policy" ON public.role_permissions
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
    );

CREATE POLICY "role_permissions_update_policy" ON public.role_permissions
    FOR UPDATE USING (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
    );

CREATE POLICY "role_permissions_delete_policy" ON public.role_permissions
    FOR DELETE USING (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
    );

-- RLS policies for custom_roles
CREATE POLICY "custom_roles_select_policy" ON public.custom_roles
    FOR SELECT USING (company_id = public.get_user_company_id());

CREATE POLICY "custom_roles_insert_policy" ON public.custom_roles
    FOR INSERT WITH CHECK (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
    );

CREATE POLICY "custom_roles_update_policy" ON public.custom_roles
    FOR UPDATE USING (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
        AND is_system = false
    );

CREATE POLICY "custom_roles_delete_policy" ON public.custom_roles
    FOR DELETE USING (
        company_id = public.get_user_company_id() 
        AND public.has_role('admin'::public.app_role)
        AND is_system = false
    );

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(p_module text, p_action text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.user_roles ur ON ur.role = rp.role AND ur.company_id = rp.company_id
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = public.get_user_company_id()
      AND ur.status = 'active'
      AND p.module = p_module
      AND p.action = p_action
      AND rp.granted = true
  )
  OR public.has_role('admin'::public.app_role) -- Admin always has all permissions
$$;

-- Function to get all permissions for current user
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS TABLE(module text, action text, granted boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- If admin, return all permissions as granted
  SELECT DISTINCT p.module, p.action, true as granted
  FROM public.permissions p
  WHERE p.company_id = public.get_user_company_id()
    AND public.has_role('admin'::public.app_role)
  
  UNION
  
  -- For non-admins, return actual permissions
  SELECT p.module, p.action, rp.granted
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN public.user_roles ur ON ur.role = rp.role AND ur.company_id = rp.company_id
  WHERE ur.user_id = auth.uid()
    AND ur.company_id = public.get_user_company_id()
    AND ur.status = 'active'
    AND NOT public.has_role('admin'::public.app_role)
$$;

-- Function to initialize default permissions for a company
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
    'payments_collections', 'ledger', 'invoices', 'receipts',
    'activity_log', 'notifications', 'company_settings', 
    'access_roles', 'reports', 'clients', 'contracts', 'payroll'
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
        IF v_action = 'view' OR (v_module NOT IN ('access_roles', 'company_settings') AND v_action IN ('create', 'edit')) THEN
          INSERT INTO public.role_permissions (company_id, role, permission_id, granted)
          VALUES (p_company_id, 'manager', v_permission_id, true)
          ON CONFLICT (company_id, role, permission_id) DO NOTHING;
        END IF;
        
        -- Grant limited permissions to cleaner
        IF v_module IN ('dashboard', 'schedule', 'notifications') AND v_action = 'view' THEN
          INSERT INTO public.role_permissions (company_id, role, permission_id, granted)
          VALUES (p_company_id, 'cleaner', v_permission_id, true)
          ON CONFLICT (company_id, role, permission_id) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Audit trigger for role_permissions changes
CREATE OR REPLACE FUNCTION public.audit_role_permission_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      after_data, source, performed_by_user_id
    )
    VALUES (
      NEW.company_id, auth.uid(), 'permission_granted', 
      'role_permission', NEW.id, 
      to_jsonb(NEW), 'ui', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      before_data, after_data, source, performed_by_user_id
    )
    VALUES (
      NEW.company_id, auth.uid(), 'permission_changed', 
      'role_permission', NEW.id, 
      to_jsonb(OLD), to_jsonb(NEW), 'ui', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      before_data, source, performed_by_user_id
    )
    VALUES (
      OLD.company_id, auth.uid(), 'permission_revoked', 
      'role_permission', OLD.id, 
      to_jsonb(OLD), 'ui', auth.uid()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for role_permissions audit
DROP TRIGGER IF EXISTS audit_role_permissions_trigger ON public.role_permissions;
CREATE TRIGGER audit_role_permissions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_permission_change();

-- Audit trigger for custom_roles changes
CREATE OR REPLACE FUNCTION public.audit_custom_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'role_created';
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      after_data, source, performed_by_user_id
    )
    VALUES (
      NEW.company_id, auth.uid(), v_action, 
      'custom_role', NEW.id, 
      to_jsonb(NEW), 'ui', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'role_updated';
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      before_data, after_data, source, performed_by_user_id
    )
    VALUES (
      NEW.company_id, auth.uid(), v_action, 
      'custom_role', NEW.id, 
      to_jsonb(OLD), to_jsonb(NEW), 'ui', auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for custom_roles audit
DROP TRIGGER IF EXISTS audit_custom_roles_trigger ON public.custom_roles;
CREATE TRIGGER audit_custom_roles_trigger
  AFTER INSERT OR UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_custom_role_change();

-- Update timestamp triggers
CREATE TRIGGER update_permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_roles_updated_at
  BEFORE UPDATE ON public.custom_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();