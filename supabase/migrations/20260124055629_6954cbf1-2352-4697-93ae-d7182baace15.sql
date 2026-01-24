-- Create a table to track read status per user for broadcast notifications
CREATE TABLE IF NOT EXISTS public.notification_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Each user can only mark a notification as read once
  UNIQUE(notification_id, user_id)
);

-- Enable RLS
ALTER TABLE public.notification_read_status ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own read status"
  ON public.notification_read_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own read status"
  ON public.notification_read_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_read_status_user ON public.notification_read_status(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_read_status_notification ON public.notification_read_status(notification_id);

-- Update the mark_notification_as_read function to use the new table for broadcast notifications
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification RECORD;
  v_company_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_company_id := public.get_user_company_id();
  
  -- Get the notification
  SELECT * INTO v_notification 
  FROM public.notifications 
  WHERE id = p_notification_id AND company_id = v_company_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- For direct notifications (recipient_user_id set), update the notification directly
  IF v_notification.recipient_user_id = auth.uid() THEN
    UPDATE public.notifications
    SET is_read = true, read_at = now()
    WHERE id = p_notification_id;
    RETURN TRUE;
  END IF;
  
  -- For broadcast notifications (role_target), insert into read status table
  IF v_notification.recipient_user_id IS NULL AND v_notification.role_target IS NOT NULL THEN
    INSERT INTO public.notification_read_status (notification_id, user_id, company_id)
    VALUES (p_notification_id, auth.uid(), v_company_id)
    ON CONFLICT (notification_id, user_id) DO NOTHING;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Update mark_all_notifications_as_read to handle broadcast notifications correctly
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_user_id UUID;
  v_user_role TEXT;
  v_direct_count INTEGER := 0;
  v_broadcast_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_user_id := auth.uid();
  v_company_id := public.get_user_company_id();
  
  -- Get user's role
  SELECT (role)::text INTO v_user_role 
  FROM public.user_roles 
  WHERE user_id = v_user_id AND company_id = v_company_id
  LIMIT 1;
  
  -- Mark direct notifications as read
  UPDATE public.notifications
  SET is_read = true, read_at = now()
  WHERE company_id = v_company_id
    AND recipient_user_id = v_user_id
    AND is_read = false;
  
  GET DIAGNOSTICS v_direct_count = ROW_COUNT;
  
  -- Insert read status for all unread broadcast notifications the user can see
  INSERT INTO public.notification_read_status (notification_id, user_id, company_id)
  SELECT n.id, v_user_id, v_company_id
  FROM public.notifications n
  WHERE n.company_id = v_company_id
    AND n.recipient_user_id IS NULL
    AND (n.role_target = 'all' OR n.role_target = v_user_role)
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_read_status nrs
      WHERE nrs.notification_id = n.id AND nrs.user_id = v_user_id
    )
  ON CONFLICT (notification_id, user_id) DO NOTHING;
  
  GET DIAGNOSTICS v_broadcast_count = ROW_COUNT;
  
  RETURN v_direct_count + v_broadcast_count;
END;
$$;