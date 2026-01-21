-- Remove references in role_permissions first (foreign key constraint)
DELETE FROM public.role_permissions 
WHERE permission_id IN (
  SELECT id FROM public.permissions 
  WHERE module IN ('reports', 'access_roles', 'company_settings')
);

-- Remove obsolete permissions
DELETE FROM public.permissions 
WHERE module IN ('reports', 'access_roles', 'company_settings');