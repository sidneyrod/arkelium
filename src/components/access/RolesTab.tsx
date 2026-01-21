import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useBaseRoles, BaseRole } from '@/hooks/useBaseRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Loader2, Edit, Trash2, Shield, Briefcase, User, Crown, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  baseRole: 'admin' | 'manager' | 'cleaner';
  baseRoleId: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

interface RolesTabProps {
  onUpdate: () => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  briefcase: Briefcase,
  user: User,
  crown: Crown,
  settings: Settings,
};

const RolesTab = ({ onUpdate }: RolesTabProps) => {
  const { baseRoles, loading: baseRolesLoading } = useBaseRoles();
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    description: '', 
    baseRoleId: '' 
  });
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('created_at');
      if (error) throw error;
      setCustomRoles((data || []).map((r) => ({ 
        id: r.id, 
        name: r.name, 
        description: r.description, 
        baseRole: r.base_role || 'cleaner', 
        baseRoleId: r.base_role_id,
        isSystem: r.is_system, 
        isActive: r.is_active, 
        createdAt: r.created_at 
      })));
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  // Set default baseRoleId when base roles load
  useEffect(() => {
    if (baseRoles.length > 0 && !formData.baseRoleId && !editRole) {
      const defaultRole = baseRoles.find(r => r.code === 'field_worker') || baseRoles[baseRoles.length - 1];
      setFormData(prev => ({ ...prev, baseRoleId: defaultRole.id }));
    }
  }, [baseRoles, formData.baseRoleId, editRole]);

  const handleSaveRole = async () => {
    if (!formData.name.trim()) { 
      toast.error('Role name is required'); 
      return; 
    }
    if (!formData.baseRoleId) {
      toast.error('Base role is required');
      return;
    }

    // Find the selected base role to get its legacy base_role value
    const selectedBaseRole = baseRoles.find(r => r.id === formData.baseRoleId);
    const legacyBaseRole = selectedBaseRole?.code === 'full_access' ? 'admin' 
      : selectedBaseRole?.code === 'operational' ? 'manager' 
      : 'cleaner';

    setSaving(true);
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      if (editRole) {
        const { error } = await supabase.from('custom_roles').update({ 
          name: formData.name.trim(), 
          description: formData.description.trim() || null,
          base_role: legacyBaseRole,
          base_role_id: formData.baseRoleId
        }).eq('id', editRole.id);
        if (error) throw error;
        toast.success('Role updated');
      } else {
        const { error } = await supabase.from('custom_roles').insert({ 
          company_id: companyId, 
          name: formData.name.trim(), 
          description: formData.description.trim() || null, 
          base_role: legacyBaseRole,
          base_role_id: formData.baseRoleId,
          is_system: false 
        });
        if (error) throw error;
        toast.success('Role created');
      }
      setShowAddDialog(false); 
      setEditRole(null); 
      const defaultRole = baseRoles.find(r => r.code === 'field_worker') || baseRoles[baseRoles.length - 1];
      setFormData({ name: '', description: '', baseRoleId: defaultRole?.id || '' }); 
      fetchRoles(); 
      onUpdate();
    } catch (error: any) {
      toast.error(error.code === '23505' ? 'Role name already exists' : 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    try {
      const { error } = await supabase.from('custom_roles').delete().eq('id', role.id);
      if (error) throw error;
      toast.success('Role deleted'); 
      fetchRoles(); 
      onUpdate();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  const getBaseRoleDisplay = (role: CustomRole): { name: string; color: string; icon: string } => {
    // First try to get from base_role_id (new system)
    if (role.baseRoleId) {
      const baseRole = baseRoles.find(br => br.id === role.baseRoleId);
      if (baseRole) {
        return { 
          name: baseRole.name, 
          color: baseRole.color, 
          icon: baseRole.icon 
        };
      }
    }
    
    // Fallback to legacy base_role
    const legacyMapping: Record<string, { name: string; color: string; icon: string }> = {
      admin: { name: 'Admin', color: '#dc2626', icon: 'shield' },
      manager: { name: 'Manager', color: '#2563eb', icon: 'briefcase' },
      cleaner: { name: 'Cleaner', color: '#16a34a', icon: 'user' },
    };
    return legacyMapping[role.baseRole] || legacyMapping.cleaner;
  };

  const isLoading = loading || baseRolesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Custom Roles</CardTitle>
            <CardDescription>Create custom roles based on your access levels.</CardDescription>
          </div>
          <Button 
            onClick={() => { 
              setEditRole(null); 
              const defaultRole = baseRoles.find(r => r.code === 'field_worker') || baseRoles[baseRoles.length - 1];
              setFormData({ name: '', description: '', baseRoleId: defaultRole?.id || '' }); 
              setShowAddDialog(true); 
            }} 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />Add Role
          </Button>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No roles created yet.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Base Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRoles.map((role) => {
                    const baseDisplay = getBaseRoleDisplay(role);
                    const IconComponent = ICON_MAP[baseDisplay.icon] || Shield;
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>
                          <span 
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${baseDisplay.color}20`,
                              color: baseDisplay.color 
                            }}
                          >
                            <IconComponent className="h-3 w-3" />
                            {baseDisplay.name}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(role.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8" 
                              onClick={() => { 
                                setEditRole(role); 
                                setFormData({ 
                                  name: role.name, 
                                  description: role.description || '', 
                                  baseRoleId: role.baseRoleId || '' 
                                }); 
                                setShowAddDialog(true); 
                              }} 
                              disabled={role.isSystem}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive" 
                              onClick={() => handleDeleteRole(role)} 
                              disabled={role.isSystem}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g., Supervisor" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseRole">Base Role</Label>
              <Select 
                value={formData.baseRoleId} 
                onValueChange={(value) => setFormData({ ...formData, baseRoleId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select base role" />
                </SelectTrigger>
                <SelectContent>
                  {baseRoles.filter(br => br.isActive).map((baseRole) => {
                    const IconComponent = ICON_MAP[baseRole.icon] || Shield;
                    return (
                      <SelectItem key={baseRole.id} value={baseRole.id}>
                        <div className="flex items-center gap-2">
                          <IconComponent 
                            className="h-4 w-4" 
                            style={{ color: baseRole.color }}
                          />
                          <span>{baseRole.name}</span>
                          {baseRole.displayName && (
                            <span className="text-muted-foreground">
                              ({baseRole.displayName})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Base role determines system-level permissions. Configure access levels in the "Access Levels" tab.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                placeholder="Describe the role's purpose..." 
                rows={3} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editRole ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesTab;
