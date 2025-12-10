import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface BlockedPeriod {
  id: string;
  startDate: string;
  endDate: string;
  requestType: string;
  reason?: string;
}

interface CleanerBlockStatus {
  isBlocked: boolean;
  blockedPeriods: BlockedPeriod[];
  message?: string;
}

/**
 * Hook to check if a cleaner is blocked for scheduling
 * This is a BUSINESS RULE enforcement, not just UI
 */
export const useCleanerBlockCheck = () => {
  
  /**
   * Check if a cleaner is blocked for a specific date
   * Returns blocking status and details
   */
  const isCleanerBlockedForDate = useCallback(async (
    cleanerId: string,
    date: string,
    companyId: string
  ): Promise<CleanerBlockStatus> => {
    
    try {
      const { data: blockedRequests, error } = await supabase
        .from('absence_requests')
        .select('id, start_date, end_date, request_type, reason')
        .eq('cleaner_id', cleanerId)
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date);
      
      if (error) {
        console.error('Error checking cleaner block status:', error);
        return { isBlocked: false, blockedPeriods: [] };
      }
      
      if (blockedRequests && blockedRequests.length > 0) {
        const blockedPeriods: BlockedPeriod[] = blockedRequests.map(r => ({
          id: r.id,
          startDate: r.start_date,
          endDate: r.end_date,
          requestType: r.request_type,
          reason: r.reason,
        }));
        
        const requestTypeLabels: Record<string, string> = {
          time_off: 'folga',
          vacation: 'férias',
          personal: 'indisponibilidade pessoal',
        };
        
        const typeLabel = requestTypeLabels[blockedRequests[0].request_type] || 'ausência aprovada';
        
        return {
          isBlocked: true,
          blockedPeriods,
          message: `Cleaner indisponível no período aprovado (${typeLabel}): ${blockedRequests[0].start_date} até ${blockedRequests[0].end_date}`
        };
      }
      
      return { isBlocked: false, blockedPeriods: [] };
      
    } catch (error) {
      console.error('Error in isCleanerBlockedForDate:', error);
      return { isBlocked: false, blockedPeriods: [] };
    }
  }, []);
  
  /**
   * Get all blocked cleaners for a date range
   * Used to filter out cleaners from selection dropdowns
   */
  const getBlockedCleanersForDate = useCallback(async (
    date: string,
    companyId: string
  ): Promise<string[]> => {
    
    try {
      const { data: blockedRequests, error } = await supabase
        .from('absence_requests')
        .select('cleaner_id')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date);
      
      if (error) {
        console.error('Error getting blocked cleaners:', error);
        return [];
      }
      
      // Return unique cleaner IDs
      const uniqueCleanerIds = [...new Set((blockedRequests || []).map(r => r.cleaner_id))];
      return uniqueCleanerIds;
      
    } catch (error) {
      console.error('Error in getBlockedCleanersForDate:', error);
      return [];
    }
  }, []);
  
  /**
   * Get all active blocks for display in admin panel
   */
  const getActiveBlocks = useCallback(async (
    companyId: string
  ): Promise<Array<{
    cleanerId: string;
    cleanerName: string;
    startDate: string;
    endDate: string;
    requestType: string;
    reason?: string;
  }>> => {
    
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await supabase
        .from('absence_requests')
        .select(`
          cleaner_id,
          start_date,
          end_date,
          request_type,
          reason,
          profiles:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .gte('end_date', today)
        .order('start_date', { ascending: true });
      
      if (error) {
        console.error('Error getting active blocks:', error);
        return [];
      }
      
      return (data || []).map((r: any) => ({
        cleanerId: r.cleaner_id,
        cleanerName: r.profiles 
          ? `${r.profiles.first_name || ''} ${r.profiles.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        startDate: r.start_date,
        endDate: r.end_date,
        requestType: r.request_type,
        reason: r.reason,
      }));
      
    } catch (error) {
      console.error('Error in getActiveBlocks:', error);
      return [];
    }
  }, []);
  
  /**
   * Validate if a job can be created for a cleaner on a specific date
   * This is the main validation function that MUST be called before saving any job
   */
  const validateJobCreation = useCallback(async (
    cleanerId: string,
    date: string,
    companyId: string
  ): Promise<{ canCreate: boolean; message?: string }> => {
    
    const blockStatus = await isCleanerBlockedForDate(cleanerId, date, companyId);
    
    if (blockStatus.isBlocked) {
      return {
        canCreate: false,
        message: blockStatus.message || 'Cleaner indisponível nesta data devido a período de ausência aprovado.'
      };
    }
    
    return { canCreate: true };
  }, [isCleanerBlockedForDate]);
  
  return {
    isCleanerBlockedForDate,
    getBlockedCleanersForDate,
    getActiveBlocks,
    validateJobCreation,
  };
};