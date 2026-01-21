import { useState } from 'react';
import { useBaseRoles, BaseRole } from '@/hooks/useBaseRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Pencil, Trash2, Shield, Briefcase, User, Crown, Settings, Lock } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface BaseRolesTabProps {
  onUpdate?: () => void;
}

const PERMISSION_LEVELS = [
  { value: 1, label: 'Basic Access', description: 'Limited to field operations' },
  { value: 2, label: 'Operational Access', description: 'Day-to-day management tasks' },
  { value: 3, label: 'Full Access', description: 'Complete system control' },
];

const ICONS = [
  { value: 'shield', label: 'Shield', Icon: Shield },
  { value: 'briefcase', label: 'Briefcase', Icon: Briefcase },
  { value: 'user', label: 'User', Icon: User },
  { value: 'crown', label: 'Crown', Icon: Crown },
  { value: 'settings', label: 'Settings', Icon: Settings },
];

const COLORS = [
  { value: '#dc2626', label: 'Red' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#ca8a04', label: 'Yellow' },
  { value: '#16a34a', label: 'Green' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#db2777', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' },
];

interface FormData {
  name: string;
  displayName: string;
  description: string;
  permissionLevel: number;
  color: string;
  icon: string;
  isActive: boolean;
}

const initialFormData: FormData = {
  name: '',
  displayName: '',
  description: '',
  permissionLevel: 1,
  color: '#6b7280',
  icon: 'shield',
  isActive: true,
};

const BaseRolesTab = ({ onUpdate }: BaseRolesTabProps) => {
  const { baseRoles, loading, createBaseRole, updateBaseRole, deleteBaseRole } = useBaseRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<BaseRole | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<BaseRole | null>(null);

  const handleOpenDialog = (role?: BaseRole) => {
    if (role) {
      setEditingRole(role);
      setFormData({
        name: role.name,
        displayName: role.displayName || '',
        description: role.description || '',
        permissionLevel: role.permissionLevel,
        color: role.color,
        icon: role.icon,
        isActive: role.isActive,
      });
    } else {
      setEditingRole(null);
      setFormData(initialFormData);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingRole(null);
    setFormData(initialFormData);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        await updateBaseRole(editingRole.id, {
          name: formData.name,
          displayName: formData.displayName || null,
          description: formData.description || null,
          permissionLevel: formData.permissionLevel,
          color: formData.color,
          icon: formData.icon,
          isActive: formData.isActive,
        });
      } else {
        const code = formData.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        await createBaseRole({
          code,
          name: formData.name,
          displayName: formData.displayName || null,
          description: formData.description || null,
          permissionLevel: formData.permissionLevel,
          color: formData.color,
          icon: formData.icon,
          isActive: formData.isActive,
        });
      }
      handleCloseDialog();
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (role: BaseRole) => {
    if (role.isSystem) {
      toast.error('System roles cannot be deleted');
      return;
    }
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    await deleteBaseRole(roleToDelete.id);
    setDeleteDialogOpen(false);
    setRoleToDelete(null);
    onUpdate?.();
  };

  const getIconComponent = (iconName: string) => {
    const icon = ICONS.find(i => i.value === iconName);
    return icon ? icon.Icon : Shield;
  };

  const getPermissionLabel = (level: number) => {
    const perm = PERMISSION_LEVELS.find(p => p.value === level);
    return perm?.label || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Access Levels</CardTitle>
              <CardDescription>
                Configure the fundamental access levels for your organization. These define the base permissions that custom roles inherit.
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Level
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead>Permission Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baseRoles.map((role) => {
                const IconComponent = getIconComponent(role.icon);
                return (
                  <TableRow key={role.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="p-1.5 rounded"
                          style={{ backgroundColor: `${role.color}20` }}
                        >
                          <IconComponent 
                            className="h-4 w-4" 
                            style={{ color: role.color }}
                          />
                        </div>
                        <div>
                          <span className="font-medium">{role.name}</span>
                          {role.isSystem && (
                            <Lock className="inline h-3 w-3 ml-1.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {role.displayName || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {getPermissionLabel(role.permissionLevel)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={role.isActive ? 'default' : 'secondary'}>
                        {role.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenDialog(role)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(role)}
                          disabled={role.isSystem}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {baseRoles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No access levels configured. Click "Add Level" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Access Level' : 'Create Access Level'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Technician, Supervisor"
                disabled={editingRole?.isSystem && editingRole.code === 'full_access'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., Field Technician"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this access level allows..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Permission Level</Label>
              <Select
                value={String(formData.permissionLevel)}
                onValueChange={(v) => setFormData({ ...formData, permissionLevel: parseInt(v) })}
                disabled={editingRole?.isSystem && editingRole.code === 'full_access'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMISSION_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={String(level.value)}>
                      <div className="flex flex-col">
                        <span>{level.label}</span>
                        <span className="text-xs text-muted-foreground">{level.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(v) => setFormData({ ...formData, icon: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICONS.map((icon) => (
                      <SelectItem key={icon.value} value={icon.value}>
                        <div className="flex items-center gap-2">
                          <icon.Icon className="h-4 w-4" />
                          <span>{icon.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(v) => setFormData({ ...formData, color: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((color) => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="h-4 w-4 rounded-full" 
                            style={{ backgroundColor: color.value }}
                          />
                          <span>{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRole ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Access Level"
        description={`Are you sure you want to delete "${roleToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        variant="destructive"
      />
    </div>
  );
};

export default BaseRolesTab;
