import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Building2, Plus, X } from 'lucide-react';
import { CANADIAN_TIMEZONES } from '@/hooks/useTimezone';
import { ACTIVITY_CODES } from '@/hooks/useCompanyActivities';

const canadianProvinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Northwest Territories', 'Nunavut', 'Yukon'
];

export interface ActivitySelection {
  code: string;
  label: string;
}

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
  activities?: ActivitySelection[];
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
  timezone: 'America/Toronto',
  activities: []
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
  const [selectedActivities, setSelectedActivities] = useState<ActivitySelection[]>([]);
  const [customActivityLabel, setCustomActivityLabel] = useState('');

  useEffect(() => {
    if (company) {
      setFormData(company);
      setSelectedActivities(company.activities || []);
    } else {
      setFormData(defaultFormData);
      setSelectedActivities([]);
    }
    setCustomActivityLabel('');
  }, [company, open]);

  const handleSubmit = async () => {
    if (!formData.trade_name.trim() || !formData.legal_name.trim()) {
      return;
    }
    await onSave({ ...formData, activities: selectedActivities });
  };

  const updateField = (field: keyof CompanyFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleActivity = (code: string, label: string) => {
    setSelectedActivities(prev => {
      const exists = prev.find(a => a.code === code);
      if (exists) {
        return prev.filter(a => a.code !== code);
      }
      return [...prev, { code, label }];
    });
  };

  const addCustomActivity = () => {
    if (!customActivityLabel.trim()) return;
    
    // Generate a code from the label
    const code = customActivityLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if already exists
    if (selectedActivities.find(a => a.code === code)) {
      setCustomActivityLabel('');
      return;
    }
    
    setSelectedActivities(prev => [...prev, { code, label: customActivityLabel.trim() }]);
    setCustomActivityLabel('');
  };

  const removeCustomActivity = (code: string) => {
    setSelectedActivities(prev => prev.filter(a => a.code !== code));
  };

  // Get custom activities (not in ACTIVITY_CODES)
  const customActivities = selectedActivities.filter(
    a => !Object.keys(ACTIVITY_CODES).includes(a.code)
  );

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

          {/* Activities Section - Only show for create mode */}
          {mode === 'create' && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-base font-medium">Services Offered</Label>
              <p className="text-sm text-muted-foreground">
                Select the types of services this company provides. You can add more later in Settings.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ACTIVITY_CODES).map(([code, activity]) => (
                  <div key={code} className="flex items-center space-x-2">
                    <Checkbox
                      id={`activity-${code}`}
                      checked={selectedActivities.some(a => a.code === code)}
                      onCheckedChange={() => toggleActivity(code, activity.label)}
                    />
                    <label
                      htmlFor={`activity-${code}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {activity.label}
                    </label>
                  </div>
                ))}
              </div>

              {/* Custom activities display */}
              {customActivities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customActivities.map(activity => (
                    <div
                      key={activity.code}
                      className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md text-sm"
                    >
                      <span>{activity.label}</span>
                      <button
                        type="button"
                        onClick={() => removeCustomActivity(activity.code)}
                        className="hover:bg-primary/20 rounded p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add custom activity */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom service type..."
                  value={customActivityLabel}
                  onChange={(e) => setCustomActivityLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomActivity();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addCustomActivity}
                  disabled={!customActivityLabel.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
