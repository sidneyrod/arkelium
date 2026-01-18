import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type AuditAction = 
  | 'user_created' | 'user_updated' | 'user_deleted'
  | 'client_created' | 'client_updated' | 'client_deleted' | 'client_inactivated'
  | 'contract_created' | 'contract_updated' | 'contract_deleted'
  | 'job_created' | 'job_updated' | 'job_completed' | 'job_cancelled' | 'job_started' | 'job_soft_deleted'
  | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'invoice_cancelled' | 'invoice_updated' | 'invoice_voided'
  | 'receipt_generated' | 'receipt_sent' | 'receipt_resent' | 'receipt_voided'
  | 'payment_registered' | 'payment_confirmed' | 'payment_rejected'
  | 'payroll_created' | 'payroll_approved' | 'payroll_paid' | 'payroll_reprocessed'
  | 'payroll_period_created' | 'payroll_period_updated'
  | 'absence_requested' | 'absence_approved' | 'absence_rejected'
  | 'settings_updated' | 'login' | 'logout'
  | 'company_created' | 'company_updated'
  | 'financial_transaction_created' | 'financial_transaction_updated'
  | 'financial_period_created' | 'financial_period_closed' | 'financial_period_reopened' | 'financial_period_updated'
  | 'estimate_created' | 'estimate_updated' | 'estimate_deleted' | 'estimate_sent'
  | 'cash_kept_by_cleaner' | 'cash_delivered_to_office' | 'cash_compensation_settled' | 'cash_voided'
  | 'cash_approved' | 'cash_disputed' | 'cash_settled'
  | 'job_overdue_alert'
  // Enterprise Multi-Company Actions
  | 'organization_created' | 'organization_updated'
  | 'company_switched' | 'operating_company_selected'
  | 'activity_configured' | 'service_catalog_updated'
  // System Validation Actions
  | 'ledger_validation_warning';

export type AuditSource = 'ui' | 'api' | 'system' | 'migration';

interface AuditLogEntry {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  beforeData?: Record<string, unknown>;
  afterData?: Record<string, unknown>;
  reason?: string;
  source?: AuditSource;
  details?: {
    previousValue?: unknown;
    newValue?: unknown;
    description?: string;
    [key: string]: unknown;
  };
}

// Standalone function to log audit entries (can be used outside React components)
export const logAuditEntry = async (
  entry: AuditLogEntry,
  userId?: string,
  companyId?: string
) => {
  try {
    // Get company ID if not provided
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId) {
      const { data } = await supabase.rpc('get_user_company_id');
      resolvedCompanyId = data;
    }

    if (!resolvedCompanyId) {
      console.warn('No company ID available for audit log');
      return;
    }

    const insertData = {
      company_id: resolvedCompanyId,
      user_id: userId || null,
      action: entry.action,
      entity_type: entry.entityType || null,
      entity_id: entry.entityId || null,
      before_data: entry.beforeData || null,
      after_data: entry.afterData || null,
      reason: entry.reason || null,
      source: entry.source || 'ui',
      performed_by_user_id: userId || null,
      details: entry.details || null,
    };

    const { error } = await supabase
      .from('activity_logs')
      .insert(insertData as any);

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (err) {
    console.error('Error logging audit entry:', err);
  }
};

// Hook for use within React components
export const useAuditLog = () => {
  const { user } = useAuth();

  const logAction = async (entry: AuditLogEntry) => {
    await logAuditEntry(
      entry,
      user?.id,
      user?.companyId || undefined
    );
  };

  // Helper for logging changes with before/after data
  const logChange = async (
    action: AuditAction,
    entityType: string,
    entityId: string,
    beforeData: Record<string, unknown>,
    afterData: Record<string, unknown>,
    reason?: string
  ) => {
    await logAction({
      action,
      entityType,
      entityId,
      beforeData,
      afterData,
      reason,
      source: 'ui',
    });
  };

  // Helper for logging sensitive actions that require a reason
  const logSensitiveAction = async (
    action: AuditAction,
    entityType: string,
    entityId: string,
    reason: string,
    additionalData?: Record<string, unknown>
  ) => {
    if (!reason.trim()) {
      console.warn('Sensitive actions require a reason');
      return;
    }

    await logAction({
      action,
      entityType,
      entityId,
      reason,
      source: 'ui',
      details: additionalData,
    });
  };

  return { 
    logAction, 
    logChange, 
    logSensitiveAction 
  };
};

export default useAuditLog;
