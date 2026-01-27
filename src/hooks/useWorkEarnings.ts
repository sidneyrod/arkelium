import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultDateRange } from '@/components/ui/period-selector';
import { format } from 'date-fns';
import { useCompanyPreferences } from '@/hooks/useCompanyPreferences';

export interface UseWorkEarningsParams {
  companyIds: string[];
}

export interface WorkEarningsPeriod {
  startDate: string;
  endDate: string;
}

export interface CleanerWorkSummary {
  id: string;
  cleanerId: string;
  cleanerName: string;
  role: string;
  jobsCompleted: number;
  totalHoursWorked: number;
  totalServiceValue: number;
  cashKeptApproved: number;
  cashDeliveredToOffice: number;
  hasDisputes: boolean;
}

export interface JobDetail {
  id: string;
  jobDate: string;
  clientName: string;
  clientId: string;
  plannedDuration: number;
  actualDuration: number | null;
  hoursWorked: number;
  serviceAmount: number;
  paymentMethod: string | null;
  cashHandling: string | null;
  cashStatus: string | null;
  notes: string | null;
}

export interface GlobalSummary {
  totalJobsCompleted: number;
  totalHoursWorked: number;
  totalGrossServiceRevenue: number;
  totalCashCollected: number;
  cashKeptPending: number;
  cashKeptApproved: number;
  cashKeptSettled: number;
  cashDeliveredToOffice: number;
}

export function useWorkEarnings(params: UseWorkEarningsParams) {
  const { companyIds } = params;
  const { user } = useAuth();
  const { preferences, isLoading: prefsLoading } = useCompanyPreferences();
  
  const [period, setPeriod] = useState<WorkEarningsPeriod>(() => {
    const defaultRange = getDefaultDateRange();
    return {
      startDate: format(defaultRange.startDate, 'yyyy-MM-dd'),
      endDate: format(defaultRange.endDate, 'yyyy-MM-dd'),
    };
  });
  
  const [globalSummary, setGlobalSummary] = useState<GlobalSummary>({
    totalJobsCompleted: 0,
    totalHoursWorked: 0,
    totalGrossServiceRevenue: 0,
    totalCashCollected: 0,
    cashKeptPending: 0,
    cashKeptApproved: 0,
    cashKeptSettled: 0,
    cashDeliveredToOffice: 0,
  });
  
  const [cleanerSummaries, setCleanerSummaries] = useState<CleanerWorkSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Whether to exclude visits from reports (based on company preferences)
  const excludeVisits = !preferences.includeVisitsInReports;
  // Whether cash kept by employee feature is enabled
  const enableCashKept = preferences.enableCashKeptByEmployee;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (companyIds.length === 0) {
        setIsLoading(false);
        return;
      }

      // Fetch completed jobs in period with company filter
      let jobsQuery = supabase
        .from('jobs')
        .select(`
          id,
          cleaner_id,
          client_id,
          scheduled_date,
          start_time,
          end_time,
          duration_minutes,
          payment_amount,
          payment_method,
          notes,
          job_type,
          clients(id, name)
        `)
        .eq('status', 'completed')
        .gte('scheduled_date', period.startDate)
        .lte('scheduled_date', period.endDate);

      // Apply company filter
      if (companyIds.length === 1) {
        jobsQuery = jobsQuery.eq('company_id', companyIds[0]);
      } else {
        jobsQuery = jobsQuery.in('company_id', companyIds);
      }

      // Apply visit filter based on company preferences
      if (excludeVisits) {
        jobsQuery = jobsQuery.neq('job_type', 'visit');
      }

      const { data: jobs, error: jobsError } = await jobsQuery;

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        setIsLoading(false);
        return;
      }

      // Fetch cash collections in period
      let cashQuery = supabase
        .from('cash_collections')
        .select(`
          id,
          cleaner_id,
          amount,
          cash_handling,
          compensation_status,
          service_date
        `)
        .gte('service_date', period.startDate)
        .lte('service_date', period.endDate);

      if (companyIds.length === 1) {
        cashQuery = cashQuery.eq('company_id', companyIds[0]);
      } else {
        cashQuery = cashQuery.in('company_id', companyIds);
      }

      const { data: cashCollections, error: cashError } = await cashQuery;

      if (cashError) {
        console.error('Error fetching cash collections:', cashError);
      }

      // Fetch cleaner profiles with roles - need to get from all companies in scope
      let cleanersQuery = supabase.from('profiles').select('id, first_name, last_name');
      
      if (companyIds.length === 1) {
        cleanersQuery = cleanersQuery.eq('company_id', companyIds[0]);
      } else {
        cleanersQuery = cleanersQuery.in('company_id', companyIds);
      }

      const { data: cleaners, error: cleanersError } = await cleanersQuery;

      if (cleanersError) {
        console.error('Error fetching cleaners:', cleanersError);
      }

      // Fetch user roles
      let rolesQuery = supabase.from('user_roles').select('user_id, role');
      
      if (companyIds.length === 1) {
        rolesQuery = rolesQuery.eq('company_id', companyIds[0]);
      } else {
        rolesQuery = rolesQuery.in('company_id', companyIds);
      }

      const { data: userRoles, error: rolesError } = await rolesQuery;

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
      }

      // Create cleaner map with name and role
      const cleanerMap: Record<string, { name: string; role: string }> = {};
      for (const c of cleaners || []) {
        const userRole = userRoles?.find(r => r.user_id === c.id);
        cleanerMap[c.id] = {
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
          role: userRole?.role || 'staff',
        };
      }

      // Calculate global summary
      const totalJobsCompleted = jobs?.length || 0;
      let totalHoursWorked = 0;
      let totalGrossServiceRevenue = 0;

      for (const job of jobs || []) {
        totalHoursWorked += (job.duration_minutes || 0) / 60;
        totalGrossServiceRevenue += job.payment_amount || 0;
      }

      // Cash summary
      let totalCashCollected = 0;
      let cashKeptPending = 0;
      let cashKeptApproved = 0;
      let cashKeptSettled = 0;
      let cashDeliveredToOffice = 0;

      for (const cc of cashCollections || []) {
        totalCashCollected += cc.amount || 0;
        
        if (cc.cash_handling === 'kept_by_cleaner') {
          if (cc.compensation_status === 'pending') cashKeptPending += cc.amount || 0;
          if (cc.compensation_status === 'approved') cashKeptApproved += cc.amount || 0;
          if (cc.compensation_status === 'settled') cashKeptSettled += cc.amount || 0;
        } else if (cc.cash_handling === 'delivered_to_office') {
          cashDeliveredToOffice += cc.amount || 0;
        }
      }

      setGlobalSummary({
        totalJobsCompleted,
        totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
        totalGrossServiceRevenue: Math.round(totalGrossServiceRevenue * 100) / 100,
        totalCashCollected: Math.round(totalCashCollected * 100) / 100,
        cashKeptPending: Math.round(cashKeptPending * 100) / 100,
        cashKeptApproved: Math.round(cashKeptApproved * 100) / 100,
        cashKeptSettled: Math.round(cashKeptSettled * 100) / 100,
        cashDeliveredToOffice: Math.round(cashDeliveredToOffice * 100) / 100,
      });

      // Group by cleaner
      const cleanerData: Record<string, {
        jobsCompleted: number;
        totalHours: number;
        serviceValue: number;
        cashKeptApproved: number;
        cashDelivered: number;
        hasDisputes: boolean;
      }> = {};

      for (const job of jobs || []) {
        if (!job.cleaner_id) continue;
        
        if (!cleanerData[job.cleaner_id]) {
          cleanerData[job.cleaner_id] = {
            jobsCompleted: 0,
            totalHours: 0,
            serviceValue: 0,
            cashKeptApproved: 0,
            cashDelivered: 0,
            hasDisputes: false,
          };
        }
        
        cleanerData[job.cleaner_id].jobsCompleted++;
        cleanerData[job.cleaner_id].totalHours += (job.duration_minutes || 0) / 60;
        cleanerData[job.cleaner_id].serviceValue += job.payment_amount || 0;
      }

      // Add cash data
      for (const cc of cashCollections || []) {
        if (!cc.cleaner_id || !cleanerData[cc.cleaner_id]) continue;
        
        if (cc.cash_handling === 'kept_by_cleaner' && cc.compensation_status === 'approved') {
          cleanerData[cc.cleaner_id].cashKeptApproved += cc.amount || 0;
        } else if (cc.cash_handling === 'delivered_to_office') {
          cleanerData[cc.cleaner_id].cashDelivered += cc.amount || 0;
        }
        
        if (cc.compensation_status === 'disputed') {
          cleanerData[cc.cleaner_id].hasDisputes = true;
        }
      }

      // Convert to array
      const summaries: CleanerWorkSummary[] = Object.entries(cleanerData).map(([id, data]) => {
        const info = cleanerMap[id] || { name: 'Unknown', role: 'staff' };
        return {
          id,
          cleanerId: id,
          cleanerName: info.name,
          role: info.role,
          jobsCompleted: data.jobsCompleted,
          totalHoursWorked: Math.round(data.totalHours * 100) / 100,
          totalServiceValue: Math.round(data.serviceValue * 100) / 100,
          cashKeptApproved: Math.round(data.cashKeptApproved * 100) / 100,
          cashDeliveredToOffice: Math.round(data.cashDelivered * 100) / 100,
          hasDisputes: data.hasDisputes,
        };
      });

      // Sort by service value descending
      summaries.sort((a, b) => b.totalServiceValue - a.totalServiceValue);

      setCleanerSummaries(summaries);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyIds, period, excludeVisits]);

  const fetchCleanerDetails = useCallback(async (cleanerId: string): Promise<JobDetail[]> => {
    if (companyIds.length === 0) return [];

    let jobsQuery = supabase
      .from('jobs')
      .select(`
        id,
        scheduled_date,
        client_id,
        start_time,
        end_time,
        duration_minutes,
        payment_amount,
        payment_method,
        notes,
        job_type,
        clients(id, name)
      `)
      .eq('cleaner_id', cleanerId)
      .eq('status', 'completed')
      .gte('scheduled_date', period.startDate)
      .lte('scheduled_date', period.endDate)
      .order('scheduled_date', { ascending: false });

    // Apply company filter
    if (companyIds.length === 1) {
      jobsQuery = jobsQuery.eq('company_id', companyIds[0]);
    } else {
      jobsQuery = jobsQuery.in('company_id', companyIds);
    }

    // Apply visit filter based on company preferences
    if (excludeVisits) {
      jobsQuery = jobsQuery.neq('job_type', 'visit');
    }

    const { data: jobs, error } = await jobsQuery;

    if (error) {
      console.error('Error fetching cleaner details:', error);
      return [];
    }

    // Get cash collections for this cleaner
    let cashQuery = supabase
      .from('cash_collections')
      .select('job_id, cash_handling, compensation_status')
      .eq('cleaner_id', cleanerId);

    if (companyIds.length === 1) {
      cashQuery = cashQuery.eq('company_id', companyIds[0]);
    } else {
      cashQuery = cashQuery.in('company_id', companyIds);
    }

    const { data: cashData } = await cashQuery;

    const cashMap: Record<string, { handling: string; status: string }> = {};
    for (const c of cashData || []) {
      cashMap[c.job_id] = { handling: c.cash_handling, status: c.compensation_status };
    }

    return (jobs || []).map((job: any) => {
      const cashInfo = cashMap[job.id];
      
      // Calculate actual duration from start/end time if available
      let actualDuration: number | null = null;
      if (job.start_time && job.end_time) {
        const start = new Date(`2000-01-01T${job.start_time}`);
        const end = new Date(`2000-01-01T${job.end_time}`);
        actualDuration = (end.getTime() - start.getTime()) / (1000 * 60);
      }

      return {
        id: job.id,
        jobDate: job.scheduled_date,
        clientName: job.clients?.name || 'Unknown',
        clientId: job.client_id,
        plannedDuration: job.duration_minutes || 0,
        actualDuration,
        hoursWorked: (actualDuration || job.duration_minutes || 0) / 60,
        serviceAmount: job.payment_amount || 0,
        paymentMethod: job.payment_method,
        cashHandling: cashInfo?.handling || null,
        cashStatus: cashInfo?.status || null,
        notes: job.notes,
    };
    });
  }, [companyIds, period, excludeVisits]);

  const getExportData = useCallback(async () => {
    if (companyIds.length === 0) return [];

    let jobsQuery = supabase
      .from('jobs')
      .select(`
        id,
        scheduled_date,
        cleaner_id,
        client_id,
        duration_minutes,
        payment_amount,
        payment_method,
        notes,
        job_type,
        clients(name),
        cleaner:cleaner_id(first_name, last_name)
      `)
      .eq('status', 'completed')
      .gte('scheduled_date', period.startDate)
      .lte('scheduled_date', period.endDate)
      .order('scheduled_date', { ascending: false });

    // Apply company filter
    if (companyIds.length === 1) {
      jobsQuery = jobsQuery.eq('company_id', companyIds[0]);
    } else {
      jobsQuery = jobsQuery.in('company_id', companyIds);
    }

    // Apply visit filter based on company preferences
    if (excludeVisits) {
      jobsQuery = jobsQuery.neq('job_type', 'visit');
    }

    const { data: jobs } = await jobsQuery;

    let cashQuery = supabase
      .from('cash_collections')
      .select('job_id, amount, cash_handling, compensation_status');

    if (companyIds.length === 1) {
      cashQuery = cashQuery.eq('company_id', companyIds[0]);
    } else {
      cashQuery = cashQuery.in('company_id', companyIds);
    }

    const { data: cashData } = await cashQuery;

    let rolesQuery = supabase.from('user_roles').select('user_id, role');
    
    if (companyIds.length === 1) {
      rolesQuery = rolesQuery.eq('company_id', companyIds[0]);
    } else {
      rolesQuery = rolesQuery.in('company_id', companyIds);
    }

    const { data: userRoles } = await rolesQuery;

    const roleMap: Record<string, string> = {};
    for (const r of userRoles || []) {
      roleMap[r.user_id] = r.role;
    }

    const cashMap: Record<string, any> = {};
    for (const c of cashData || []) {
      cashMap[c.job_id] = c;
    }

    return (jobs || []).map((job: any) => {
      const cashInfo = cashMap[job.id];
      const cleanerName = job.cleaner 
        ? `${job.cleaner.first_name || ''} ${job.cleaner.last_name || ''}`.trim() 
        : 'Unknown';
      const role = job.cleaner_id ? (roleMap[job.cleaner_id] || 'staff') : 'staff';
      
      // If cash kept feature is disabled, don't show cash kept column
      const cashKeptValue = enableCashKept && cashInfo?.cash_handling === 'kept_by_cleaner'
        ? (cashInfo.amount || 0).toFixed(2)
        : '-';
      
      return {
        Date: job.scheduled_date,
        Employee: cleanerName,
        Role: role.charAt(0).toUpperCase() + role.slice(1),
        Client: job.clients?.name || 'Unknown',
        'Job ID': job.id.substring(0, 8),
        'Hours Worked': ((job.duration_minutes || 0) / 60).toFixed(2),
        'Gross Service Amount': (job.payment_amount || 0).toFixed(2),
        'Payment Method': job.payment_method || '-',
        'Cash Kept by Employee': cashKeptValue,
        'Cash Delivered to Office': cashInfo?.cash_handling === 'delivered_to_office' 
          ? (cashInfo.amount || 0).toFixed(2) 
          : '-',
        Status: cashInfo?.compensation_status || 'completed',
        Notes: job.notes || '',
      };
    });
  }, [companyIds, period, excludeVisits, enableCashKept]);

  useEffect(() => {
    if (companyIds.length > 0 && !prefsLoading) {
      fetchData();
    }
  }, [companyIds, fetchData, prefsLoading]);

  return {
    period,
    setPeriod,
    globalSummary,
    cleanerSummaries,
    isLoading: isLoading || prefsLoading,
    fetchData,
    fetchCleanerDetails,
    getExportData,
    // Expose preferences for UI conditional rendering
    enableCashKept,
  };
}
