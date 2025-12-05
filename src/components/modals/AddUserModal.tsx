import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { User, Mail, Phone, MapPin, Shield } from 'lucide-react';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (user: UserFormData) => void;
  editUser?: UserFormData | null;
}

export interface UserFormData {
  id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  role: 'admin' | 'manager' | 'supervisor' | 'cleaner';
  isActive: boolean;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  role: 'cleaner',
  isActive: true,
};

const AddUserModal = ({ open, onOpenChange, onSubmit, editUser }: AddUserModalProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<UserFormData>(editUser || initialFormData);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));

    onSubmit(formData);
    toast({
      title: t.common.success,
      description: editUser ? t.users.userUpdated : t.users.userCreated,
    });
    setFormData(initialFormData);
    onOpenChange(false);
    setIsLoading(false);
  };

  const updateField = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {editUser ? t.users.editUser : t.users.addUser}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {t.users.name}
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              {t.users.role}
            </Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: UserFormData['role']) => updateField('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.users.selectRole} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t.users.admin}</SelectItem>
                <SelectItem value="manager">{t.users.manager}</SelectItem>
                <SelectItem value="supervisor">{t.users.supervisor}</SelectItem>
                <SelectItem value="cleaner">{t.users.cleaner}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {t.users.phone}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(416) 555-0100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {t.company.address}
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main Street, Toronto, ON"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="active" className="cursor-pointer">{t.users.activeUser}</Label>
              <p className="text-sm text-muted-foreground">{t.users.activeUserDescription}</p>
            </div>
            <Switch
              id="active"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateField('isActive', checked)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t.common.loading : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
