import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyStore } from "@/stores/activeCompanyStore";

export interface ServiceCatalogItem {
  id: string;
  company_id: string;
  activity_code: string;
  service_name: string;
  service_code: string | null;
  billable_default: boolean;
  default_duration_minutes: number;
  default_rate: number | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export function useServiceCatalog(companyId?: string, activityCode?: string) {
  const { activeCompanyId } = useActiveCompanyStore();
  const targetCompanyId = companyId || activeCompanyId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['service-catalog', targetCompanyId, activityCode],
    queryFn: async () => {
      if (!targetCompanyId) return [];

      let queryBuilder = supabase
        .from('service_catalog')
        .select('*')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (activityCode) {
        queryBuilder = queryBuilder.eq('activity_code', activityCode);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;
      return data as ServiceCatalogItem[];
    },
    enabled: !!targetCompanyId,
  });

  const addService = useMutation({
    mutationFn: async (service: Partial<ServiceCatalogItem>) => {
      if (!targetCompanyId) throw new Error('No company selected');

      const { data, error } = await supabase
        .from('service_catalog')
        .insert({
          company_id: targetCompanyId,
          activity_code: service.activity_code || 'cleaning',
          service_name: service.service_name || '',
          service_code: service.service_code,
          billable_default: service.billable_default ?? true,
          default_duration_minutes: service.default_duration_minutes ?? 120,
          default_rate: service.default_rate,
          description: service.description,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog', targetCompanyId] });
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ServiceCatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('service_catalog')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog', targetCompanyId] });
    },
  });

  const deleteService = useMutation({
    mutationFn: async (serviceId: string) => {
      const { error } = await supabase
        .from('service_catalog')
        .update({ is_active: false })
        .eq('id', serviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog', targetCompanyId] });
    },
  });

  return {
    services: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addService,
    updateService,
    deleteService,
  };
}
