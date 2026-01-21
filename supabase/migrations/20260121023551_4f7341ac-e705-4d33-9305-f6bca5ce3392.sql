-- 1. Remove obsolete permissions from role_permissions first
DELETE FROM public.role_permissions 
WHERE permission_id IN (
  SELECT id FROM public.permissions 
  WHERE module IN ('reports', 'access_roles', 'company_settings')
);

-- 2. Remove obsolete permissions
DELETE FROM public.permissions 
WHERE module IN ('reports', 'access_roles', 'company_settings');

-- 3. Add missing permissions for estimates module
INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'estimates', 'view', 'View estimates and quotes', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'estimates', 'create', 'Create new estimates', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'estimates', 'edit', 'Edit existing estimates', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'estimates', 'delete', 'Delete estimates', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

-- 4. Add missing permissions for off_requests module
INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'off_requests', 'view', 'View field off requests', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'off_requests', 'create', 'Create off requests', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'off_requests', 'edit', 'Edit off requests', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (company_id, module, action, description, is_system)
SELECT DISTINCT company_id, 'off_requests', 'delete', 'Delete off requests', true
FROM public.permissions WHERE module = 'dashboard'
ON CONFLICT DO NOTHING;