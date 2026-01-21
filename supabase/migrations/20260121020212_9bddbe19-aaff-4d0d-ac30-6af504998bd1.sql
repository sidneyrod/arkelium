-- Create base_roles table for configurable access levels per company
CREATE TABLE public.base_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  display_name text,
  description text,
  permission_level integer NOT NULL DEFAULT 1 CHECK (permission_level BETWEEN 1 AND 3),
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  color text DEFAULT '#6b7280',
  icon text DEFAULT 'shield',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Enable RLS
ALTER TABLE public.base_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for base_roles
CREATE POLICY "Users can view base roles in their company"
ON public.base_roles FOR SELECT
USING (public.user_has_access_to_company(company_id));

CREATE POLICY "Admins can manage base roles in their company"
ON public.base_roles FOR ALL
USING (public.has_role_in_company(company_id, 'admin'))
WITH CHECK (public.has_role_in_company(company_id, 'admin'));

-- Add base_role_id to custom_roles (keeping base_role for backward compatibility during migration)
ALTER TABLE public.custom_roles 
ADD COLUMN base_role_id uuid REFERENCES public.base_roles(id);

-- Function to initialize default base roles for a company
CREATE OR REPLACE FUNCTION public.initialize_company_base_roles(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert default base roles if they don't exist
  INSERT INTO public.base_roles (company_id, code, name, display_name, description, permission_level, is_system, sort_order, color, icon)
  VALUES 
    (p_company_id, 'full_access', 'Admin', 'Administrator', 'Full system access with all permissions', 3, true, 1, '#dc2626', 'shield'),
    (p_company_id, 'operational', 'Manager', 'Manager', 'Operational access for day-to-day management', 2, true, 2, '#2563eb', 'briefcase'),
    (p_company_id, 'field_worker', 'Cleaner', 'Field Worker', 'Basic access for field operations', 1, true, 3, '#16a34a', 'user')
  ON CONFLICT (company_id, code) DO NOTHING;
END;
$$;

-- Initialize base roles for all existing companies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.companies LOOP
    PERFORM public.initialize_company_base_roles(r.id);
  END LOOP;
END;
$$;

-- Migrate existing custom_roles to use base_role_id
UPDATE public.custom_roles cr
SET base_role_id = br.id
FROM public.base_roles br
WHERE cr.company_id = br.company_id
  AND br.code = CASE 
    WHEN cr.base_role = 'admin' THEN 'full_access'
    WHEN cr.base_role = 'manager' THEN 'operational'
    ELSE 'field_worker'
  END
  AND cr.base_role_id IS NULL;

-- Create updated_at trigger for base_roles
CREATE TRIGGER update_base_roles_updated_at
  BEFORE UPDATE ON public.base_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for base_roles changes
CREATE OR REPLACE FUNCTION public.audit_base_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      after_data, source, performed_by_user_id
    )
    VALUES (
      NEW.company_id, auth.uid(), 'base_role_created', 
      'base_role', NEW.id, 
      to_jsonb(NEW), 'ui', auth.uid()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (
      company_id, user_id, action, entity_type, entity_id, 
      before_data, after_data, source, performed_by_user_id
    )
    VALUES (
      NEW.company_id, auth.uid(), 'base_role_updated', 
      'base_role', NEW.id, 
      to_jsonb(OLD), to_jsonb(NEW), 'ui', auth.uid()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_base_role_changes
  AFTER INSERT OR UPDATE ON public.base_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_base_role_change();