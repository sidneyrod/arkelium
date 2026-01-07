import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Lock } from 'lucide-react';
import RolesTab from '@/components/access/RolesTab';
import UserPermissionsTab from '@/components/access/UserPermissionsTab';
import { toast } from 'sonner';

export interface UserWithRole {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'cleaner';
  status: 'active' | 'inactive';
  lastLoginAt: string | null;
  createdAt: string;
  phone?: string;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  description?: string;
}

export interface RolePermission {
  id: string;
  role: string;
  permissionId: string;
  granted: boolean;
}

const AccessRoles = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('roles');
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('id, email, first_name, last_name, phone, last_login_at, created_at');
      const { data: roles } = await supabase.from('user_roles').select('user_id, role, status');
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id, email: profile.email || '', firstName: profile.first_name || '', lastName: profile.last_name || '',
          role: (userRole?.role || 'cleaner') as 'admin' | 'manager' | 'cleaner',
          status: (userRole?.status || 'active') as 'active' | 'inactive',
          lastLoginAt: profile.last_login_at, createdAt: profile.created_at, phone: profile.phone || undefined,
        };
      });
      setUsers(usersWithRoles);
    } catch (error) {
      toast.error('Failed to fetch users');
    }
  }, []);

  const fetchPermissions = useCallback(async () => {
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      if (companyId) await supabase.rpc('initialize_company_permissions', { p_company_id: companyId });
      const { data: perms } = await supabase.from('permissions').select('id, module, action, description').order('module').order('action');
      setPermissions((perms || []).map((p) => ({ id: p.id, module: p.module, action: p.action, description: p.description || undefined })));
      const { data: rolePerms } = await supabase.from('role_permissions').select('id, role, permission_id, granted');
      setRolePermissions((rolePerms || []).map((rp) => ({ id: rp.id, role: rp.role, permissionId: rp.permission_id, granted: rp.granted })));
    } catch (error) {
      toast.error('Failed to fetch permissions');
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchPermissions()]);
      setLoading(false);
    };
    fetchData();
  }, [fetchUsers, fetchPermissions]);

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Permissions</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="mt-4">
          <RolesTab onUpdate={fetchPermissions} />
        </TabsContent>
        <TabsContent value="permissions" className="mt-4">
          <UserPermissionsTab 
            users={users} 
            permissions={permissions} 
            rolePermissions={rolePermissions} 
            loading={loading} 
            onUpdate={fetchPermissions} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccessRoles;
