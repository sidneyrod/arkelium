import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Building, Home, User, Mail, Phone, MapPin } from 'lucide-react';

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
  const [formData, setFormData] = useState<ClientFormData>(editClient || initialFormData);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 500));

    onSubmit(formData);
    toast({
      title: t.common.success,
      description: editClient ? t.clients.clientUpdated : t.clients.clientCreated,
    });
    setFormData(initialFormData);
    onOpenChange(false);
    setIsLoading(false);
  };

  const updateField = (field: keyof ClientFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t.clients.name}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Client name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t.clients.type}</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: ClientFormData['type']) => updateField('type', value)}
              >
                <SelectTrigger>
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
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact" className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              {t.clients.companyContact}
            </Label>
            <Input
              id="contact"
              value={formData.contactPerson}
              onChange={(e) => updateField('contactPerson', e.target.value)}
              placeholder="Contact person name"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                {t.clients.phone}
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(416) 555-0100"
                required
              />
            </div>

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
                placeholder="contact@client.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.clients.notes}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Additional notes about this client..."
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="active" className="cursor-pointer">{t.clients.activeClient}</Label>
              <p className="text-sm text-muted-foreground">{t.clients.activeClientDescription}</p>
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

export default AddClientModal;
