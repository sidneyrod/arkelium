import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Building2 } from 'lucide-react';
import { CANADIAN_TIMEZONES } from '@/hooks/useTimezone';

const canadianProvinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Northwest Territories', 'Nunavut', 'Yukon'
];

export interface CompanyFormData {
  trade_name: string;
  legal_name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  email: string;
  phone: string;
  website: string;
  timezone: string;
}

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanyFormData | null;
  isLoading: boolean;
  onSave: (data: CompanyFormData) => Promise<void>;
  mode: 'create' | 'edit';
}

const defaultFormData: CompanyFormData = {
  trade_name: '',
  legal_name: '',
  address: '',
  city: '',
  province: 'Ontario',
  postal_code: '',
  email: '',
  phone: '',
  website: '',
  timezone: 'America/Toronto'
};

export default function EditCompanyModal({
  open,
  onOpenChange,
  company,
  isLoading,
  onSave,
  mode
}: EditCompanyModalProps) {
  const [formData, setFormData] = useState<CompanyFormData>(defaultFormData);

  useEffect(() => {
    if (company) {
      setFormData(company);
    } else {
      setFormData(defaultFormData);
    }
  }, [company, open]);

  const handleSubmit = async () => {
    if (!formData.trade_name.trim() || !formData.legal_name.trim()) {
      return;
    }
    await onSave(formData);
  };

  const updateField = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {mode === 'create' ? 'Register New Company' : 'Edit Company'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_name">Company Name *</Label>
              <Input
                id="trade_name"
                value={formData.trade_name}
                onChange={(e) => updateField('trade_name', e.target.value)}
                placeholder="Trade name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Legal Name *</Label>
              <Input
                id="legal_name"
                value={formData.legal_name}
                onChange={(e) => updateField('legal_name', e.target.value)}
                placeholder="Legal business name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select 
                value={formData.province} 
                onValueChange={(value) => updateField('province', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {canadianProvinces.map(province => (
                    <SelectItem key={province} value={province}>{province}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => updateField('postal_code', e.target.value)}
                placeholder="A1A 1A1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="contact@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={formData.timezone} 
                onValueChange={(value) => updateField('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {CANADIAN_TIMEZONES.map(tz => (
                    <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || !formData.trade_name.trim() || !formData.legal_name.trim()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Register Company' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
