import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

export type ActivityType = 
  | 'user_created' | 'user_updated' | 'user_deleted'
  | 'client_created' | 'client_updated' | 'client_deleted' | 'client_inactivated'
  | 'contract_created' | 'contract_updated' | 'contract_deleted'
  | 'job_created' | 'job_updated' | 'job_completed' | 'job_cancelled'
  | 'visit_completed'
  | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'invoice_cancelled'
  | 'payment_registered' | 'payment_confirmed' | 'payment_rejected'
  | 'estimate_created' | 'estimate_updated' | 'estimate_deleted' | 'estimate_sent'
  | 'payroll_created' | 'payroll_approved' | 'payroll_paid' | 'payroll_reprocessed'
  | 'settings_updated' | 'login' | 'logout'
  | 'absence_requested' | 'absence_approved' | 'absence_rejected';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  entityId?: string;
  entityName?: string;
  description: string;
  userId: string;
  userName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityState {
  logs: ActivityLog[];
  addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set) => ({
      logs: [],
      
      addLog: (log) => set((state) => ({
        logs: [{ ...log, id: crypto.randomUUID(), timestamp: new Date().toISOString() }, ...state.logs].slice(0, 500) // Keep last 500 logs
      })),
      
      clearLogs: () => set({ logs: [] }),
    }),
    { name: 'activity-store' }
  )
);

// Helper function to log activities to BOTH local store and Supabase
export const logActivity = async (
  type: ActivityType,
  description: string,
  entityId?: string,
  entityName?: string,
  metadata?: Record<string, unknown>
) => {
  // Add to local store
  useActivityStore.getState().addLog({
    type,
    entityId,
    entityName,
    description,
    userId: 'current-user',
    userName: 'Current User',
    metadata,
  });

  // Also persist to Supabase
  try {
    const { data: companyId } = await supabase.rpc('get_user_company_id');
    
    if (companyId) {
      await supabase
        .from('activity_logs')
        .insert({
          action: type,
          entity_type: type.split('_')[0], // e.g., 'user', 'client', 'job'
          entity_id: entityId,
          company_id: companyId,
          details: {
            description,
            entityName,
            ...metadata,
            timestamp: new Date().toISOString(),
          },
        });
    }
  } catch (error) {
    console.error('Failed to log activity to Supabase:', error);
  }
};
