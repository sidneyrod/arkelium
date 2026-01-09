import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PayPeriodType = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type PayrollStatus = 'pending' | 'in-progress' | 'approved' | 'paid';
export type CanadianProvince = 'ON' | 'QC' | 'BC' | 'AB' | 'MB' | 'SK' | 'NS' | 'NB' | 'NL' | 'PE' | 'NT' | 'YT' | 'NU';
export type EmploymentType = 'full-time' | 'part-time' | 'contract';

export interface EmployeePayrollSettings {
  hourlyRate: number;
  salary?: number;
  province: CanadianProvince;
  employmentType: EmploymentType;
  vacationPayPercent: number;
  customDeductions: { name: string; amount: number }[];
  customBenefits: { name: string; amount: number }[];
}

export interface EmployeePayrollEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  role: 'cleaner' | 'manager';
  regularHours: number;
  overtimeHours: number;
  hourlyRate: number;
  overtimeRate: number;
  bonus: number;
  deductions: number;
  holidayPay: number;
  vacationPay: number;
  grossPay: number;
  netPay: number;
  jobsCompleted: number;
  province: CanadianProvince;
}

export interface PayrollPeriod {
  id: string;
  periodType: PayPeriodType;
  startDate: string;
  endDate: string;
  status: PayrollStatus;
  province: CanadianProvince;
  entries: EmployeePayrollEntry[];
  totalGross: number;
  totalNet: number;
  totalHours: number;
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
}

export interface TaxConfiguration {
  year: number;
  cppEmployerRate: number;
  cppEmployeeRate: number;
  cppMaxContribution: number;
  eiEmployerRate: number;
  eiEmployeeRate: number;
  eiMaxContribution: number;
}

export interface CompanyPayrollSettings {
  payFrequency: PayPeriodType;
  primaryProvince: CanadianProvince;
  additionalProvinces: CanadianProvince[];
  vacationPayDefault: number;
  statutoryHolidayPayEnabled: boolean;
  taxConfig: TaxConfiguration;
}

// Canadian provincial overtime rules
export const provincialOvertimeRules: Record<CanadianProvince, { dailyThreshold: number; weeklyThreshold: number; overtimeMultiplier: number }> = {
  ON: { dailyThreshold: 24, weeklyThreshold: 44, overtimeMultiplier: 1.5 },
  QC: { dailyThreshold: 24, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  BC: { dailyThreshold: 8, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  AB: { dailyThreshold: 8, weeklyThreshold: 44, overtimeMultiplier: 1.5 },
  MB: { dailyThreshold: 24, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  SK: { dailyThreshold: 24, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  NS: { dailyThreshold: 24, weeklyThreshold: 48, overtimeMultiplier: 1.5 },
  NB: { dailyThreshold: 24, weeklyThreshold: 44, overtimeMultiplier: 1.5 },
  NL: { dailyThreshold: 24, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  PE: { dailyThreshold: 24, weeklyThreshold: 48, overtimeMultiplier: 1.5 },
  NT: { dailyThreshold: 8, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  YT: { dailyThreshold: 8, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
  NU: { dailyThreshold: 24, weeklyThreshold: 40, overtimeMultiplier: 1.5 },
};

export const provinceNames: Record<CanadianProvince, string> = {
  ON: 'Ontario',
  QC: 'Quebec',
  BC: 'British Columbia',
  AB: 'Alberta',
  MB: 'Manitoba',
  SK: 'Saskatchewan',
  NS: 'Nova Scotia',
  NB: 'New Brunswick',
  NL: 'Newfoundland & Labrador',
  PE: 'Prince Edward Island',
  NT: 'Northwest Territories',
  YT: 'Yukon',
  NU: 'Nunavut',
};

const defaultTaxConfig: TaxConfiguration = {
  year: new Date().getFullYear(),
  cppEmployerRate: 5.95,
  cppEmployeeRate: 5.95,
  cppMaxContribution: 3867.50,
  eiEmployerRate: 2.21,
  eiEmployeeRate: 1.58,
  eiMaxContribution: 1049.12,
};

const defaultCompanyPayrollSettings: CompanyPayrollSettings = {
  payFrequency: 'biweekly',
  primaryProvince: 'ON',
  additionalProvinces: [],
  vacationPayDefault: 4,
  statutoryHolidayPayEnabled: true,
  taxConfig: defaultTaxConfig,
};

interface PayrollState {
  periods: PayrollPeriod[];
  companySettings: CompanyPayrollSettings;
  defaultPayPeriod: PayPeriodType;
  defaultProvince: CanadianProvince;
  setDefaultPayPeriod: (period: PayPeriodType) => void;
  setDefaultProvince: (province: CanadianProvince) => void;
  updateCompanySettings: (settings: Partial<CompanyPayrollSettings>) => void;
  updateTaxConfig: (config: Partial<TaxConfiguration>) => void;
  addPeriod: (period: Omit<PayrollPeriod, 'id' | 'createdAt'>) => void;
  updatePeriod: (id: string, updates: Partial<PayrollPeriod>) => void;
  deletePeriod: (id: string) => void;
  approvePeriod: (id: string) => void;
  markAsPaid: (id: string) => void;
  updateEntry: (periodId: string, entryId: string, updates: Partial<EmployeePayrollEntry>) => void;
  runPayroll: (startDate: string, endDate: string, entries: EmployeePayrollEntry[]) => string;
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set, get) => ({
      periods: [],
      companySettings: defaultCompanyPayrollSettings,
      defaultPayPeriod: 'biweekly',
      defaultProvince: 'ON',
      
      setDefaultPayPeriod: (period) => set({ defaultPayPeriod: period }),
      setDefaultProvince: (province) => set({ defaultProvince: province }),
      
      updateCompanySettings: (settings) => set((state) => ({
        companySettings: { ...state.companySettings, ...settings }
      })),

      updateTaxConfig: (config) => set((state) => ({
        companySettings: { 
          ...state.companySettings, 
          taxConfig: { ...state.companySettings.taxConfig, ...config }
        }
      })),
      
      addPeriod: (period) => set((state) => ({
        periods: [...state.periods, { 
          ...period, 
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString()
        }]
      })),
      
      updatePeriod: (id, updates) => set((state) => ({
        periods: state.periods.map((p) => p.id === id ? { ...p, ...updates } : p)
      })),
      
      deletePeriod: (id) => set((state) => ({
        periods: state.periods.filter((p) => p.id !== id)
      })),
      
      approvePeriod: (id) => set((state) => ({
        periods: state.periods.map((p) => 
          p.id === id ? { ...p, status: 'approved', approvedAt: new Date().toISOString() } : p
        )
      })),
      
      markAsPaid: (id) => set((state) => ({
        periods: state.periods.map((p) => 
          p.id === id ? { ...p, status: 'paid', paidAt: new Date().toISOString() } : p
        )
      })),
      
      updateEntry: (periodId, entryId, updates) => set((state) => ({
        periods: state.periods.map((p) => {
          if (p.id !== periodId) return p;
          const updatedEntries = p.entries.map((e) => e.id === entryId ? { ...e, ...updates } : e);
          const totalGross = updatedEntries.reduce((sum, e) => sum + e.grossPay, 0);
          const totalNet = updatedEntries.reduce((sum, e) => sum + e.netPay, 0);
          const totalHours = updatedEntries.reduce((sum, e) => sum + e.regularHours + e.overtimeHours, 0);
          return { ...p, entries: updatedEntries, totalGross, totalNet, totalHours };
        })
      })),

      runPayroll: (startDate, endDate, entries) => {
        const state = get();
        const { companySettings } = state;
        
        const totalGross = entries.reduce((sum, e) => sum + e.grossPay, 0);
        const totalNet = entries.reduce((sum, e) => sum + e.netPay, 0);
        const totalHours = entries.reduce((sum, e) => sum + e.regularHours + e.overtimeHours, 0);
        
        const periodId = crypto.randomUUID();
        
        set((state) => ({
          periods: [...state.periods, {
            id: periodId,
            periodType: companySettings.payFrequency,
            startDate,
            endDate,
            status: 'pending',
            province: companySettings.primaryProvince,
            entries,
            totalGross,
            totalNet,
            totalHours,
            createdAt: new Date().toISOString(),
          }]
        }));
        
        return periodId;
      },
    }),
    { name: 'payroll-store' }
  )
);
