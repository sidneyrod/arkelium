import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { logAuditEntry } from '@/hooks/useAuditLog';
import { notifyPayrollGenerated, notifyPaystubAvailable } from '@/hooks/useNotifications';

export interface PayrollPeriod {
  id: string;
  company_id: string;
  period_name: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'paid';
  pay_date: string | null;
  total_hours: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  approved_by: string | null;
  approved_at: string | null;
  notification_sent: boolean;
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PayrollEntry {
  id: string;
  period_id: string;
  company_id: string;
  employee_id: string;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number | null;
  gross_pay: number;
  cpp_deduction: number;
  ei_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  net_pay: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    hourly_rate: number | null;
    employment_type: string | null;
    primary_province: string | null;
  };
}

export interface TaxConfig {
  id: string;
  company_id: string;
  year: number;
  cpp_employee_rate: number;
  cpp_employer_rate: number;
  cpp_max_contribution: number;
  ei_employee_rate: number;
  ei_employer_rate: number;
  ei_max_contribution: number;
}

export function usePayroll() {
  const { user } = useAuth();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch company ID
  const getCompanyId = useCallback(async () => {
    if (!user) return null;
    // Try getting from user profile first
    if (user.profile?.company_id) {
      return user.profile.company_id;
    }
    // Fallback to database query
    const { data } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();
    return data?.company_id;
  }, [user]);

  // Fetch all payroll periods
  const fetchPeriods = useCallback(async () => {
    const companyId = await getCompanyId();
    if (!companyId) return;

    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .eq('company_id', companyId)
      .order('end_date', { ascending: false });

    if (error) {
      console.error('Error fetching payroll periods:', error);
      return;
    }

    const typedData = (data || []).map(p => ({
      ...p,
      status: p.status as 'pending' | 'approved' | 'paid',
    }));
    setPeriods(typedData);
    
    // Find current pending period
    const pending = typedData.find(p => p.status === 'pending');
    setCurrentPeriod(pending || null);
  }, [getCompanyId]);

  // Fetch entries for a period
  const fetchEntries = useCallback(async (periodId: string) => {
    const companyId = await getCompanyId();
    if (!companyId) return;

    const { data, error } = await supabase
      .from('payroll_entries')
      .select(`
        *,
        employee:profiles!payroll_entries_employee_id_fkey (
          id, first_name, last_name, hourly_rate, employment_type, primary_province
        )
      `)
      .eq('period_id', periodId);

    if (error) {
      console.error('Error fetching payroll entries:', error);
      return;
    }

    setEntries(data || []);
  }, [getCompanyId]);

  // Fetch employees for payroll generation
  const fetchEmployees = useCallback(async () => {
    const companyId = await getCompanyId();
    if (!companyId) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, hourly_rate, employment_type, primary_province')
      .eq('company_id', companyId);

    if (error) {
      console.error('Error fetching employees:', error);
      return;
    }

    setEmployees(data || []);
  }, [getCompanyId]);

  // Fetch tax configuration
  const fetchTaxConfig = useCallback(async () => {
    const companyId = await getCompanyId();
    if (!companyId) return;

    const currentYear = new Date().getFullYear();
    const { data, error } = await supabase
      .from('tax_configurations')
      .select('*')
      .eq('company_id', companyId)
      .eq('year', currentYear)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tax config:', error);
      return;
    }

    setTaxConfig(data);
  }, [getCompanyId]);

  // Generate new payroll period
  const generatePayrollPeriod = useCallback(async (startDate: string, endDate: string) => {
    setIsGenerating(true);
    try {
      const companyId = await getCompanyId();
      if (!companyId) throw new Error('Company not found');

      // Create period
      const periodName = `${startDate} - ${endDate}`;
      const { data: period, error: periodError } = await supabase
        .from('payroll_periods')
        .insert({
          company_id: companyId,
          period_name: periodName,
          start_date: startDate,
          end_date: endDate,
          status: 'pending',
          total_hours: 0,
          total_gross: 0,
          total_deductions: 0,
          total_net: 0,
        })
        .select()
        .single();

      if (periodError) throw periodError;

      // Fetch completed jobs in this period to calculate hours
      const { data: jobs } = await supabase
        .from('jobs')
        .select('cleaner_id, duration_minutes')
        .eq('company_id', companyId)
        .eq('status', 'completed')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      // Group hours by employee
      const employeeHours: Record<string, number> = {};
      for (const job of jobs || []) {
        if (job.cleaner_id) {
          const hours = (job.duration_minutes || 0) / 60;
          employeeHours[job.cleaner_id] = (employeeHours[job.cleaner_id] || 0) + hours;
        }
      }

      // Get employee details and create entries
      const { data: employeeData } = await supabase
        .from('profiles')
        .select('id, hourly_rate')
        .eq('company_id', companyId)
        .in('id', Object.keys(employeeHours));

      let totalHours = 0;
      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      const entriesData = [];
      for (const emp of employeeData || []) {
        const hours = employeeHours[emp.id] || 0;
        const rate = emp.hourly_rate || 15;
        const grossPay = hours * rate;
        
        // Calculate deductions (simplified)
        const cppRate = taxConfig?.cpp_employee_rate || 5.95;
        const eiRate = taxConfig?.ei_employee_rate || 1.58;
        const cppDeduction = Math.min(grossPay * (cppRate / 100), taxConfig?.cpp_max_contribution || 3867.50);
        const eiDeduction = Math.min(grossPay * (eiRate / 100), taxConfig?.ei_max_contribution || 1049.12);
        const taxDeduction = grossPay * 0.15; // Simplified tax
        const totalDed = cppDeduction + eiDeduction + taxDeduction;
        const netPay = grossPay - totalDed;

        totalHours += hours;
        totalGross += grossPay;
        totalDeductions += totalDed;
        totalNet += netPay;

        entriesData.push({
          period_id: period.id,
          company_id: companyId,
          employee_id: emp.id,
          regular_hours: hours,
          overtime_hours: 0,
          hourly_rate: rate,
          gross_pay: grossPay,
          cpp_deduction: cppDeduction,
          ei_deduction: eiDeduction,
          tax_deduction: taxDeduction,
          other_deductions: 0,
          net_pay: netPay,
        });
      }

      // Insert entries
      if (entriesData.length > 0) {
        const { error: entriesError } = await supabase
          .from('payroll_entries')
          .insert(entriesData);

        if (entriesError) throw entriesError;
      }

      // Update period totals
      await supabase
        .from('payroll_periods')
        .update({
          total_hours: totalHours,
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
        })
        .eq('id', period.id);

      // Notify admin about the generated payroll
      await notifyPayrollGenerated(periodName, period.id);

      toast({ title: 'Success', description: 'Payroll period generated successfully' });
      await fetchPeriods();
      return period;
    } catch (error: any) {
      console.error('Error generating payroll:', error);
      toast({ title: 'Error', description: 'Failed to generate payroll: ' + error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [getCompanyId, taxConfig, fetchPeriods]);

  // Approve period
  const approvePeriod = useCallback(async (periodId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('payroll_periods')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', periodId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to approve payroll', variant: 'destructive' });
      return;
    }

    // Log audit
    await logAuditEntry({
      action: 'payroll_approved',
      entityType: 'payroll_period',
      entityId: periodId,
      details: { description: 'Payroll period approved' },
    }, user.id, user.companyId || undefined);

    toast({ title: 'Success', description: 'Payroll approved successfully' });
    await fetchPeriods();
  }, [user, fetchPeriods]);

  // Check if period can be reprocessed (NOT if already paid)
  const canReprocessPeriod = useCallback(async (periodId: string): Promise<{ canReprocess: boolean; message?: string }> => {
    const period = periods.find(p => p.id === periodId);
    
    if (!period) {
      return { canReprocess: false, message: 'Period not found' };
    }
    
    if (period.status === 'paid') {
      return { 
        canReprocess: false, 
        message: 'Este período de payroll já foi pago. Apenas administradores podem reprocessar e isso será registrado no log de auditoria.' 
      };
    }
    
    return { canReprocess: true };
  }, [periods]);

  // Force reprocess (admin only) - logs audit entry
  const forceReprocessPeriod = useCallback(async (periodId: string, reason: string) => {
    if (!user) return false;

    // Check if period was paid
    const period = periods.find(p => p.id === periodId);
    if (!period) return false;

    // Log audit entry for reprocessing
    await logAuditEntry({
      action: 'payroll_reprocessed',
      entityType: 'payroll_period',
      entityId: periodId,
      details: {
        description: `Payroll period reprocessed by admin`,
        reason,
        previousStatus: period.status,
        previousTotalNet: period.total_net,
        timestamp: new Date().toISOString(),
      },
    }, user.id, user.companyId || undefined);

    toast({ title: 'Warning', description: 'Payroll reprocess logged for audit', variant: 'default' });
    return true;
  }, [user, periods]);

  // Mark as paid
  const markAsPaid = useCallback(async (periodId: string, payDate?: string) => {
    const { error } = await supabase
      .from('payroll_periods')
      .update({
        status: 'paid',
        pay_date: payDate || new Date().toISOString().split('T')[0],
      })
      .eq('id', periodId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to mark as paid', variant: 'destructive' });
      return;
    }

    // Notify each cleaner about their paystub
    const period = periods.find(p => p.id === periodId);
    if (period) {
      // Fetch entries for this period to notify cleaners
      const { data: entriesData } = await supabase
        .from('payroll_entries')
        .select('employee_id, net_pay')
        .eq('period_id', periodId);
      
      if (entriesData) {
        for (const entry of entriesData) {
          await notifyPaystubAvailable(
            entry.employee_id,
            period.period_name,
            entry.net_pay || 0,
            periodId
          );
        }
      }
    }

    toast({ title: 'Success', description: 'Payroll marked as paid' });
    await fetchPeriods();
  }, [fetchPeriods, periods]);

  // Check for period end notifications
  const checkPeriodNotifications = useCallback(async () => {
    if (!currentPeriod) return null;
    
    const today = new Date().toISOString().split('T')[0];
    const periodEnded = currentPeriod.end_date < today;
    
    return {
      periodEnded,
      needsAction: periodEnded && currentPeriod.status === 'pending',
      daysOverdue: periodEnded 
        ? Math.floor((new Date().getTime() - new Date(currentPeriod.end_date).getTime()) / 86400000)
        : 0,
    };
  }, [currentPeriod]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchPeriods(),
        fetchEmployees(),
        fetchTaxConfig(),
      ]);
      setIsLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user, fetchPeriods, fetchEmployees, fetchTaxConfig]);

  // Fetch entries when current period changes
  useEffect(() => {
    if (currentPeriod) {
      fetchEntries(currentPeriod.id);
    }
  }, [currentPeriod, fetchEntries]);

  return {
    periods,
    currentPeriod,
    entries,
    employees,
    taxConfig,
    isLoading,
    isGenerating,
    fetchPeriods,
    fetchEntries,
    generatePayrollPeriod,
    approvePeriod,
    markAsPaid,
    checkPeriodNotifications,
    canReprocessPeriod,
    forceReprocessPeriod,
  };
}
