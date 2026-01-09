import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Search, MoreHorizontal, UserPlus, Loader2 } from 'lucide-react';
import { UserWithRole } from '@/pages/AccessRoles';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AddUserModal from '@/components/modals/AddUserModal';

interface UsersTabProps {
  users: UserWithRole[];
  loading: boolean;
  onUpdate: () => void;
}

const roleColors: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  cleaner: 'bg-muted text-muted-foreground',
};

const UsersTab = ({ users, loading, onUpdate }: UsersTabProps) => {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserWithRole | null>(null);

  const filteredUsers = users.filter((user) => {
    const searchLower = search.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  });

  const handleStatusChange = async (targetUser: UserWithRole) => {
    const newStatus = targetUser.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ status: newStatus })
        .eq('user_id', targetUser.id);
      if (error) throw error;
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to change status');
    }
  };

  const canModifyUser = (targetUser: UserWithRole) => {
    if (targetUser.id === currentUser?.id) return false;
    if (targetUser.role === 'admin') return false;
    return true;
  };

  const getInitials = (firstName: string, lastName: string) => 
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-medium">Users ({filteredUsers.length})</CardTitle>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={roleColors[user.role]}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy HH:mm') : 'Never'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(user)}>Edit</DropdownMenuItem>
                          {canModifyUser(user) && (
                            <DropdownMenuItem onClick={() => handleStatusChange(user)} className={user.status === 'active' ? 'text-destructive' : 'text-green-600'}>
                              {user.status === 'active' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <AddUserModal
        open={showAddModal || !!editUser}
        onOpenChange={(open) => { if (!open) { setShowAddModal(false); setEditUser(null); } }}
        onSubmit={onUpdate}
        editUser={editUser ? { 
          id: editUser.id, 
          name: `${editUser.firstName} ${editUser.lastName}`.trim(), 
          email: editUser.email, 
          phone: editUser.phone || '',
          address: '',
          city: '',
          province_address: '',
          country: 'Canada',
          postalCode: '',
          role: editUser.role as 'admin' | 'manager' | 'cleaner',
          isActive: editUser.status === 'active',
        } : undefined}
      />
    </Card>
  );
};

export default UsersTab;
