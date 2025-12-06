import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Building, Home, User, Mail, Phone, MapPin } from 'lucide-react';
import { clientSchema, validateForm } from '@/lib/validations';

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (client: ClientFormData) => void;
  editClient?: ClientFormData | null;
}

export interface ClientFormData {
  id?: string;
  name: string;
  type: 'residential' | 'commercial';
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes: string;
  isActive: boolean;
}

const initialFormData: ClientFormData = {
  name: '',
  type: 'residential',
  address: '',
  contactPerson: '',
  phone: '',
  email: '',
  notes: '',
  isActive: true,
};

const AddClientModal = ({ open, onOpenChange, onSubmit, editClient }: AddClientModalProps) => {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData(editClient || initialFormData);
      setErrors({});
    }
  }, [open, editClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm(clientSchema, formData);
    
    if (!validation.success) {
      const validationErrors = (validation as { success: false; errors: Record<string, string> }).errors;
      setErrors(validationErrors);
      toast.error(t.common.error, { description: Object.values(validationErrors)[0] });
      return;
    }
    
    setErrors({});
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    onSubmit(formData);
    toast.success(editClient ? t.clients.clientUpdated : t.clients.clientCreated);
    setFormData(initialFormData);
    onOpenChange(false);
    setIsLoading(false);
  };

  const updateField = (field: keyof ClientFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'commercial' ? (
              <Building className="h-5 w-5 text-info" />
            ) : (
              <Home className="h-5 w-5 text-success" />
            )}
            {editClient ? t.clients.editClient : t.clients.addClient}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs">{t.clients.name}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={t.clients.name}
                className={`h-9 ${errors.name ? 'border-destructive' : ''}`}
                maxLength={100}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type" className="text-xs">{t.clients.type}</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: ClientFormData['type']) => updateField('type', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      {t.clients.residential}
                    </div>
                  </SelectItem>
                  <SelectItem value="commercial">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      {t.clients.commercial}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {t.company.address}
            </Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="123 Main Street, Toronto, ON"
              className={`h-9 ${errors.address ? 'border-destructive' : ''}`}
              maxLength={255}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contact" className="flex items-center gap-1.5 text-xs">
              <User className="h-3 w-3 text-muted-foreground" />
              {t.clients.companyContact}
            </Label>
            <Input
              id="contact"
              value={formData.contactPerson}
              onChange={(e) => updateField('contactPerson', e.target.value)}
              placeholder={t.clients.companyContact}
              className="h-9"
              maxLength={100}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs">
                <Phone className="h-3 w-3 text-muted-foreground" />
                {t.clients.phone}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(416) 555-0100"
                className={`h-9 ${errors.phone ? 'border-destructive' : ''}`}
                maxLength={20}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="flex items-center gap-1.5 text-xs">
                <Mail className="h-3 w-3 text-muted-foreground" />
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contact@client.com"
                className={`h-9 ${errors.email ? 'border-destructive' : ''}`}
                maxLength={255}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs">{t.clients.notes}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder={t.clients.notes}
              rows={2}
              maxLength={1000}
              className="text-sm"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="active" className="cursor-pointer text-sm">{t.clients.activeClient}</Label>
              <p className="text-xs text-muted-foreground">{t.clients.activeClientDescription}</p>
            </div>
            <Switch
              id="active"
              checked={formData.isActive}
              onCheckedChange={(checked) => updateField('isActive', checked)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="sm">
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? t.common.loading : t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientModal;