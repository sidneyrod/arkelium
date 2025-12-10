import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ValidationResult {
  isValid: boolean;
  message?: string;
}

interface JobData {
  clientId: string;
  employeeId: string;
  date: string;
  time: string;
  duration: string;
  jobId?: string; // For editing - exclude current job from validation
}

// Parse duration string to minutes
const parseDurationToMinutes = (duration: string): number => {
  const match = duration.match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) * 60 : 120;
};

// Convert time string to minutes from midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
};

// Check if two time ranges overlap
const timeRangesOverlap = (
  start1: number, end1: number,
  start2: number, end2: number
): boolean => {
  return start1 < end2 && end1 > start2;
};

export const useScheduleValidation = () => {
  
  // Validate schedule conflicts
  const validateSchedule = useCallback(async (
    jobData: JobData,
    companyId: string
  ): Promise<ValidationResult> => {
    
    const { clientId, employeeId, date, time, duration, jobId } = jobData;
    const jobDurationMinutes = parseDurationToMinutes(duration);
    const jobStartMinutes = timeToMinutes(time);
    const jobEndMinutes = jobStartMinutes + jobDurationMinutes;
    
    try {
      // 1. Check for approved absences for this cleaner on this date
      if (employeeId) {
        const { data: absences, error: absenceError } = await supabase
          .from('absence_requests')
          .select('id, start_date, end_date')
          .eq('cleaner_id', employeeId)
          .eq('company_id', companyId)
          .eq('status', 'approved')
          .lte('start_date', date)
          .gte('end_date', date);
        
        if (absenceError) {
          console.error('Error checking absences:', absenceError);
        }
        
        if (absences && absences.length > 0) {
          return {
            isValid: false,
            message: 'Este funcionário possui ausência aprovada para esta data. Não é possível agendar.'
          };
        }
      }
      
      // 2. Check for existing jobs at the same time
      const { data: existingJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, client_id, cleaner_id, start_time, duration_minutes, profiles:cleaner_id(first_name, last_name), clients(name)')
        .eq('company_id', companyId)
        .eq('scheduled_date', date)
        .neq('status', 'cancelled');
      
      if (jobsError) {
        console.error('Error checking existing jobs:', jobsError);
        return { isValid: true };
      }
      
      // Filter out current job if editing
      const jobsToCheck = existingJobs?.filter(j => j.id !== jobId) || [];
      
      for (const existingJob of jobsToCheck) {
        const existingStartMinutes = timeToMinutes(existingJob.start_time?.slice(0, 5) || '09:00');
        const existingDurationMinutes = existingJob.duration_minutes || 120;
        const existingEndMinutes = existingStartMinutes + existingDurationMinutes;
        
        const hasTimeOverlap = timeRangesOverlap(
          jobStartMinutes, jobEndMinutes,
          existingStartMinutes, existingEndMinutes
        );
        
        if (!hasTimeOverlap) continue;
        
        // 3. Check for duplicate: same client + same cleaner + same time
        if (existingJob.client_id === clientId && existingJob.cleaner_id === employeeId) {
          return {
            isValid: false,
            message: 'Já existe um agendamento para este cliente com este cleaner neste horário.'
          };
        }
        
        // 4. Check for cleaner conflict: same cleaner at overlapping time
        if (existingJob.cleaner_id === employeeId) {
          const cleanerName = existingJob.profiles 
            ? `${(existingJob.profiles as any).first_name || ''} ${(existingJob.profiles as any).last_name || ''}`.trim()
            : 'Este cleaner';
          return {
            isValid: false,
            message: `${cleanerName} já está agendado neste horário.`
          };
        }
      }
      
      return { isValid: true };
      
    } catch (error) {
      console.error('Error validating schedule:', error);
      return { isValid: true }; // Allow in case of error to not block users
    }
  }, []);
  
  // Get available cleaners for a specific date/time
  const getAvailableCleaners = useCallback(async (
    date: string,
    time: string,
    duration: string,
    companyId: string,
    excludeJobId?: string
  ): Promise<string[]> => {
    
    const jobDurationMinutes = parseDurationToMinutes(duration);
    const jobStartMinutes = timeToMinutes(time);
    const jobEndMinutes = jobStartMinutes + jobDurationMinutes;
    
    try {
      // Get all cleaners with approved absences for this date
      const { data: absences } = await supabase
        .from('absence_requests')
        .select('cleaner_id')
        .eq('company_id', companyId)
        .eq('status', 'approved')
        .lte('start_date', date)
        .gte('end_date', date);
      
      const unavailableCleanerIds = new Set((absences || []).map(a => a.cleaner_id));
      
      // Get all jobs for this date to find busy cleaners
      const { data: existingJobs } = await supabase
        .from('jobs')
        .select('cleaner_id, start_time, duration_minutes')
        .eq('company_id', companyId)
        .eq('scheduled_date', date)
        .neq('status', 'cancelled')
        .neq('id', excludeJobId || '');
      
      for (const job of existingJobs || []) {
        if (!job.cleaner_id) continue;
        
        const existingStartMinutes = timeToMinutes(job.start_time?.slice(0, 5) || '09:00');
        const existingDurationMinutes = job.duration_minutes || 120;
        const existingEndMinutes = existingStartMinutes + existingDurationMinutes;
        
        if (timeRangesOverlap(jobStartMinutes, jobEndMinutes, existingStartMinutes, existingEndMinutes)) {
          unavailableCleanerIds.add(job.cleaner_id);
        }
      }
      
      return Array.from(unavailableCleanerIds);
      
    } catch (error) {
      console.error('Error getting available cleaners:', error);
      return [];
    }
  }, []);
  
  // Check if a job can be completed (not already completed)
  const canCompleteJob = useCallback((job: { status: string; completedAt?: string }): ValidationResult => {
    if (job.status === 'completed' || job.completedAt) {
      return {
        isValid: false,
        message: 'Este serviço já foi finalizado. Não é possível alterar.'
      };
    }
    return { isValid: true };
  }, []);
  
  // Validate client for duplicates
  const validateClientDuplicate = useCallback(async (
    clientData: { email?: string; name: string; phone?: string },
    companyId: string,
    excludeClientId?: string
  ): Promise<ValidationResult> => {
    
    try {
      // Check for duplicate email
      if (clientData.email) {
        const { data: emailMatch } = await supabase
          .from('clients')
          .select('id, name')
          .eq('company_id', companyId)
          .eq('email', clientData.email)
          .neq('id', excludeClientId || '');
        
        if (emailMatch && emailMatch.length > 0) {
          return {
            isValid: false,
            message: `Já existe um cliente com este e-mail: ${emailMatch[0].name}`
          };
        }
      }
      
      // Check for duplicate name + phone
      if (clientData.name && clientData.phone) {
        const { data: namePhoneMatch } = await supabase
          .from('clients')
          .select('id')
          .eq('company_id', companyId)
          .eq('name', clientData.name)
          .eq('phone', clientData.phone)
          .neq('id', excludeClientId || '');
        
        if (namePhoneMatch && namePhoneMatch.length > 0) {
          return {
            isValid: false,
            message: 'Já existe um cliente com este nome e telefone.'
          };
        }
      }
      
      return { isValid: true };
      
    } catch (error) {
      console.error('Error validating client:', error);
      return { isValid: true };
    }
  }, []);
  
  // Check if client can be deleted
  const canDeleteClient = useCallback(async (
    clientId: string,
    companyId: string
  ): Promise<ValidationResult> => {
    
    try {
      // Check for existing jobs
      const { data: jobs, count: jobCount } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('company_id', companyId);
      
      // Check for existing invoices
      const { data: invoices, count: invoiceCount } = await supabase
        .from('invoices')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('company_id', companyId);
      
      // Check for existing contracts
      const { data: contracts, count: contractCount } = await supabase
        .from('contracts')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('company_id', companyId);
      
      const totalRelated = (jobCount || 0) + (invoiceCount || 0) + (contractCount || 0);
      
      if (totalRelated > 0) {
        return {
          isValid: false,
          message: 'Este cliente possui histórico de serviços, faturas ou contratos. Apenas inativação é permitida.'
        };
      }
      
      return { isValid: true };
      
    } catch (error) {
      console.error('Error checking client dependencies:', error);
      return { isValid: true };
    }
  }, []);
  
  // Validate user email for duplicates
  const validateUserEmailDuplicate = useCallback(async (
    email: string,
    companyId: string,
    excludeUserId?: string
  ): Promise<ValidationResult> => {
    
    try {
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .eq('email', email)
        .neq('id', excludeUserId || '');
      
      if (existingUsers && existingUsers.length > 0) {
        const userName = `${existingUsers[0].first_name || ''} ${existingUsers[0].last_name || ''}`.trim();
        return {
          isValid: false,
          message: `Já existe um usuário com este e-mail: ${userName || 'Usuário existente'}`
        };
      }
      
      return { isValid: true };
      
    } catch (error) {
      console.error('Error validating user email:', error);
      return { isValid: true };
    }
  }, []);
  
  // Check active contract for client
  const getActiveContractForClient = useCallback(async (
    clientId: string,
    companyId: string
  ): Promise<{ hasActiveContract: boolean; contractId?: string }> => {
    
    try {
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id, status, end_date')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .eq('status', 'active');
      
      if (contracts && contracts.length > 0) {
        // Check if any active contract is not expired
        const today = new Date().toISOString().split('T')[0];
        const validContract = contracts.find(c => !c.end_date || c.end_date >= today);
        
        return {
          hasActiveContract: !!validContract,
          contractId: validContract?.id
        };
      }
      
      return { hasActiveContract: false };
      
    } catch (error) {
      console.error('Error checking active contract:', error);
      return { hasActiveContract: false };
    }
  }, []);
  
  return {
    validateSchedule,
    getAvailableCleaners,
    canCompleteJob,
    validateClientDuplicate,
    canDeleteClient,
    validateUserEmailDuplicate,
    getActiveContractForClient,
  };
};
