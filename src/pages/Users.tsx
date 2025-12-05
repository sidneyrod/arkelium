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
import { UserPlus, Briefcase, Clock, Star, Phone, Mail } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'cleaner' | 'accountant';
  status: 'active' | 'inactive';
  lastLogin: string;
  avatar?: string;
  jobsCompleted?: number;
  hoursWorked?: number;
  performance?: number;
}

const mockUsers: User[] = [
  { id: '1', name: 'John Doe', email: 'john@cleanpro.com', phone: '(416) 555-0101', role: 'admin', status: 'active', lastLogin: '2 min ago', jobsCompleted: 0, hoursWorked: 160, performance: 95 },
  { id: '2', name: 'Maria Garcia', email: 'maria@cleanpro.com', phone: '(416) 555-0102', role: 'cleaner', status: 'active', lastLogin: '1 hour ago', jobsCompleted: 156, hoursWorked: 148, performance: 92 },
  { id: '3', name: 'Ana Rodriguez', email: 'ana@cleanpro.com', phone: '(416) 555-0103', role: 'cleaner', status: 'active', lastLogin: '3 hours ago', jobsCompleted: 142, hoursWorked: 152, performance: 88 },
  { id: '4', name: 'James Wilson', email: 'james@cleanpro.com', phone: '(416) 555-0104', role: 'manager', status: 'active', lastLogin: '1 day ago', jobsCompleted: 28, hoursWorked: 160, performance: 94 },
  { id: '5', name: 'Sophie Martin', email: 'sophie@cleanpro.com', phone: '(416) 555-0105', role: 'cleaner', status: 'inactive', lastLogin: '5 days ago', jobsCompleted: 89, hoursWorked: 120, performance: 78 },
  { id: '6', name: 'David Chen', email: 'david@cleanpro.com', phone: '(416) 555-0106', role: 'accountant', status: 'active', lastLogin: '2 hours ago', jobsCompleted: 0, hoursWorked: 160, performance: 90 },
];

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  manager: 'bg-info/10 text-info',
  cleaner: 'bg-success/10 text-success',
  accountant: 'bg-warning/10 text-warning',
};

const Users = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  );

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
  ];

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title={t.users.title}
        description="Manage employees and system users"
        action={{
          label: t.users.addUser,
          icon: UserPlus,
          onClick: () => console.log('Add user'),
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
              {/* User Header */}
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

              {/* Stats */}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Users;
