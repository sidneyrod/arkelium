import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Organization {
  id: string;
  name: string;
  legal_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export function useOrganizations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Organization[];
    },
  });

  const createOrganization = useMutation({
    mutationFn: async ({ name, legalName }: { name: string; legalName?: string }) => {
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          name,
          legal_name: legalName,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });

  return {
    organizations: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createOrganization,
  };
}

export function useOrganizationMembers(organizationId?: string) {
  return useQuery({
    queryKey: ['organization-members', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('organization_id', organizationId);

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}
