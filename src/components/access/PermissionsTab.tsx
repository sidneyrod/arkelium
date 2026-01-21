import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Lock, Info } from 'lucide-react';
import { Permission, RolePermission } from '@/pages/AccessRoles';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PermissionsTabProps {
  permissions: Permission[];
  rolePermissions: RolePermission[];
  loading: boolean;
  onUpdate: () => void;
}

const ROLES = ['admin', 'manager', 'cleaner'] as const;

const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard', schedule: 'Schedule', jobs: 'Jobs / Services', completed_services: 'Completed Services',
  off_requests: 'Field Requests', clients: 'Clients', contracts: 'Contracts', estimates: 'Estimates',
  invoices: 'Invoices', receipts: 'Receipts', payments_collections: 'Payments & Collections', ledger: 'Ledger',
  payroll: 'Work & Time Tracking', activity_log: 'Activity Log', notifications: 'Notifications',
};

const ACTION_LABELS: Record<string, string> = { view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete' };

const PermissionsTab = ({ permissions, rolePermissions, loading, onUpdate }: PermissionsTabProps) => {
  const [saving, setSaving] = useState<string | null>(null);

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      if (!groups[perm.module]) groups[perm.module] = [];
      groups[perm.module].push(perm);
    });
    Object.keys(groups).forEach((module) => {
      groups[module].sort((a, b) => ['view', 'create', 'edit', 'delete'].indexOf(a.action) - ['view', 'create', 'edit', 'delete'].indexOf(b.action));
    });
    return groups;
  }, [permissions]);

  const modules = useMemo(() => Object.keys(groupedPermissions).sort((a, b) => Object.keys(MODULE_LABELS).indexOf(a) - Object.keys(MODULE_LABELS).indexOf(b)), [groupedPermissions]);

  const isPermissionGranted = (role: string, permissionId: string): boolean => {
    if (role === 'admin') return true;
    const rp = rolePermissions.find((rp) => rp.role === role && rp.permissionId === permissionId);
    return rp?.granted ?? false;
  };

  const handlePermissionChange = async (role: string, permission: Permission, granted: boolean) => {
    if (role === 'admin') { toast.error('Admin permissions cannot be modified'); return; }
    setSaving(`${role}-${permission.id}`);
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      const existingRp = rolePermissions.find((rp) => rp.role === role && rp.permissionId === permission.id);
      if (existingRp) {
        await supabase.from('role_permissions').update({ granted }).eq('id', existingRp.id);
      } else {
        await supabase.from('role_permissions').insert({ company_id: companyId, role: role as any, permission_id: permission.id, granted });
      }
      onUpdate();
    } catch (error) {
      toast.error('Failed to update permission');
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permission Matrix</CardTitle>
        <CardDescription className="flex items-center gap-2"><Info className="h-4 w-4" />Configure granular access for each role. Admin permissions are locked.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">Module</th>
                <th className="text-left py-3 px-4 font-medium">Action</th>
                {ROLES.map((role) => (
                  <th key={role} className="text-center py-3 px-4 font-medium capitalize">
                    <div className="flex items-center justify-center gap-1">{role}{role === 'admin' && <Lock className="h-3 w-3" />}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                groupedPermissions[module].map((permission, idx) => (
                  <tr key={permission.id} className={`border-b hover:bg-muted/50 ${idx === 0 ? 'bg-muted/30' : ''}`}>
                    {idx === 0 && <td className="py-3 px-4 font-medium align-top" rowSpan={groupedPermissions[module].length}><Badge variant="outline" className="font-normal">{MODULE_LABELS[module] || module}</Badge></td>}
                    <td className="py-3 px-4 text-muted-foreground">{ACTION_LABELS[permission.action] || permission.action}</td>
                    {ROLES.map((role) => {
                      const isGranted = isPermissionGranted(role, permission.id);
                      const isAdmin = role === 'admin';
                      const isSaving = saving === `${role}-${permission.id}`;
                      return (
                        <td key={role} className="py-3 px-4 text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center justify-center">
                                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Checkbox checked={isGranted} onCheckedChange={(checked) => handlePermissionChange(role, permission, !!checked)} disabled={isAdmin} className={isAdmin ? 'opacity-50' : ''} />}
                                </div>
                              </TooltipTrigger>
                              {isAdmin && <TooltipContent><p>Admin permissions cannot be modified</p></TooltipContent>}
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })}
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PermissionsTab;
