-- Fix any users without user_roles entries
INSERT INTO public.user_roles (user_id, company_id, role, custom_role_id, status)
SELECT 
  p.id,
  p.company_id,
  'cleaner'::app_role,
  NULL,
  'active'
FROM public.profiles p
WHERE p.company_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.id AND ur.company_id = p.company_id
  );