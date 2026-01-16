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

// Standard activity codes
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
    },
  });

  return {
    activities: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addActivity,
    removeActivity,
  };
}

// Hook to get all activities across accessible companies (for the booking modal)
export function useAllAccessibleActivities() {
  return useQuery({
    queryKey: ['all-accessible-activities'],
    queryFn: async () => {
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
        .order('activity_label', { ascending: true });

      if (error) throw error;
      
      // Group by activity_code
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
