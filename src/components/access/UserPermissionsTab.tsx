import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Search, User, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Permission, RolePermission, UserWithRole } from '@/pages/AccessRoles';

interface UserPermissionsTabProps {
  users: UserWithRole[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  loading: boolean;
  onUpdate: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', schedule: 'Schedule', jobs: 'Jobs / Services', completed_services: 'Completed Services',
  payments_collections: 'Payments & Collections', ledger: 'Ledger', invoices: 'Invoices', receipts: 'Receipts',
  activity_log: 'Activity Log', notifications: 'Notifications', company_settings: 'Company Settings',
  access_roles: 'Access & Roles', reports: 'Reports', clients: 'Clients', contracts: 'Contracts', payroll: 'Payroll',
};

const ACTION_LABELS: Record<string, string> = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' };

const UserPermissionsTab = ({ users, permissions, rolePermissions, loading, onUpdate }: UserPermissionsTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [moduleSearch, setModuleSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [applyScope, setApplyScope] = useState<'user' | 'role'>('user');

  // Filter out admin users - they have full access
  const nonAdminUsers = useMemo(() => 
    users.filter(u => u.role !== 'admin'), 
    [users]
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return nonAdminUsers;
    const query = searchQuery.toLowerCase();
    return nonAdminUsers.filter(u => 
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  }, [nonAdminUsers, searchQuery]);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!groups[perm.module]) groups[perm.module] = [];
      groups[perm.module].push(perm);
    });
    Object.keys(groups).forEach((module) => {
      groups[module].sort((a, b) => 
        ['view', 'create', 'edit', 'delete'].indexOf(a.action) - ['view', 'create', 'edit', 'delete'].indexOf(b.action)
      );
    });
    return groups;
  }, [permissions]);

  const filteredModules = useMemo(() => {
    const modules = Object.keys(groupedPermissions).sort((a, b) => 
      Object.keys(MODULE_LABELS).indexOf(a) - Object.keys(MODULE_LABELS).indexOf(b)
    );
    if (!moduleSearch.trim()) return modules;
    const query = moduleSearch.toLowerCase();
    return modules.filter(m => 
      (MODULE_LABELS[m] || m).toLowerCase().includes(query)
    );
  }, [groupedPermissions, moduleSearch]);

  // Count users with the same role as selected user
  const usersWithSameRole = useMemo(() => {
    if (!selectedUser) return [];
    return nonAdminUsers.filter(u => u.role === selectedUser.role);
  }, [nonAdminUsers, selectedUser]);

  const isPermissionGranted = (role: string, permissionId: string): boolean => {
    const rp = rolePermissions.find((rp) => rp.role === role && rp.permissionId === permissionId);
    return rp?.granted ?? false;
  };

  const handlePermissionChange = async (permission: Permission, granted: boolean) => {
    if (!selectedUser) return;
    const role = selectedUser.role;
    setSaving(permission.id);
    
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      const existingRp = rolePermissions.find((rp) => rp.role === role && rp.permissionId === permission.id);
      
      if (existingRp) {
        await supabase.from('role_permissions').update({ granted }).eq('id', existingRp.id);
      } else {
        await supabase.from('role_permissions').insert({ 
          company_id: companyId, 
          role: role as any, 
          permission_id: permission.id, 
          granted 
        });
      }
      
      onUpdate();
      
      if (applyScope === 'role') {
        toast.success(`Permission ${granted ? 'granted' : 'revoked'} for all ${role}s`);
      } else {
        toast.success(`Permission ${granted ? 'granted' : 'revoked'} for ${selectedUser.firstName}`);
      }
    } catch (error) {
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  const handleSelectUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setModuleSearch('');
    setApplyScope('user');
    setShowPermissionDialog(true);
  };

  const getPermissionCount = (user: UserWithRole) => {
    const granted = rolePermissions.filter(rp => rp.role === user.role && rp.granted).length;
    return granted;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <p className="text-xs text-muted-foreground mb-4">
            Select a user to configure their screen access. Admin users have full access and are not listed.
          </p>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No users found matching your search.' : 'No non-admin users to configure.'}
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">{user.role}</Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      {getPermissionCount(user)} permissions
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-2xl h-[min(80vh,720px)] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions for {selectedUser?.firstName} {selectedUser?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          {/* Apply Scope Selection */}
          <div className="shrink-0 p-3 bg-muted/50 rounded-lg border">
            <p className="text-xs font-medium mb-2">Apply changes to:</p>
            <RadioGroup 
              value={applyScope} 
              onValueChange={(value) => setApplyScope(value as 'user' | 'role')}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="scope-user" />
                <Label htmlFor="scope-user" className="text-sm flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  Only {selectedUser?.firstName} {selectedUser?.lastName}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="role" id="scope-role" />
                <Label htmlFor="scope-role" className="text-sm flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  All users with role <Badge variant="outline" className="capitalize ml-1">{selectedUser?.role}</Badge>
                  <span className="text-muted-foreground">({usersWithSameRole.length} users)</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search screens..."
              value={moduleSearch}
              onChange={(e) => setModuleSearch(e.target.value)}
              className="flex-1"
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-3 pr-4 pb-4">
              {filteredModules.map((module) => (
                <div key={module} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">{MODULE_LABELS[module] || module}</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {groupedPermissions[module].map((permission) => {
                      const isGranted = selectedUser ? isPermissionGranted(selectedUser.role, permission.id) : false;
                      const isSaving = saving === permission.id;
                      return (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                            isGranted ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/50'
                          }`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Checkbox
                              checked={isGranted}
                              onCheckedChange={(checked) => handlePermissionChange(permission, !!checked)}
                            />
                          )}
                          <span className="text-xs">{ACTION_LABELS[permission.action] || permission.action}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-4 shrink-0">
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserPermissionsTab;
