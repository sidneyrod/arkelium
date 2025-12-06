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
  role: 'cleaner' | 'supervisor' | 'manager';
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

export interface CompanyPayrollSettings {
  payFrequency: PayPeriodType;
  primaryProvince: CanadianProvince;
  additionalProvinces: CanadianProvince[];
  cppEmployerContribution: number;
  eiEmployerContribution: number;
  vacationPayDefault: number;
  statutoryHolidayPayEnabled: boolean;
}

// Canadian provincial overtime rules (hours before overtime kicks in)
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

// Canadian statutory holidays by province
export const provincialHolidays: Record<CanadianProvince, string[]> = {
  ON: ['New Year\'s Day', 'Family Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Labour Day', 'Thanksgiving', 'Christmas Day', 'Boxing Day'],
  QC: ['New Year\'s Day', 'Good Friday', 'Easter Monday', 'Victoria Day', 'St-Jean-Baptiste', 'Canada Day', 'Labour Day', 'Thanksgiving', 'Christmas Day'],
  BC: ['New Year\'s Day', 'Family Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'BC Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  AB: ['New Year\'s Day', 'Family Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Heritage Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  MB: ['New Year\'s Day', 'Louis Riel Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Terry Fox Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  SK: ['New Year\'s Day', 'Family Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Saskatchewan Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  NS: ['New Year\'s Day', 'Heritage Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  NB: ['New Year\'s Day', 'Family Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'New Brunswick Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  NL: ['New Year\'s Day', 'St. Patrick\'s Day', 'Good Friday', 'St. George\'s Day', 'Victoria Day', 'Canada Day', 'Orangemen\'s Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  PE: ['New Year\'s Day', 'Islander Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  NT: ['New Year\'s Day', 'Good Friday', 'Victoria Day', 'National Indigenous Peoples Day', 'Canada Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  YT: ['New Year\'s Day', 'Heritage Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Discovery Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
  NU: ['New Year\'s Day', 'Good Friday', 'Victoria Day', 'Canada Day', 'Nunavut Day', 'Labour Day', 'Thanksgiving', 'Remembrance Day', 'Christmas Day'],
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

const defaultCompanyPayrollSettings: CompanyPayrollSettings = {
  payFrequency: 'biweekly',
  primaryProvince: 'ON',
  additionalProvinces: [],
  cppEmployerContribution: 5.95,
  eiEmployerContribution: 2.21,
  vacationPayDefault: 4,
  statutoryHolidayPayEnabled: true,
};

interface PayrollState {
  periods: PayrollPeriod[];
  companySettings: CompanyPayrollSettings;
  defaultPayPeriod: PayPeriodType;
  defaultProvince: CanadianProvince;
  setDefaultPayPeriod: (period: PayPeriodType) => void;
  setDefaultProvince: (province: CanadianProvince) => void;
  updateCompanySettings: (settings: Partial<CompanyPayrollSettings>) => void;
  addPeriod: (period: Omit<PayrollPeriod, 'id' | 'createdAt'>) => void;
  updatePeriod: (id: string, updates: Partial<PayrollPeriod>) => void;
  deletePeriod: (id: string) => void;
  approvePeriod: (id: string) => void;
  markAsPaid: (id: string) => void;
  updateEntry: (periodId: string, entryId: string, updates: Partial<EmployeePayrollEntry>) => void;
}

export const usePayrollStore = create<PayrollState>()(
  persist(
    (set) => ({
      periods: [
        {
          id: '1',
          periodType: 'biweekly',
          startDate: '2024-12-01',
          endDate: '2024-12-15',
          status: 'pending',
          province: 'ON',
          entries: [
            { id: '1', employeeId: '1', employeeName: 'Maria Garcia', role: 'cleaner', regularHours: 80, overtimeHours: 8, hourlyRate: 22, overtimeRate: 33, bonus: 150, deductions: 320, holidayPay: 0, vacationPay: 100, grossPay: 2500, netPay: 2180, jobsCompleted: 24, province: 'ON' },
            { id: '2', employeeId: '2', employeeName: 'Ana Rodriguez', role: 'cleaner', regularHours: 76, overtimeHours: 4, hourlyRate: 20, overtimeRate: 30, bonus: 100, deductions: 290, holidayPay: 0, vacationPay: 90, grossPay: 2250, netPay: 1960, jobsCompleted: 22, province: 'ON' },
            { id: '3', employeeId: '3', employeeName: 'John Davis', role: 'supervisor', regularHours: 80, overtimeHours: 12, hourlyRate: 28, overtimeRate: 42, bonus: 200, deductions: 380, holidayPay: 0, vacationPay: 117, grossPay: 2920, netPay: 2540, jobsCompleted: 18, province: 'ON' },
            { id: '4', employeeId: '4', employeeName: 'Sophie Martin', role: 'cleaner', regularHours: 60, overtimeHours: 0, hourlyRate: 20, overtimeRate: 30, bonus: 0, deductions: 220, holidayPay: 0, vacationPay: 60, grossPay: 1500, netPay: 1280, jobsCompleted: 15, province: 'QC' },
            { id: '5', employeeId: '5', employeeName: 'David Chen', role: 'manager', regularHours: 80, overtimeHours: 0, hourlyRate: 35, overtimeRate: 52.5, bonus: 0, deductions: 350, holidayPay: 0, vacationPay: 112, grossPay: 2400, netPay: 2050, jobsCompleted: 0, province: 'ON' },
          ],
          totalGross: 11570,
          totalNet: 10010,
          totalHours: 400,
          createdAt: '2024-12-01T00:00:00Z',
        },
        {
          id: '2',
          periodType: 'biweekly',
          startDate: '2024-11-16',
          endDate: '2024-11-30',
          status: 'paid',
          province: 'ON',
          entries: [
            { id: '1', employeeId: '1', employeeName: 'Maria Garcia', role: 'cleaner', regularHours: 80, overtimeHours: 6, hourlyRate: 22, overtimeRate: 33, bonus: 100, deductions: 310, holidayPay: 0, vacationPay: 98, grossPay: 2458, netPay: 2148, jobsCompleted: 22, province: 'ON' },
            { id: '2', employeeId: '2', employeeName: 'Ana Rodriguez', role: 'cleaner', regularHours: 80, overtimeHours: 0, hourlyRate: 20, overtimeRate: 30, bonus: 50, deductions: 280, holidayPay: 0, vacationPay: 66, grossPay: 1650, netPay: 1370, jobsCompleted: 20, province: 'ON' },
          ],
          totalGross: 4108,
          totalNet: 3518,
          totalHours: 166,
          createdAt: '2024-11-16T00:00:00Z',
          approvedAt: '2024-11-29T10:00:00Z',
          paidAt: '2024-12-01T09:00:00Z',
        },
      ],
      companySettings: defaultCompanyPayrollSettings,
      defaultPayPeriod: 'biweekly',
      defaultProvince: 'ON',
      
      setDefaultPayPeriod: (period) => set({ defaultPayPeriod: period }),
      setDefaultProvince: (province) => set({ defaultProvince: province }),
      
      updateCompanySettings: (settings) => set((state) => ({
        companySettings: { ...state.companySettings, ...settings }
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
    }),
    { name: 'payroll-store' }
  )
);
