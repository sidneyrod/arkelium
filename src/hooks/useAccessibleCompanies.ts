import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface AccessibleCompany {
  id: string;
  company_code: number;
  trade_name: string;
  status: string;
}

interface UseAccessibleCompaniesReturn {
  companies: AccessibleCompany[];
  activeCompanies: AccessibleCompany[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getDefaultCompanyId: () => string | null;
}

/**
 * Hook to fetch all companies the current user has access to via user_roles.
 * Returns companies where the user has an active role.
 */
export function useAccessibleCompanies(): UseAccessibleCompaniesReturn {
  const { user, isSuperAdmin } = useAuth();
  const [companies, setCompanies] = useState<AccessibleCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    if (!user?.id) {
      setCompanies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Super admins can see all companies
      if (isSuperAdmin) {
        const { data, error: fetchError } = await supabase
          .from('companies')
          .select('id, company_code, trade_name, status')
          .neq('status', 'archived')
          .order('company_code', { ascending: true });

        if (fetchError) throw fetchError;
        setCompanies(data || []);
      } else {
        // Regular users: fetch companies where they have an active role
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('status', 'active');

        if (rolesError) throw rolesError;

        if (!rolesData || rolesData.length === 0) {
          // Fallback to profile company if no roles
          if (user.profile?.company_id) {
            const { data, error: fetchError } = await supabase
              .from('companies')
              .select('id, company_code, trade_name, status')
              .eq('id', user.profile.company_id)
              .neq('status', 'archived')
              .single();

            if (!fetchError && data) {
              setCompanies([data]);
            } else {
              setCompanies([]);
            }
          } else {
            setCompanies([]);
          }
        } else {
          const companyIds = rolesData.map(r => r.company_id);
          
          const { data, error: fetchError } = await supabase
            .from('companies')
            .select('id, company_code, trade_name, status')
            .in('id', companyIds)
            .neq('status', 'archived')
            .order('company_code', { ascending: true });

          if (fetchError) throw fetchError;
          setCompanies(data || []);
        }
      }
    } catch (err: any) {
      console.error('Error fetching accessible companies:', err);
      setError(err.message || 'Failed to fetch companies');
      setCompanies([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.profile?.company_id, isSuperAdmin]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Get only active companies (status = 'active')
  const activeCompanies = companies.filter(c => c.status === 'active');

  // Returns the default company ID (user's profile company or first accessible)
  const getDefaultCompanyId = useCallback((): string | null => {
    if (!companies.length) return null;
    
    // Prefer user's profile company
    const profileCompany = companies.find(c => c.id === user?.profile?.company_id);
    if (profileCompany) return profileCompany.id;
    
    // Otherwise first active company
    const firstActive = activeCompanies[0];
    if (firstActive) return firstActive.id;
    
    // Fallback to first company
    return companies[0]?.id || null;
  }, [companies, activeCompanies, user?.profile?.company_id]);

  return {
    companies,
    activeCompanies,
    isLoading,
    error,
    refetch: fetchCompanies,
    getDefaultCompanyId,
  };
}

export default useAccessibleCompanies;

