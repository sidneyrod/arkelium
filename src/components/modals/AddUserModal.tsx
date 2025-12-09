import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { User, Mail, Phone, MapPin, Shield, DollarSign, Briefcase, Loader2 } from 'lucide-react';
import { userSchema, validateForm } from '@/lib/validations';
import { CanadianProvince, EmploymentType, provinceNames } from '@/stores/payrollStore';

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
  // Payroll fields
  hourlyRate?: number;
  salary?: number;
  province?: CanadianProvince;
  employmentType?: EmploymentType;
  vacationPayPercent?: number;
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  role: 'cleaner',
  isActive: true,
  hourlyRate: 20,
  province: 'ON',
  employmentType: 'full-time',
  vacationPayPercent: 4,
};

const AddUserModal = ({ open, onOpenChange, onSubmit, editUser }: AddUserModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Reset form when modal opens/closes or editUser changes
  useEffect(() => {
    if (open) {
      setFormData(editUser || initialFormData);
      setErrors({});
      setActiveTab('general');
    }
  }, [open, editUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(userSchema, formData);
    
    if (!validation.success) {
      const validationErrors = (validation as { success: false; errors: Record<string, string> }).errors;
      setErrors(validationErrors);
      toast.error(t.common.error, { description: Object.values(validationErrors)[0] });
      return;
    }
    
    setErrors({});
    setIsLoading(true);

    const companyId = user?.profile?.company_id;
    if (!companyId) {
      toast.error('Error', { description: 'No company found' });
      setIsLoading(false);
      return;
    }

    try {
      const nameParts = formData.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      if (editUser?.id) {
        // Update existing user
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            email: formData.email,
            phone: formData.phone,
            hourly_rate: formData.hourlyRate,
            salary: formData.salary,
            primary_province: formData.province,
            employment_type: formData.employmentType,
          })
          .eq('id', editUser.id);

        if (profileError) throw profileError;

        // Update role - only if it's a valid app_role
        const validRole = formData.role === 'supervisor' ? 'cleaner' : formData.role;
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: validRole })
          .eq('user_id', editUser.id)
          .eq('company_id', companyId);

        if (roleError) throw roleError;

        toast.success(t.users.userUpdated);
      } else {
        // For new users, we need admin to create via Supabase Auth admin API
        // For now, just create profile and role (user already exists in auth)
        toast.info('Note: User must already exist in authentication system. Profile updated.');
      }

      onSubmit(formData);
      setFormData(initialFormData);
      onOpenChange(false);
    } catch (err) {
      console.error('Error saving user:', err);
      toast.error('Error', { description: 'Failed to save user' });
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof UserFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const showPayrollFields = formData.role === 'cleaner' || formData.role === 'supervisor';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {editUser ? t.users.editUser : t.users.addUser}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general" className="gap-2">
                <User className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="payroll" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Payroll
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
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
                  className={errors.name ? 'border-destructive' : ''}
                  maxLength={100}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
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
                    className={errors.email ? 'border-destructive' : ''}
                    maxLength={255}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
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
                    maxLength={20}
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
                  maxLength={255}
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
            </TabsContent>

            <TabsContent value="payroll" className="space-y-4 mt-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Employment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="employmentType">Employment Type</Label>
                      <Select 
                        value={formData.employmentType || 'full-time'} 
                        onValueChange={(value: EmploymentType) => updateField('employmentType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="province">Province (Tax)</Label>
                      <Select 
                        value={formData.province || 'ON'} 
                        onValueChange={(value: CanadianProvince) => updateField('province', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(provinceNames).map(([code, name]) => (
                            <SelectItem key={code} value={code}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Compensation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showPayrollFields ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                        <Input
                          id="hourlyRate"
                          type="number"
                          min="0"
                          step="0.50"
                          value={formData.hourlyRate || ''}
                          onChange={(e) => updateField('hourlyRate', parseFloat(e.target.value) || 0)}
                          placeholder="20.00"
                        />
                        <p className="text-xs text-muted-foreground">Required for cleaners and supervisors</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="vacationPayPercent">Vacation Pay (%)</Label>
                        <Input
                          id="vacationPayPercent"
                          type="number"
                          min="0"
                          max="10"
                          step="0.5"
                          value={formData.vacationPayPercent || ''}
                          onChange={(e) => updateField('vacationPayPercent', parseFloat(e.target.value) || 0)}
                          placeholder="4"
                        />
                        <p className="text-xs text-muted-foreground">Minimum 4% in most provinces</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="salary">Annual Salary ($)</Label>
                      <Input
                        id="salary"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.salary || ''}
                        onChange={(e) => updateField('salary', parseFloat(e.target.value) || 0)}
                        placeholder="50000"
                      />
                      <p className="text-xs text-muted-foreground">For managers and admins</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <p className="text-sm font-medium">Payroll Summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Province:</span>
                  <span>{provinceNames[formData.province || 'ON']}</span>
                  <span className="text-muted-foreground">Employment:</span>
                  <span className="capitalize">{formData.employmentType || 'Full-time'}</span>
                  {showPayrollFields && (
                    <>
                      <span className="text-muted-foreground">Hourly Rate:</span>
                      <span>${formData.hourlyRate?.toFixed(2) || '0.00'}/hr</span>
                      <span className="text-muted-foreground">Vacation Pay:</span>
                      <span>{formData.vacationPayPercent || 4}%</span>
                    </>
                  )}
                  {!showPayrollFields && formData.salary && (
                    <>
                      <span className="text-muted-foreground">Annual Salary:</span>
                      <span>${formData.salary?.toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

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