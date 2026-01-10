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
import { toast } from '@/hooks/use-toast';
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
  city: string;
  province_address: string;
  country: string;
  postalCode: string;
  role: 'admin' | 'manager' | 'cleaner';
  roleId?: string; // custom_role ID
  roleName?: string; // custom_role name for display
  isActive: boolean;
  // Payroll fields
  hourlyRate?: number;
  salary?: number;
  province?: CanadianProvince;
  employmentType?: EmploymentType;
  vacationPayPercent?: number;
}

interface CustomRole {
  id: string;
  name: string;
  baseRole: 'admin' | 'manager' | 'cleaner';
}

const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province_address: '',
  country: 'Canada',
  postalCode: '',
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
  const [availableRoles, setAvailableRoles] = useState<CustomRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Fetch available roles from custom_roles table
  useEffect(() => {
    const fetchRoles = async () => {
      if (!open) return;
      setLoadingRoles(true);
      try {
        const { data, error } = await supabase
          .from('custom_roles')
          .select('id, name, base_role')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        setAvailableRoles((data || []).map(r => ({
          id: r.id,
          name: r.name,
          baseRole: r.base_role as 'admin' | 'manager' | 'cleaner'
        })));
      } catch (error) {
        console.error('Error fetching roles:', error);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, [open]);

  // Reset form when modal opens/closes or editUser changes
  useEffect(() => {
    if (open) {
      if (editUser) {
        // When editing, set form data from editUser
        setFormData(editUser);
      } else {
        setFormData(initialFormData);
      }
      setErrors({});
      setActiveTab('general');
    }
  }, [open, editUser]);

  // Sync roleId when availableRoles loads (fixes race condition)
  useEffect(() => {
    if (open && editUser?.roleId && availableRoles.length > 0 && !loadingRoles) {
      const matchingRole = availableRoles.find(r => r.id === editUser.roleId);
      if (matchingRole) {
        setFormData(prev => ({
          ...prev,
          roleId: editUser.roleId,
          role: matchingRole.baseRole,
          roleName: matchingRole.name
        }));
      }
    }
  }, [open, editUser?.roleId, availableRoles, loadingRoles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(userSchema, formData);
    
    if (!validation.success) {
      const validationErrors = (validation as { success: false; errors: Record<string, string> }).errors;
      setErrors(validationErrors);
      toast({ title: t.common.error, description: Object.values(validationErrors)[0], variant: 'destructive' });
      return;
    }
    
    setErrors({});
    setIsLoading(true);

    const companyId = user?.profile?.company_id;
    if (!companyId) {
      toast({ title: 'Error', description: 'No company found', variant: 'destructive' });
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
            address: formData.address,
            city: formData.city,
            province: formData.province_address,
            country: formData.country,
            postal_code: formData.postalCode,
            hourly_rate: formData.hourlyRate,
            salary: formData.salary,
            primary_province: formData.province,
            employment_type: formData.employmentType,
          })
          .eq('id', editUser.id);

        if (profileError) throw profileError;

        // Get the selected custom role to determine base role
        const selectedRole = availableRoles.find(r => r.id === formData.roleId);
        const baseRole = selectedRole?.baseRole || formData.role;

        // Update role - only if it's a valid app_role
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ 
            role: baseRole,
            custom_role_id: formData.roleId || null
          })
          .eq('user_id', editUser.id)
          .eq('company_id', companyId);

        if (roleError) throw roleError;

        toast({ title: t.common.success, description: t.users.userUpdated });
      } else {
        // Get the selected custom role
        const selectedRole = availableRoles.find(r => r.id === formData.roleId);
        const baseRole = selectedRole?.baseRole || formData.role;

        // Create new user via edge function
        const { data: session } = await supabase.auth.getSession();
        
        if (!session.session?.access_token) {
          throw new Error('Not authenticated');
        }

        const response = await supabase.functions.invoke('create-user', {
          body: {
            email: formData.email,
            firstName,
            lastName,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            province_address: formData.province_address,
            country: formData.country,
            postalCode: formData.postalCode,
            role: baseRole,
            roleId: formData.roleId, // Pass custom_role_id
            companyId,
            hourlyRate: formData.hourlyRate,
            salary: formData.salary,
            province: formData.province,
            employmentType: formData.employmentType,
          },
        });

        if (response.error) {
          throw new Error(response.error.message || 'Failed to create user');
        }

        if (response.data?.error) {
          throw new Error(response.data.error);
        }

        toast({ title: t.common.success, description: 'User created successfully' });
      }

      onSubmit(formData);
      setFormData(initialFormData);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error saving user:', err);
      toast({ title: 'Error', description: err.message || 'Failed to save user', variant: 'destructive' });
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

  const selectedRole = availableRoles.find(r => r.id === formData.roleId);
  const showPayrollFields = (selectedRole?.baseRole || formData.role) === 'cleaner';
  const isNewUser = !editUser?.id;

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
                  placeholder="Full name"
                  className={`placeholder:text-muted-foreground/50 ${errors.name ? 'border-destructive' : ''}`}
                  maxLength={100}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.users.role}
                </Label>
                {loadingRoles ? (
                  <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading roles...</span>
                  </div>
                ) : availableRoles.length > 0 ? (
                  <Select 
                    value={formData.roleId || ''} 
                    onValueChange={(value: string) => {
                      const role = availableRoles.find(r => r.id === value);
                      updateField('roleId', value);
                      if (role) {
                        setFormData(prev => ({ ...prev, role: role.baseRole, roleName: role.name, roleId: value }));
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.users.selectRole} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <span className="flex items-center gap-2">
                            {role.name}
                            <span className="text-xs text-muted-foreground">({role.baseRole})</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
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
                      <SelectItem value="cleaner">{t.users.cleaner}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
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
                    placeholder="email@example.com"
                    className={`placeholder:text-muted-foreground/50 ${errors.email ? 'border-destructive' : ''}`}
                    maxLength={255}
                    disabled={!!editUser?.id}
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
                    placeholder="(000) 000-0000"
                    className="placeholder:text-muted-foreground/50"
                    maxLength={20}
                  />
                </div>
              </div>

              {/* Default Password Info for new users */}
              {isNewUser && (
                <div className="p-3 rounded-lg border border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> New users will receive a default password: <code className="bg-background px-1 py-0.5 rounded text-xs">Admin123!</code>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    They will be required to change it on their first login.
                  </p>
                </div>
              )}


              {/* Address Fields */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Address
                </Label>
                
                <Input
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Street address"
                  className="placeholder:text-muted-foreground/50"
                  maxLength={255}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                    className="placeholder:text-muted-foreground/50"
                    maxLength={100}
                  />
                  <Input
                    value={formData.province_address}
                    onChange={(e) => updateField('province_address', e.target.value)}
                    placeholder="Province / Territory"
                    className="placeholder:text-muted-foreground/50"
                    maxLength={100}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="Country"
                    className="placeholder:text-muted-foreground/50"
                    maxLength={100}
                  />
                  <Input
                    value={formData.postalCode}
                    onChange={(e) => updateField('postalCode', e.target.value)}
                    placeholder="Postal code"
                    className="placeholder:text-muted-foreground/50"
                    maxLength={20}
                  />
                </div>
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
                          placeholder="0.00"
                          className="placeholder:text-muted-foreground/50"
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
                          className="placeholder:text-muted-foreground/50"
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
                        placeholder="0"
                        className="placeholder:text-muted-foreground/50"
                      />
                      <p className="text-xs text-muted-foreground">For managers and admins</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddUserModal;
