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

export interface EstimateConfiguration {
  defaultHourlyRate: number;
  petsFee: number;
  childrenFee: number;
  greenCleaningFee: number;
  cleanFridgeFee: number;
  cleanOvenFee: number;
  cleanCabinetsFee: number;
  cleanWindowsFee: number;
  taxRate: number;
  overtimeRate: number;
  holidayRate: number;
}

interface CompanyStore {
  profile: CompanyProfile;
  branding: CompanyBranding;
  estimateConfig: EstimateConfiguration;
  updateProfile: (profile: Partial<CompanyProfile>) => void;
  updateBranding: (branding: Partial<CompanyBranding>) => void;
  updateEstimateConfig: (config: Partial<EstimateConfiguration>) => void;
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

const defaultEstimateConfig: EstimateConfiguration = {
  defaultHourlyRate: 45,
  petsFee: 15,
  childrenFee: 10,
  greenCleaningFee: 20,
  cleanFridgeFee: 25,
  cleanOvenFee: 30,
  cleanCabinetsFee: 40,
  cleanWindowsFee: 35,
  taxRate: 13,
  overtimeRate: 67.5,
  holidayRate: 90,
};

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set) => ({
      profile: defaultProfile,
      branding: defaultBranding,
      estimateConfig: defaultEstimateConfig,
      updateProfile: (profile) =>
        set((state) => ({ profile: { ...state.profile, ...profile } })),
      updateBranding: (branding) =>
        set((state) => ({ branding: { ...state.branding, ...branding } })),
      updateEstimateConfig: (config) =>
        set((state) => ({ estimateConfig: { ...state.estimateConfig, ...config } })),
    }),
    {
      name: 'company-store',
    }
  )
);
