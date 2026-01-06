-- RPC: mark one notification as read (supports role_target='all')
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.notifications n
  SET is_read = true,
      read_at = now()
  WHERE n.id = p_notification_id
    AND n.company_id = public.get_user_company_id()
    AND (
      n.recipient_user_id = auth.uid()
      OR (
        n.recipient_user_id IS NULL
        AND (
          n.role_target = 'all'
          OR n.role_target IN (
            SELECT (ur.role)::text
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.company_id = public.get_user_company_id()
          )
        )
      )
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

-- RPC: mark all visible notifications as read (supports role_target='all')
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  updated_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.notifications n
  SET is_read = true,
      read_at = now()
  WHERE n.is_read = false
    AND n.company_id = public.get_user_company_id()
    AND (
      n.recipient_user_id = auth.uid()
      OR (
        n.recipient_user_id IS NULL
        AND (
          n.role_target = 'all'
          OR n.role_target IN (
            SELECT (ur.role)::text
            FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
              AND ur.company_id = public.get_user_company_id()
          )
        )
      )
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;