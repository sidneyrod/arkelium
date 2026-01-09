-- 1. Add base_role column to custom_roles
ALTER TABLE public.custom_roles 
  ADD COLUMN IF NOT EXISTS base_role public.app_role NOT NULL DEFAULT 'cleaner';

-- 2. Add custom_role_id to user_roles
ALTER TABLE public.user_roles 
  ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES public.custom_roles(id);

-- 3. Create default system roles if they don't exist
INSERT INTO public.custom_roles (company_id, name, description, base_role, is_active)
SELECT DISTINCT 
  ur.company_id,
  'Admin',
  'Full system access',
  'admin'::public.app_role,
  true
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = ur.company_id AND cr.base_role = 'admin'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_roles (company_id, name, description, base_role, is_active)
SELECT DISTINCT 
  ur.company_id,
  'Manager',
  'Operational management access',
  'manager'::public.app_role,
  true
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = ur.company_id AND cr.base_role = 'manager'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.custom_roles (company_id, name, description, base_role, is_active)
SELECT DISTINCT 
  ur.company_id,
  'Cleaner',
  'Field worker access',
  'cleaner'::public.app_role,
  true
FROM public.user_roles ur
WHERE NOT EXISTS (
  SELECT 1 FROM public.custom_roles cr 
  WHERE cr.company_id = ur.company_id AND cr.base_role = 'cleaner'
)
ON CONFLICT DO NOTHING;

-- 4. Link existing users to their corresponding custom_roles
UPDATE public.user_roles ur
SET custom_role_id = cr.id
FROM public.custom_roles cr
WHERE ur.custom_role_id IS NULL
  AND ur.company_id = cr.company_id
  AND ur.role = cr.base_role;

-- 5. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_custom_role_id ON public.user_roles(custom_role_id);
CREATE INDEX IF NOT EXISTS idx_custom_roles_base_role ON public.custom_roles(base_role);