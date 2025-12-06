import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompanyProfile {
  companyName: string;
  legalName: string;
  address: string;
  province: string;
  city: string;
  postalCode: string;
  email: string;
  phone: string;
  website: string;
  businessNumber: string;
  gstHstNumber: string;
}

export interface CompanyBranding {
  logoUrl: string | null;
  primaryColor: string;
}

export interface ExtraFee {
  id: string;
  name: string;
  amount: number;
  isActive: boolean;
}

export interface ChecklistItem {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface EstimateConfiguration {
  defaultHourlyRate: number;
  taxRate: number;
  overtimeRate: number;
  holidayRate: number;
  extraFees: ExtraFee[];
}

export interface ScheduleConfiguration {
  checklistItems: ChecklistItem[];
}

interface CompanyStore {
  profile: CompanyProfile;
  branding: CompanyBranding;
  estimateConfig: EstimateConfiguration;
  scheduleConfig: ScheduleConfiguration;
  updateProfile: (profile: Partial<CompanyProfile>) => void;
  updateBranding: (branding: Partial<CompanyBranding>) => void;
  updateEstimateConfig: (config: Partial<EstimateConfiguration>) => void;
  updateScheduleConfig: (config: Partial<ScheduleConfiguration>) => void;
  // Extra Fees CRUD
  addExtraFee: (fee: Omit<ExtraFee, 'id'>) => void;
  updateExtraFee: (id: string, fee: Partial<ExtraFee>) => void;
  deleteExtraFee: (id: string) => void;
  // Checklist Items CRUD
  addChecklistItem: (item: Omit<ChecklistItem, 'id' | 'order'>) => void;
  updateChecklistItem: (id: string, item: Partial<ChecklistItem>) => void;
  deleteChecklistItem: (id: string) => void;
  reorderChecklistItems: (items: ChecklistItem[]) => void;
  // Legacy fee getters for backward compatibility
  petsFee: number;
  childrenFee: number;
  greenCleaningFee: number;
  cleanFridgeFee: number;
  cleanOvenFee: number;
  cleanCabinetsFee: number;
  cleanWindowsFee: number;
}

const defaultProfile: CompanyProfile = {
  companyName: 'TidyOut Cleaning Services',
  legalName: 'TidyOut Inc.',
  address: '123 Business Street',
  province: 'Ontario',
  city: 'Toronto',
  postalCode: 'M5V 1A1',
  email: 'contact@tidyout.com',
  phone: '(416) 555-0100',
  website: 'www.tidyout.com',
  businessNumber: '123456789',
  gstHstNumber: 'RT0001',
};

const defaultBranding: CompanyBranding = {
  logoUrl: null,
  primaryColor: '#1a3d2e',
};

const defaultExtraFees: ExtraFee[] = [
  { id: '1', name: 'Pets Fee', amount: 15, isActive: true },
  { id: '2', name: 'Children Fee', amount: 10, isActive: true },
  { id: '3', name: 'Green Cleaning Fee', amount: 20, isActive: true },
  { id: '4', name: 'Clean Fridge Fee', amount: 25, isActive: true },
  { id: '5', name: 'Clean Oven Fee', amount: 30, isActive: true },
  { id: '6', name: 'Clean Cabinets Fee', amount: 40, isActive: true },
  { id: '7', name: 'Clean Windows Fee', amount: 35, isActive: true },
];

const defaultChecklistItems: ChecklistItem[] = [
  { id: '1', name: 'Vacuum floors', order: 1, isActive: true },
  { id: '2', name: 'Mop floors', order: 2, isActive: true },
  { id: '3', name: 'Dust surfaces', order: 3, isActive: true },
  { id: '4', name: 'Clean bathrooms', order: 4, isActive: true },
  { id: '5', name: 'Clean kitchen', order: 5, isActive: true },
  { id: '6', name: 'Empty trash', order: 6, isActive: true },
  { id: '7', name: 'Wipe mirrors', order: 7, isActive: true },
  { id: '8', name: 'Make beds', order: 8, isActive: true },
];

const defaultEstimateConfig: EstimateConfiguration = {
  defaultHourlyRate: 45,
  taxRate: 13,
  overtimeRate: 67.5,
  holidayRate: 90,
  extraFees: defaultExtraFees,
};

const defaultScheduleConfig: ScheduleConfiguration = {
  checklistItems: defaultChecklistItems,
};

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      branding: defaultBranding,
      estimateConfig: defaultEstimateConfig,
      scheduleConfig: defaultScheduleConfig,
      
      // Legacy fee getters
      get petsFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Pets Fee')?.amount || 15;
      },
      get childrenFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Children Fee')?.amount || 10;
      },
      get greenCleaningFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Green Cleaning Fee')?.amount || 20;
      },
      get cleanFridgeFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Clean Fridge Fee')?.amount || 25;
      },
      get cleanOvenFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Clean Oven Fee')?.amount || 30;
      },
      get cleanCabinetsFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Clean Cabinets Fee')?.amount || 40;
      },
      get cleanWindowsFee() {
        return get().estimateConfig.extraFees.find(f => f.name === 'Clean Windows Fee')?.amount || 35;
      },

      updateProfile: (profile) =>
        set((state) => ({ profile: { ...state.profile, ...profile } })),
      updateBranding: (branding) =>
        set((state) => ({ branding: { ...state.branding, ...branding } })),
      updateEstimateConfig: (config) =>
        set((state) => ({ estimateConfig: { ...state.estimateConfig, ...config } })),
      updateScheduleConfig: (config) =>
        set((state) => ({ scheduleConfig: { ...state.scheduleConfig, ...config } })),
      
      // Extra Fees CRUD
      addExtraFee: (fee) =>
        set((state) => ({
          estimateConfig: {
            ...state.estimateConfig,
            extraFees: [...state.estimateConfig.extraFees, { ...fee, id: crypto.randomUUID() }],
          },
        })),
      updateExtraFee: (id, fee) =>
        set((state) => ({
          estimateConfig: {
            ...state.estimateConfig,
            extraFees: state.estimateConfig.extraFees.map((f) =>
              f.id === id ? { ...f, ...fee } : f
            ),
          },
        })),
      deleteExtraFee: (id) =>
        set((state) => ({
          estimateConfig: {
            ...state.estimateConfig,
            extraFees: state.estimateConfig.extraFees.filter((f) => f.id !== id),
          },
        })),
      
      // Checklist Items CRUD
      addChecklistItem: (item) =>
        set((state) => {
          const maxOrder = Math.max(...state.scheduleConfig.checklistItems.map((i) => i.order), 0);
          return {
            scheduleConfig: {
              ...state.scheduleConfig,
              checklistItems: [
                ...state.scheduleConfig.checklistItems,
                { ...item, id: crypto.randomUUID(), order: maxOrder + 1 },
              ],
            },
          };
        }),
      updateChecklistItem: (id, item) =>
        set((state) => ({
          scheduleConfig: {
            ...state.scheduleConfig,
            checklistItems: state.scheduleConfig.checklistItems.map((i) =>
              i.id === id ? { ...i, ...item } : i
            ),
          },
        })),
      deleteChecklistItem: (id) =>
        set((state) => ({
          scheduleConfig: {
            ...state.scheduleConfig,
            checklistItems: state.scheduleConfig.checklistItems.filter((i) => i.id !== id),
          },
        })),
      reorderChecklistItems: (items) =>
        set((state) => ({
          scheduleConfig: {
            ...state.scheduleConfig,
            checklistItems: items,
          },
        })),
    }),
    {
      name: 'company-store',
    }
  )
);