import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import AddUserModal, { UserFormData } from '@/components/modals/AddUserModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Briefcase, Clock, Star, Phone, Mail, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { CanadianProvince, EmploymentType, provinceNames } from '@/stores/payrollStore';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'admin' | 'manager' | 'supervisor' | 'cleaner';
  status: 'active' | 'inactive';
  lastLogin: string;
  avatar?: string;
  jobsCompleted?: number;
  hoursWorked?: number;
  performance?: number;
  // Payroll fields
  hourlyRate?: number;
  salary?: number;
  province?: CanadianProvince;
  employmentType?: EmploymentType;
  vacationPayPercent?: number;
}

const initialUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@cleanpro.com', phone: '(416) 555-0101', address: '123 Main St, Toronto', role: 'admin', status: 'active', lastLogin: '2 min ago', jobsCompleted: 0, hoursWorked: 160, performance: 95, salary: 65000, province: 'ON', employmentType: 'full-time' },
  { id: '2', name: 'Maria Garcia', email: 'maria@cleanpro.com', phone: '(416) 555-0102', address: '456 Oak Ave, Toronto', role: 'cleaner', status: 'active', lastLogin: '1 hour ago', jobsCompleted: 156, hoursWorked: 148, performance: 92, hourlyRate: 22, province: 'ON', employmentType: 'full-time', vacationPayPercent: 4 },
  { id: '3', name: 'Ana Rodriguez', email: 'ana@cleanpro.com', phone: '(416) 555-0103', address: '789 Pine Rd, Toronto', role: 'cleaner', status: 'active', lastLogin: '3 hours ago', jobsCompleted: 142, hoursWorked: 152, performance: 88, hourlyRate: 20, province: 'ON', employmentType: 'full-time', vacationPayPercent: 4 },
  { id: '4', name: 'James Wilson', email: 'james@cleanpro.com', phone: '(416) 555-0104', address: '321 Elm St, Toronto', role: 'manager', status: 'active', lastLogin: '1 day ago', jobsCompleted: 28, hoursWorked: 160, performance: 94, salary: 55000, province: 'ON', employmentType: 'full-time' },
  { id: '5', name: 'Sophie Martin', email: 'sophie@cleanpro.com', phone: '(416) 555-0105', address: '654 Cedar Ln, Toronto', role: 'supervisor', status: 'inactive', lastLogin: '5 days ago', jobsCompleted: 89, hoursWorked: 120, performance: 78, hourlyRate: 28, province: 'QC', employmentType: 'part-time', vacationPayPercent: 4 },
];

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  manager: 'bg-info/10 text-info',
  supervisor: 'bg-warning/10 text-warning',
  cleaner: 'bg-success/10 text-success',
};

const Users = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddUser = (userData: UserFormData) => {
    if (editUser) {
      setUsers(prev => prev.map(u => 
        u.id === editUser.id 
          ? { ...u, ...userData, status: userData.isActive ? 'active' : 'inactive' } 
          : u
      ));
      setEditUser(null);
    } else {
      const newUser: User = {
        id: Date.now().toString(),
        ...userData,
        status: userData.isActive ? 'active' : 'inactive',
        lastLogin: 'Never',
        jobsCompleted: 0,
        hoursWorked: 0,
        performance: 0,
      };
      setUsers(prev => [...prev, newUser]);
    }
  };

  const handleDeleteUser = () => {
    if (deleteUser) {
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id));
      toast({
        title: t.common.success,
        description: t.users.userDeleted,
      });
      setDeleteUser(null);
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
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: t.users.role,
      render: (user) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[user.role]}`}>
          {t.users[user.role]}
        </span>
      ),
    },
    {
      key: 'status',
      header: t.users.status,
      render: (user) => (
        <StatusBadge status={user.status} label={t.users[user.status]} />
      ),
    },
    {
      key: 'phone',
      header: t.users.phone,
    },
    {
      key: 'lastLogin',
      header: t.users.lastLogin,
      className: 'text-muted-foreground',
    },
    {
      key: 'actions',
      header: t.common.actions,
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(user); }}>
              <Pencil className="h-4 w-4 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setDeleteUser(user); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

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

      <SearchInput 
        placeholder={t.users.searchUsers}
        value={search}
        onChange={setSearch}
        className="max-w-sm"
      />

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
                    {selectedUser.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {selectedUser.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {selectedUser.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {t.users.jobHistory}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{selectedUser.jobsCompleted}</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t.users.hoursWorked}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold">{selectedUser.hoursWorked}h</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      {t.users.performance}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-2xl font-semibold">{selectedUser.performance}%</p>
                      <Progress value={selectedUser.performance} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
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
                      <p className="font-medium">{provinceNames[selectedUser.province || 'ON']}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Employment:</span>
                      <p className="font-medium capitalize">{selectedUser.employmentType || 'Full-time'}</p>
                    </div>
                    {(selectedUser.role === 'cleaner' || selectedUser.role === 'supervisor') && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Hourly Rate:</span>
                          <p className="font-medium">${selectedUser.hourlyRate?.toFixed(2) || '0.00'}/hr</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Vacation Pay:</span>
                          <p className="font-medium">{selectedUser.vacationPayPercent || 4}%</p>
                        </div>
                      </>
                    )}
                    {(selectedUser.role === 'admin' || selectedUser.role === 'manager') && selectedUser.salary && (
                      <div className="col-span-2">
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
          address: editUser.address,
          role: editUser.role,
          isActive: editUser.status === 'active',
          hourlyRate: editUser.hourlyRate,
          salary: editUser.salary,
          province: editUser.province,
          employmentType: editUser.employmentType,
          vacationPayPercent: editUser.vacationPayPercent,
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteUser}
        onOpenChange={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        title={t.common.confirmDelete}
        description={`Are you sure you want to delete "${deleteUser?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Users;
