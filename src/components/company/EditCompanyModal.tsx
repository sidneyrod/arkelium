import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Plus, X, Search } from 'lucide-react';
import { CANADIAN_TIMEZONES } from '@/hooks/useTimezone';
import { useGlobalActivitySuggestions } from '@/hooks/useCompanyActivities';

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
  const [activityPopoverOpen, setActivityPopoverOpen] = useState(false);
  const [activitySearch, setActivitySearch] = useState('');
  
  const { data: activitySuggestions = [], isLoading: loadingSuggestions } = useGlobalActivitySuggestions();
  
  // Filter suggestions: not selected and matches search
  const availableSuggestions = activitySuggestions.filter(
    s => !selectedActivities.some(a => a.code === s.code)
  ).filter(
    s => activitySearch === '' || 
         s.label.toLowerCase().includes(activitySearch.toLowerCase())
  );

  useEffect(() => {
    if (company) {
      setFormData(company);
      setSelectedActivities(company.activities || []);
    } else {
      setFormData(defaultFormData);
      setSelectedActivities([]);
    }
    setActivitySearch('');
    setActivityPopoverOpen(false);
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

  const addActivity = (code: string, label: string) => {
    if (!selectedActivities.some(a => a.code === code)) {
      setSelectedActivities(prev => [...prev, { code, label }]);
    }
    setActivitySearch('');
  };

  const addCustomActivity = (label: string) => {
    if (!label.trim()) return;
    
    // Generate a code from the label
    const code = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    
    // Check if already exists
    if (!selectedActivities.find(a => a.code === code)) {
      setSelectedActivities(prev => [...prev, { code, label: label.trim() }]);
    }
    setActivitySearch('');
    setActivityPopoverOpen(false);
  };

  const removeActivity = (code: string) => {
    setSelectedActivities(prev => prev.filter(a => a.code !== code));
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

          {/* Activities Section - Only show for create mode */}
          {mode === 'create' && (
            <div className="space-y-3 pt-2 border-t">
              <Label className="text-base font-medium">Services Offered</Label>
              <p className="text-sm text-muted-foreground">
                Select the types of services this company provides. You can add more later in Settings.
              </p>
              
              {/* Selected activities as chips */}
              <div className="flex flex-wrap gap-2 min-h-[36px]">
                {selectedActivities.map(activity => (
                  <Badge 
                    key={activity.code} 
                    variant="secondary" 
                    className="gap-1 py-1.5 px-3 text-sm"
                  >
                    {activity.label}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive transition-colors" 
                      onClick={() => removeActivity(activity.code)} 
                    />
                  </Badge>
                ))}
                
                {/* Add button with popover */}
                <Popover open={activityPopoverOpen} onOpenChange={setActivityPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add Service
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    {/* Search input */}
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                          placeholder="Search services..." 
                          value={activitySearch}
                          onChange={(e) => setActivitySearch(e.target.value)}
                          className="h-8 pl-8"
                        />
                      </div>
                    </div>
                    
                    {/* Suggestions list */}
                    <ScrollArea className="h-[200px]">
                      <div className="p-1">
                        {loadingSuggestions ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : availableSuggestions.length > 0 ? (
                          availableSuggestions.map(activity => (
                            <button
                              key={activity.code}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent transition-colors"
                              onClick={() => addActivity(activity.code, activity.label)}
                            >
                              {activity.label}
                            </button>
                          ))
                        ) : activitySearch && (
                          <p className="text-sm text-muted-foreground px-3 py-2">
                            No matching services found
                          </p>
                        )}
                        
                        {/* Custom activity option */}
                        <div className="border-t mt-1 pt-1">
                          <button
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent text-muted-foreground transition-colors flex items-center gap-1"
                            onClick={() => {
                              const label = window.prompt('Enter custom service name:');
                              if (label?.trim()) {
                                addCustomActivity(label);
                              }
                            }}
                          >
                            <Plus className="h-3 w-3" />
                            Add custom service...
                          </button>
                        </div>
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>
              
              {selectedActivities.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Click "Add Service" to select the types of services this company provides.
                </p>
              )}
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
