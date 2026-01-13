-- Drop the overly permissive policy that lets managers see all notifications
DROP POLICY IF EXISTS "Admin/Manager can view all notifications" ON public.notifications;

-- Update activity_logs RLS to only allow admin access (not manager)
DROP POLICY IF EXISTS "Admin/Manager can view activity logs" ON public.activity_logs;

CREATE POLICY "Only admins can view activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id() 
  AND has_role('admin'::app_role)
);