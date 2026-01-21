import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface BaseRole {
  id: string;
  companyId: string;
  code: string;
  name: string;
  displayName: string | null;
  description: string | null;
  permissionLevel: number;
  isSystem: boolean;
  isActive: boolean;
  color: string;
  icon: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface UseBaseRolesReturn {
  baseRoles: BaseRole[];
  loading: boolean;
  error: string | null;
  fetchBaseRoles: () => Promise<void>;
  createBaseRole: (data: Partial<BaseRole>) => Promise<BaseRole | null>;
  updateBaseRole: (id: string, data: Partial<BaseRole>) => Promise<boolean>;
  deleteBaseRole: (id: string) => Promise<boolean>;
  getBaseRoleByCode: (code: string) => BaseRole | undefined;
  getBaseRoleById: (id: string) => BaseRole | undefined;
}

export const useBaseRoles = (): UseBaseRolesReturn => {
  const [baseRoles, setBaseRoles] = useState<BaseRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBaseRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: companyId } = await supabase.rpc('get_user_company_id');
      
      if (!companyId) {
        setBaseRoles([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('base_roles')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const mapped: BaseRole[] = (data || []).map((row) => ({
        id: row.id,
        companyId: row.company_id,
        code: row.code,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        permissionLevel: row.permission_level,
        isSystem: row.is_system,
        isActive: row.is_active,
        color: row.color,
        icon: row.icon,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setBaseRoles(mapped);
    } catch (err) {
      console.error('Error fetching base roles:', err);
      setError('Failed to fetch base roles');
    } finally {
      setLoading(false);
    }
  }, []);

  const createBaseRole = useCallback(async (data: Partial<BaseRole>): Promise<BaseRole | null> => {
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      
      if (!companyId) {
        toast.error('No company found');
        return null;
      }

      const maxSortOrder = Math.max(...baseRoles.map(r => r.sortOrder), 0);

      const { data: newRole, error: insertError } = await supabase
        .from('base_roles')
        .insert({
          company_id: companyId,
          code: data.code,
          name: data.name,
          display_name: data.displayName,
          description: data.description,
          permission_level: data.permissionLevel || 1,
          is_system: false,
          is_active: data.isActive ?? true,
          color: data.color || '#6b7280',
          icon: data.icon || 'shield',
          sort_order: maxSortOrder + 1,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Base role created successfully');
      await fetchBaseRoles();
      
      return {
        id: newRole.id,
        companyId: newRole.company_id,
        code: newRole.code,
        name: newRole.name,
        displayName: newRole.display_name,
        description: newRole.description,
        permissionLevel: newRole.permission_level,
        isSystem: newRole.is_system,
        isActive: newRole.is_active,
        color: newRole.color,
        icon: newRole.icon,
        sortOrder: newRole.sort_order,
        createdAt: newRole.created_at,
        updatedAt: newRole.updated_at,
      };
    } catch (err) {
      console.error('Error creating base role:', err);
      toast.error('Failed to create base role');
      return null;
    }
  }, [baseRoles, fetchBaseRoles]);

  const updateBaseRole = useCallback(async (id: string, data: Partial<BaseRole>): Promise<boolean> => {
    try {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.displayName !== undefined) updateData.display_name = data.displayName;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.permissionLevel !== undefined) updateData.permission_level = data.permissionLevel;
      if (data.isActive !== undefined) updateData.is_active = data.isActive;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder;

      const { error: updateError } = await supabase
        .from('base_roles')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Base role updated successfully');
      await fetchBaseRoles();
      return true;
    } catch (err) {
      console.error('Error updating base role:', err);
      toast.error('Failed to update base role');
      return false;
    }
  }, [fetchBaseRoles]);

  const deleteBaseRole = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Check if any custom_roles are using this base_role
      const { data: usageCheck } = await supabase
        .from('custom_roles')
        .select('id')
        .eq('base_role_id', id)
        .limit(1);

      if (usageCheck && usageCheck.length > 0) {
        toast.error('Cannot delete: This base role is being used by custom roles');
        return false;
      }

      const { error: deleteError } = await supabase
        .from('base_roles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Base role deleted successfully');
      await fetchBaseRoles();
      return true;
    } catch (err) {
      console.error('Error deleting base role:', err);
      toast.error('Failed to delete base role');
      return false;
    }
  }, [fetchBaseRoles]);

  const getBaseRoleByCode = useCallback((code: string): BaseRole | undefined => {
    return baseRoles.find(r => r.code === code);
  }, [baseRoles]);

  const getBaseRoleById = useCallback((id: string): BaseRole | undefined => {
    return baseRoles.find(r => r.id === id);
  }, [baseRoles]);

  useEffect(() => {
    fetchBaseRoles();
  }, [fetchBaseRoles]);

  return {
    baseRoles,
    loading,
    error,
    fetchBaseRoles,
    createBaseRole,
    updateBaseRole,
    deleteBaseRole,
    getBaseRoleByCode,
    getBaseRoleById,
  };
};

export default useBaseRoles;
