import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Company {
  id: string;
  company_code: number;
  trade_name: string;
}

interface ActiveCompanyState {
  activeCompanyId: string | null;
  activeCompanyCode: number | null;
  activeCompanyName: string | null;
  companies: Company[];
  setActiveCompany: (id: string, code: number, name: string) => void;
  setCompanies: (companies: Company[]) => void;
  clearActiveCompany: () => void;
}

export const useActiveCompanyStore = create<ActiveCompanyState>()(
  persist(
    (set) => ({
      activeCompanyId: null,
      activeCompanyCode: null,
      activeCompanyName: null,
      companies: [],
      setActiveCompany: (id, code, name) => set({
        activeCompanyId: id,
        activeCompanyCode: code,
        activeCompanyName: name,
      }),
      setCompanies: (companies) => set({ companies }),
      clearActiveCompany: () => set({
        activeCompanyId: null,
        activeCompanyCode: null,
        activeCompanyName: null,
      }),
    }),
    {
      name: 'active-company-storage',
    }
  )
);
