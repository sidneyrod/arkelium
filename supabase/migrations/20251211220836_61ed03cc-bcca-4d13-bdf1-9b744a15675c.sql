-- Create enum for notification types
CREATE TYPE public.notification_type AS ENUM ('job', 'visit', 'off_request', 'invoice', 'payroll', 'system');

-- Create enum for notification severity
CREATE TYPE public.notification_severity AS ENUM ('info', 'warning', 'critical');

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_target TEXT, -- 'cleaner', 'manager', 'admin', 'all' for broadcast
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  severity notification_severity NOT NULL DEFAULT 'info',
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notify_new_jobs BOOLEAN NOT NULL DEFAULT true,
  notify_job_changes BOOLEAN NOT NULL DEFAULT true,
  notify_job_cancellations BOOLEAN NOT NULL DEFAULT true,
  notify_visits BOOLEAN NOT NULL DEFAULT true,
  notify_off_requests BOOLEAN NOT NULL DEFAULT true,
  notify_off_request_status BOOLEAN NOT NULL DEFAULT true,
  notify_invoices BOOLEAN NOT NULL DEFAULT true,
  notify_payroll BOOLEAN NOT NULL DEFAULT true,
  notify_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create indexes for performance
CREATE INDEX idx_notifications_company_id ON public.notifications(company_id);
CREATE INDEX idx_notifications_recipient ON public.notifications(recipient_user_id);
CREATE INDEX idx_notifications_role_target ON public.notifications(role_target);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications

-- Users can view their own notifications or broadcast notifications for their role/company
CREATE POLICY "Users can view their notifications"
ON public.notifications
FOR SELECT
USING (
  company_id = get_user_company_id() AND (
    recipient_user_id = auth.uid() OR
    (recipient_user_id IS NULL AND (
      role_target = 'all' OR
      role_target IN (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() AND company_id = get_user_company_id())
    ))
  )
);

-- Admin/Manager can view all notifications in their company
CREATE POLICY "Admin/Manager can view all notifications"
ON public.notifications
FOR SELECT
USING (
  company_id = get_user_company_id() AND is_admin_or_manager()
);

-- Admin can create notifications
CREATE POLICY "Admin can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id() AND has_role('admin'::app_role)
);

-- System can create notifications (for automated events)
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id()
);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (
  company_id = get_user_company_id() AND (
    recipient_user_id = auth.uid() OR
    (recipient_user_id IS NULL AND role_target IN (SELECT role::text FROM public.user_roles WHERE user_id = auth.uid() AND company_id = get_user_company_id()))
  )
);

-- Admin can delete notifications
CREATE POLICY "Admin can delete notifications"
ON public.notifications
FOR DELETE
USING (
  company_id = get_user_company_id() AND has_role('admin'::app_role)
);

-- RLS Policies for notification_preferences

-- Users can view their own preferences
CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences
FOR SELECT
USING (
  company_id = get_user_company_id() AND user_id = auth.uid()
);

-- Admin can view all preferences
CREATE POLICY "Admin can view all notification preferences"
ON public.notification_preferences
FOR SELECT
USING (
  company_id = get_user_company_id() AND has_role('admin'::app_role)
);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own notification preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id() AND user_id = auth.uid()
);

-- Users can update their own preferences
CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences
FOR UPDATE
USING (
  company_id = get_user_company_id() AND user_id = auth.uid()
);

-- Create trigger for updated_at on notification_preferences
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();