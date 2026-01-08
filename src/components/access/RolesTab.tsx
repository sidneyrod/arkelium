import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
}

interface RolesTabProps {
  onUpdate: () => void;
}


const RolesTab = ({ onUpdate }: RolesTabProps) => {
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editRole, setEditRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase.from('custom_roles').select('*').order('created_at');
      if (error) throw error;
      setCustomRoles((data || []).map((r) => ({ id: r.id, name: r.name, description: r.description, isSystem: r.is_system, isActive: r.is_active, createdAt: r.created_at })));
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRoles(); }, []);

  const handleSaveRole = async () => {
    if (!formData.name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      if (editRole) {
        const { error } = await supabase.from('custom_roles').update({ name: formData.name.trim(), description: formData.description.trim() || null }).eq('id', editRole.id);
        if (error) throw error;
        toast.success('Role updated');
      } else {
        const { error } = await supabase.from('custom_roles').insert({ company_id: companyId, name: formData.name.trim(), description: formData.description.trim() || null, is_system: false });
        if (error) throw error;
        toast.success('Role created');
      }
      setShowAddDialog(false); setEditRole(null); setFormData({ name: '', description: '' }); fetchRoles(); onUpdate();
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
      toast.success('Role deleted'); fetchRoles(); onUpdate();
    } catch (error) {
      toast.error('Failed to delete role');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Manage roles for your organization.</CardDescription>
          </div>
          <Button onClick={() => { setEditRole(null); setFormData({ name: '', description: '' }); setShowAddDialog(true); }} size="sm">
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
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customRoles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">{role.description || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">{format(new Date(role.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRole(role); setFormData({ name: role.name, description: role.description || '' }); setShowAddDialog(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteRole(role)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editRole ? 'Edit Role' : 'Add Role'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label htmlFor="name">Name</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Supervisor" /></div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the role's purpose..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editRole ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RolesTab;
