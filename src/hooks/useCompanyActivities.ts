import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyStore } from "@/stores/activeCompanyStore";

export interface CompanyActivity {
  id: string;
  company_id: string;
  activity_code: string;
  activity_label: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// Standard activity codes (suggestions for new companies)
export const ACTIVITY_CODES = {
  cleaning: { code: 'cleaning', label: 'Cleaning Services' },
  snow_removal: { code: 'snow_removal', label: 'Snow Removal' },
  landscaping: { code: 'landscaping', label: 'Landscaping' },
  hvac: { code: 'hvac', label: 'HVAC Services' },
  maintenance: { code: 'maintenance', label: 'Maintenance Services' },
  inspection: { code: 'inspection', label: 'Inspection / Assessment' },
} as const;

export type ActivityCode = keyof typeof ACTIVITY_CODES;

export function useCompanyActivities(companyId?: string) {
  const { activeCompanyId } = useActiveCompanyStore();
  const targetCompanyId = companyId || activeCompanyId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['company-activities', targetCompanyId],
    queryFn: async () => {
      if (!targetCompanyId) return [];

      const { data, error } = await supabase
        .from('company_activities')
        .select('*')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      return data as CompanyActivity[];
    },
    enabled: !!targetCompanyId,
  });

  const addActivity = useMutation({
    mutationFn: async ({ activityCode, activityLabel }: { activityCode: string; activityLabel: string }) => {
      if (!targetCompanyId) throw new Error('No company selected');

      const { data, error } = await supabase
        .from('company_activities')
        .insert({
          company_id: targetCompanyId,
          activity_code: activityCode,
          activity_label: activityLabel,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-activities', targetCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-activities'] });
    },
  });

  const removeActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from('company_activities')
        .update({ is_active: false })
        .eq('id', activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-activities', targetCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-activities'] });
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, activityLabel }: { id: string; activityLabel: string }) => {
      const { data, error } = await supabase
        .from('company_activities')
        .update({ activity_label: activityLabel })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-activities', targetCompanyId] });
      queryClient.invalidateQueries({ queryKey: ['user-accessible-activities'] });
    },
  });

  const reorderActivities = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('company_activities')
          .update({ display_order: index })
          .eq('id', id)
      );
      
      const results = await Promise.all(updates);
      const error = results.find(r => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-activities', targetCompanyId] });
    },
  });

  return {
    activities: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addActivity,
    removeActivity,
    updateActivity,
    reorderActivities,
  };
}

// Hook to get activities only from companies the user has access to
export function useUserAccessibleActivities() {
  return useQuery({
    queryKey: ['user-accessible-activities'],
    queryFn: async () => {
      // First, get companies the user has access to via user_roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('company_id')
        .eq('status', 'active');

      if (rolesError) throw rolesError;

      const companyIds = userRoles?.map(r => r.company_id) || [];
      
      if (companyIds.length === 0) {
        return [];
      }

      // Fetch activities only from accessible companies
      const { data, error } = await supabase
        .from('company_activities')
        .select(`
          *,
          companies:company_id (
            id,
            trade_name,
            legal_name,
            status
          )
        `)
        .eq('is_active', true)
        .in('company_id', companyIds)
        .order('activity_label', { ascending: true });

      if (error) throw error;
      
      // Group by activity_code and filter for active companies
      const grouped = (data || []).reduce((acc, item) => {
        if (!acc[item.activity_code]) {
          acc[item.activity_code] = {
            code: item.activity_code,
            label: item.activity_label,
            companies: [],
          };
        }
        if (item.companies && (item.companies as any).status === 'active') {
          acc[item.activity_code].companies.push(item.companies);
        }
        return acc;
      }, {} as Record<string, { code: string; label: string; companies: any[] }>);

      return Object.values(grouped);
    },
  });
}

// Legacy hook - kept for backwards compatibility but uses the new filtered approach
export function useAllAccessibleActivities() {
  return useUserAccessibleActivities();
}

// Fetch all unique activities across all companies (for suggestions in company creation)
export function useGlobalActivitySuggestions() {
  return useQuery({
    queryKey: ['global-activity-suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_activities')
        .select('activity_code, activity_label')
        .eq('is_active', true);

      if (error) throw error;

      // Deduplicate by activity_code, keeping first occurrence
      const unique = new Map<string, { code: string; label: string }>();
      
      for (const item of data || []) {
        if (!unique.has(item.activity_code)) {
          unique.set(item.activity_code, {
            code: item.activity_code,
            label: item.activity_label
          });
        }
      }

      // Also include ACTIVITY_CODES as fallback for empty databases
      Object.entries(ACTIVITY_CODES).forEach(([code, activity]) => {
        if (!unique.has(code)) {
          unique.set(code, { code, label: activity.label });
        }
      });

      return Array.from(unique.values()).sort((a, b) => 
        a.label.localeCompare(b.label)
      );
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
