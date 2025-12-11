import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddUserModal, { UserFormData } from '@/components/modals/AddUserModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Briefcase, Clock, Star, Phone, Mail, MoreHorizontal, Pencil, Trash2, Loader2, Filter } from 'lucide-react';
import { provinceNames } from '@/stores/payrollStore';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  province_address?: string;
  country?: string;
  postalCode?: string;
  role: 'admin' | 'manager' | 'cleaner';
  status: 'active' | 'inactive';
  avatar?: string;
  hourlyRate?: number;
  salary?: number;
  province?: string;
  employmentType?: string;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-500/15 text-purple-500 border border-purple-500/30',
  manager: 'bg-info/15 text-info border border-info/30',
  cleaner: 'bg-warning/15 text-warning-foreground border border-warning/30',
};

const Users = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Read URL params for filters
  const urlFilter = searchParams.get('filter');
  const urlRoles = searchParams.get('roles');
  
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [userJobsCount, setUserJobsCount] = useState<number>(0);
  const [isCheckingJobs, setIsCheckingJobs] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>(urlRoles ? 'filtered' : 'all');
  const [statusFilterFromUrl] = useState<string>(urlFilter || 'all');

  // Fetch users from Supabase
  const fetchUsers = useCallback(async () => {
    if (!user?.profile?.company_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          province,
          country,
          postal_code,
          avatar_url,
          hourly_rate,
          salary,
          primary_province,
          employment_type
        `)
        .eq('company_id', user.profile.company_id);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Fetch user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('company_id', user.profile.company_id);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Map profiles with roles
      const mappedUsers: User[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unnamed User',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          city: profile.city || '',
          province_address: profile.province || '',
          country: profile.country || 'Canada',
          postalCode: profile.postal_code || '',
          role: (userRole?.role as 'admin' | 'manager' | 'cleaner') || 'cleaner',
          status: 'active',
          avatar: profile.avatar_url || undefined,
          hourlyRate: profile.hourly_rate || undefined,
          salary: profile.salary || undefined,
          province: profile.primary_province || 'ON',
          employmentType: profile.employment_type || 'full-time',
        };
      });

      setUsers(mappedUsers);
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.profile?.company_id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = users;
    
    // Filter by search
    if (search) {
      result = result.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Filter by roles from URL (cleaner,manager)
    if (urlRoles) {
      const allowedRoles = urlRoles.split(',');
      result = result.filter(u => allowedRoles.includes(u.role));
    }
    
    // Filter by role dropdown
    if (roleFilter !== 'all' && roleFilter !== 'filtered') {
      result = result.filter(u => u.role === roleFilter);
    }
    
    // Filter by status from URL
    if (statusFilterFromUrl === 'active') {
      result = result.filter(u => u.status === 'active');
    }
    
    return result;
  }, [users, search, urlRoles, roleFilter, statusFilterFromUrl]);

  const handleAddUser = async (userData: UserFormData) => {
    // Refresh the list after modal handles creation/update
    await fetchUsers();
    setEditUser(null);
    setIsAddModalOpen(false);
  };

  // Check if user has scheduled jobs before deletion
  const checkUserJobs = async (userId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('cleaner_id', userId)
      .eq('company_id', user?.profile?.company_id);
    
    if (error) {
      console.error('Error checking jobs:', error);
      return 0;
    }
    return count || 0;
  };

  const initiateDeleteUser = async (userToDelete: User) => {
    setIsCheckingJobs(true);
    const jobsCount = await checkUserJobs(userToDelete.id);
    setUserJobsCount(jobsCount);
    setDeleteUser(userToDelete);
    setIsCheckingJobs(false);
  };

  const handleDeleteUser = async () => {
    if (!deleteUser) return;
    
    try {
      // If user has jobs, delete them first
      if (userJobsCount > 0) {
        const { error: jobsError } = await supabase
          .from('jobs')
          .delete()
          .eq('cleaner_id', deleteUser.id)
          .eq('company_id', user?.profile?.company_id);
        
        if (jobsError) {
          console.error('Error deleting jobs:', jobsError);
          toast({ title: 'Error', description: 'Failed to delete user jobs', variant: 'destructive' });
          return;
        }
      }

      // Delete user role (company_id required by RLS)
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', deleteUser.id)
        .eq('company_id', user?.profile?.company_id);

      if (roleError) {
        console.error('Error deleting role:', roleError);
        toast({ title: 'Error', description: 'Failed to delete user role', variant: 'destructive' });
        return;
      }

      // Delete from profiles table (company_id required by RLS)
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteUser.id)
        .eq('company_id', user?.profile?.company_id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        toast({ title: 'Error', description: 'Failed to delete user profile', variant: 'destructive' });
        return;
      }

      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      
      toast({
        title: t.common.success,
        description: t.users.userDeleted,
      });
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
    } finally {
      setDeleteUser(null);
      setUserJobsCount(0);
    }
  };

  const openEditModal = (user: User) => {
    setEditUser(user);
    setIsAddModalOpen(true);
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: t.users.name,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={u.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {u.name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{u.name}</p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t.users.role,
      render: (u) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[u.role] || roleColors.cleaner}`}>
          {t.users[u.role] || u.role}
        </span>
      ),
    },
    {
      key: 'status',
      header: t.users.status,
      render: (u) => (
        <StatusBadge status={u.status} label={t.users[u.status]} />
      ),
    },
    {
      key: 'phone',
      header: t.users.phone,
    },
    {
      key: 'actions',
      header: t.common.actions,
      render: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(u); }}>
              <Pencil className="h-4 w-4 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); initiateDeleteUser(u); }}
              className="text-destructive focus:text-destructive"
              disabled={isCheckingJobs}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container px-4 py-8 lg:px-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title={t.users.title}
        description="Manage employees and system users"
        action={{
          label: t.users.addUser,
          icon: UserPlus,
          onClick: () => { setEditUser(null); setIsAddModalOpen(true); },
        }}
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput 
          placeholder={t.users.searchUsers}
          value={search}
          onChange={setSearch}
          className="max-w-sm"
        />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="cleaner">Cleaner</SelectItem>
          </SelectContent>
        </Select>
        {urlRoles && (
          <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md">
            Showing: {urlRoles.split(',').join(', ')}
          </div>
        )}
      </div>

      <DataTable 
        columns={columns}
        data={filteredUsers}
        onRowClick={setSelectedUser}
        emptyMessage={t.common.noData}
      />

      {/* User Profile Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.users.profile}</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedUser.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {selectedUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedUser.email}
                    </span>
                    {selectedUser.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" />
                        {selectedUser.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payroll Information */}
              <Card className="border-border/50 bg-muted/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Payroll Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Province:</span>
                      <p className="font-medium">{provinceNames[selectedUser.province as keyof typeof provinceNames] || selectedUser.province}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Employment:</span>
                      <p className="font-medium capitalize">{selectedUser.employmentType || 'Full-time'}</p>
                    </div>
                    {selectedUser.role === 'cleaner' && selectedUser.hourlyRate && (
                      <div>
                        <span className="text-muted-foreground">Hourly Rate:</span>
                        <p className="font-medium">${selectedUser.hourlyRate.toFixed(2)}/hr</p>
                      </div>
                    )}
                    {(selectedUser.role === 'admin' || selectedUser.role === 'manager') && selectedUser.salary && (
                      <div>
                        <span className="text-muted-foreground">Annual Salary:</span>
                        <p className="font-medium">${selectedUser.salary.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit User Modal */}
      <AddUserModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddUser}
        editUser={editUser ? {
          id: editUser.id,
          name: editUser.name,
          email: editUser.email,
          phone: editUser.phone,
          address: editUser.address || '',
          city: editUser.city || '',
          province_address: editUser.province_address || '',
          country: editUser.country || 'Canada',
          postalCode: editUser.postalCode || '',
          role: editUser.role,
          isActive: editUser.status === 'active',
          hourlyRate: editUser.hourlyRate,
          salary: editUser.salary,
          province: editUser.province as any,
          employmentType: editUser.employmentType as any,
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={() => { setDeleteUser(null); setUserJobsCount(0); }}
        onConfirm={handleDeleteUser}
        title={t.common.confirmDelete}
        description={
          userJobsCount > 0
            ? `"${deleteUser?.name}" has ${userJobsCount} scheduled job(s). Deleting this user will also remove all their scheduled jobs. Are you sure you want to proceed?`
            : `Are you sure you want to delete "${deleteUser?.name}"? This action cannot be undone.`
        }
      />
    </div>
  );
};

export default Users;