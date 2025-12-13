import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { 
  useNotificationStore, 
  initializeNotificationSubscription,
  Notification,
  NotificationType,
  NotificationSeverity,
  NotificationPreferences
} from '@/stores/notificationStore';

// Re-export types
export type { Notification, NotificationType, NotificationSeverity, NotificationPreferences };

interface CreateNotificationParams {
  recipient_user_id?: string | null;
  role_target?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  severity?: NotificationSeverity;
  metadata?: Record<string, unknown>;
}

export const useNotifications = () => {
  const { user, isAuthenticated } = useAuth();
  const store = useNotificationStore();

  useEffect(() => {
    // Only initialize if user is authenticated and has an ID
    if (isAuthenticated && user?.id) {
      const cleanup = initializeNotificationSubscription(user.id);
      return cleanup;
    }
  }, [user?.id, isAuthenticated]);

  const updatePreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    if (!user) return;
    await store.updatePreferences(user.id, newPrefs);
  };

  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    loading: store.loading,
    preferences: store.preferences,
    fetchNotifications: store.fetchNotifications,
    fetchUnreadCount: store.fetchUnreadCount,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    updatePreferences,
    refetch: store.fetchNotifications
  };
};

// Helper function to create notifications (used across the app)
export const createNotification = async (params: CreateNotificationParams): Promise<boolean> => {
  try {
    const { data: companyId } = await supabase.rpc('get_user_company_id');
    
    if (!companyId) {
      console.error('No company ID found');
      return false;
    }

    const { error } = await supabase
      .from('notifications')
      .insert({
        company_id: companyId,
        recipient_user_id: params.recipient_user_id || null,
        role_target: params.role_target || null,
        title: params.title,
        message: params.message,
        type: params.type,
        severity: params.severity || 'info',
        metadata: params.metadata || {}
      } as any);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

// Helper to create notifications for specific events
export const notifyJobCreated = async (
  cleanerId: string,
  clientName: string,
  scheduledDate: string,
  startTime: string,
  address: string,
  jobId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'New Job Scheduled',
    message: `You have a new job scheduled for ${scheduledDate} at ${startTime} - ${clientName}, ${address}`,
    type: 'job',
    severity: 'info',
    metadata: { job_id: jobId, client_name: clientName }
  });
};

export const notifyJobUpdated = async (
  cleanerId: string,
  clientName: string,
  changes: string,
  jobId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'Job Updated',
    message: `Your job for ${clientName} has been updated: ${changes}`,
    type: 'job',
    severity: 'warning',
    metadata: { job_id: jobId, client_name: clientName }
  });
};

export const notifyJobCancelled = async (
  cleanerId: string,
  clientName: string,
  scheduledDate: string,
  jobId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'Job Cancelled',
    message: `Your job for ${clientName} on ${scheduledDate} has been cancelled`,
    type: 'job',
    severity: 'warning',
    metadata: { job_id: jobId, client_name: clientName }
  });
};

export const notifyJobCompleted = async (
  cleanerName: string,
  clientName: string,
  jobId: string,
  paymentAmount?: number,
  paymentMethod?: string
) => {
  const paymentInfo = paymentAmount && paymentMethod 
    ? ` - Payment: $${paymentAmount.toFixed(2)} (${paymentMethod})`
    : '';
  
  return createNotification({
    role_target: 'admin',
    title: 'Job Completed',
    message: `${cleanerName} completed job for ${clientName}${paymentInfo}`,
    type: 'job',
    severity: 'info',
    metadata: { job_id: jobId, cleaner_name: cleanerName, client_name: clientName }
  });
};

export const notifyVisitCreated = async (
  cleanerId: string,
  purpose: string,
  scheduledDate: string,
  address: string,
  visitId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'New Visit Scheduled',
    message: `You have a new visit scheduled: ${purpose} on ${scheduledDate} at ${address}`,
    type: 'visit',
    severity: 'info',
    metadata: { visit_id: visitId, purpose }
  });
};

export const notifyOffRequestCreated = async (
  cleanerName: string,
  startDate: string,
  endDate: string,
  requestId: string,
  companyId?: string
) => {
  // Get company_id either from parameter or via RPC
  let resolvedCompanyId = companyId;
  if (!resolvedCompanyId) {
    const { data } = await supabase.rpc('get_user_company_id');
    resolvedCompanyId = data;
  }
  
  if (!resolvedCompanyId) {
    console.error('No company ID found for off request notification');
    return false;
  }

  try {
    // Format dates for display (parse as local date)
    const formatDate = (dateStr: string) => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    };
    
    const { error } = await supabase
      .from('notifications')
      .insert({
        company_id: resolvedCompanyId,
        recipient_user_id: null,
        role_target: 'admin',
        title: 'New Off Request',
        message: `${cleanerName} requested time off from ${formatDate(startDate)} to ${formatDate(endDate)}`,
        type: 'off_request',
        severity: 'info',
        metadata: { off_request_id: requestId, cleaner_name: cleanerName }
      } as any);

    if (error) {
      console.error('Error creating off request notification:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in notifyOffRequestCreated:', error);
    return false;
  }
};

export const notifyOffRequestApproved = async (
  cleanerId: string,
  startDate: string,
  endDate: string,
  requestId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'Off Request Approved',
    message: `Your time off request from ${startDate} to ${endDate} has been approved`,
    type: 'off_request',
    severity: 'info',
    metadata: { off_request_id: requestId }
  });
};

export const notifyOffRequestRejected = async (
  cleanerId: string,
  startDate: string,
  endDate: string,
  reason: string | null,
  requestId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'Off Request Rejected',
    message: `Your time off request from ${startDate} to ${endDate} has been rejected${reason ? `: ${reason}` : ''}`,
    type: 'off_request',
    severity: 'warning',
    metadata: { off_request_id: requestId, reason }
  });
};

export const notifyInvoiceGenerated = async (
  invoiceNumber: string,
  clientName: string,
  total: number,
  invoiceId: string
) => {
  return createNotification({
    role_target: 'admin',
    title: 'Invoice Generated',
    message: `Invoice ${invoiceNumber} for ${clientName} - $${total.toFixed(2)} has been generated`,
    type: 'invoice',
    severity: 'info',
    metadata: { invoice_id: invoiceId, invoice_number: invoiceNumber, client_name: clientName }
  });
};

export const notifyInvoicePaid = async (
  invoiceNumber: string,
  clientName: string,
  amount: number,
  invoiceId: string
) => {
  return createNotification({
    role_target: 'admin',
    title: 'Invoice Paid',
    message: `Invoice ${invoiceNumber} from ${clientName} - $${amount.toFixed(2)} has been marked as paid`,
    type: 'invoice',
    severity: 'info',
    metadata: { invoice_id: invoiceId, invoice_number: invoiceNumber }
  });
};

export const notifyPayrollGenerated = async (
  periodName: string,
  periodId: string
) => {
  return createNotification({
    role_target: 'admin',
    title: 'Payroll Period Generated',
    message: `Payroll period "${periodName}" has been generated and is ready for review`,
    type: 'payroll',
    severity: 'info',
    metadata: { period_id: periodId, period_name: periodName }
  });
};

export const notifyPaystubAvailable = async (
  cleanerId: string,
  periodName: string,
  amount: number,
  periodId: string
) => {
  return createNotification({
    recipient_user_id: cleanerId,
    title: 'Paystub Available',
    message: `Your paystub for "${periodName}" - $${amount.toFixed(2)} is now available`,
    type: 'payroll',
    severity: 'info',
    metadata: { period_id: periodId, period_name: periodName, amount }
  });
};

export const notifyBroadcast = async (
  title: string,
  message: string,
  targetRole?: string
) => {
  return createNotification({
    role_target: targetRole || 'all',
    title,
    message,
    type: 'system',
    severity: 'info'
  });
};
