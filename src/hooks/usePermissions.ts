import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface UserPermission {
  module: string;
  action: string;
  granted: boolean;
}

export const usePermissions = () => {
  const { user, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      // Admin always has all permissions
      if (hasRole(['admin'])) {
        // Return full access for admin
        const { data } = await supabase
          .from('permissions')
          .select('module, action');

        setPermissions(
          (data || []).map((p) => ({
            module: p.module,
            action: p.action,
            granted: true,
          }))
        );
      } else {
        // Use RPC function for non-admins
        const { data, error } = await supabase.rpc('get_user_permissions');

        if (error) throw error;

        setPermissions(
          (data || []).map((p: any) => ({
            module: p.module,
            action: p.action,
            granted: p.granted,
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user, hasRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (module: string, action: string): boolean => {
      // Admin always has access
      if (hasRole(['admin'])) return true;

      const perm = permissions.find(
        (p) => p.module === module && p.action === action
      );
      return perm?.granted ?? false;
    },
    [permissions, hasRole]
  );

  const canView = useCallback(
    (module: string): boolean => hasPermission(module, 'view'),
    [hasPermission]
  );

  const canCreate = useCallback(
    (module: string): boolean => hasPermission(module, 'create'),
    [hasPermission]
  );

  const canEdit = useCallback(
    (module: string): boolean => hasPermission(module, 'edit'),
    [hasPermission]
  );

  const canDelete = useCallback(
    (module: string): boolean => hasPermission(module, 'delete'),
    [hasPermission]
  );

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    refetch: fetchPermissions,
  };
};

export default usePermissions;
