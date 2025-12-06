import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyStore } from '@/stores/companyStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { contractSchema, validateForm } from '@/lib/validations';
import { 
  FileText, 
  CalendarIcon, 
  DollarSign, 
  Clock, 
  MapPin, 
  FileDown
} from 'lucide-react';

interface AddContractModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (contract: ContractFormData) => void;
  editContract?: ContractFormData | null;
  clients: { id: string; name: string }[];
}

export interface ContractFormData {
  id?: string;
  clientId: string;
  clientName?: string;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'cancelled';
  type: 'recurring' | 'one-time';
  startDate: Date | null;
  endDate: Date | null;
  hoursPerWeek: number;
  hourlyRate: number;
  billingFrequency: 'weekly' | 'bi-weekly' | 'monthly';
  cleaningDays: string[];
  timeWindow: string;
  serviceLocation: string;
  cleaningScope: string;
  specialNotes: string;
  generatePdfAutomatically: boolean;
  allowPdfDownload: boolean;
}

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const AddContractModal = ({ open, onOpenChange, onSubmit, editContract, clients }: AddContractModalProps) => {
  const { t } = useLanguage();
  const { estimateConfig } = useCompanyStore();
  
  const initialFormData: ContractFormData = {
    clientId: '',
    status: 'draft',
    type: 'recurring',
    startDate: null,
    endDate: null,
    hoursPerWeek: 4,
    hourlyRate: estimateConfig.defaultHourlyRate,
    billingFrequency: 'bi-weekly',
    cleaningDays: [],
    timeWindow: '09:00 - 17:00',
    serviceLocation: '',
    cleaningScope: '',
    specialNotes: '',
    generatePdfAutomatically: true,
    allowPdfDownload: true,
  };

  const [formData, setFormData] = useState<ContractFormData>(editContract || initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (editContract) {
      setFormData(editContract);
    } else {
      setFormData({ ...initialFormData, hourlyRate: estimateConfig.defaultHourlyRate });
    }
    setErrors({});
  }, [editContract, estimateConfig.defaultHourlyRate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationData = {
      clientId: formData.clientId,
      status: formData.status,
      type: formData.type,
      startDate: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : '',
      endDate: formData.endDate ? format(formData.endDate, 'yyyy-MM-dd') : '',
      hoursPerWeek: formData.hoursPerWeek,
      hourlyRate: formData.hourlyRate,
      billingFrequency: formData.billingFrequency === 'bi-weekly' ? 'biweekly' : formData.billingFrequency,
      cleaningScope: formData.cleaningScope,
      specialNotes: formData.specialNotes,
    };

    const result = validateForm(contractSchema, validationData);
    if ('errors' in result && !result.success) {
      setErrors(result.errors);
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    onSubmit(formData);
    toast({
      title: t.common.success,
      description: editContract ? t.contracts.contractUpdated : t.contracts.contractCreated,
    });
    setFormData(initialFormData);
    setErrors({});
    onOpenChange(false);
    setIsLoading(false);
  };

  const updateField = <K extends keyof ContractFormData>(field: K, value: ContractFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      cleaningDays: prev.cleaningDays.includes(day)
        ? prev.cleaningDays.filter(d => d !== day)
        : [...prev.cleaningDays, day]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {editContract ? t.contracts.editContract : t.contracts.addContract}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Client & Status */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.client}</Label>
              <Select 
                value={formData.clientId} 
                onValueChange={(value) => { updateField('clientId', value); setErrors(prev => ({ ...prev, clientId: '' })); }}
              >
                <SelectTrigger className={`h-9 ${errors.clientId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t.contracts.selectClient} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.status}</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: ContractFormData['status']) => updateField('status', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t.contracts.draft}</SelectItem>
                  <SelectItem value="pending">{t.contracts.pending}</SelectItem>
                  <SelectItem value="active">{t.contracts.active}</SelectItem>
                  <SelectItem value="completed">{t.contracts.completed}</SelectItem>
                  <SelectItem value="cancelled">{t.contracts.cancelled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contract Type & Dates */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.contractType}</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: ContractFormData['type']) => updateField('type', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recurring">{t.contracts.recurring}</SelectItem>
                  <SelectItem value="one-time">{t.contracts.oneTime}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.startDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-sm",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.startDate ? format(formData.startDate, "MMM d, yyyy") : t.contracts.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate || undefined}
                    onSelect={(date) => updateField('startDate', date || null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.endDate}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-9 justify-start text-left font-normal text-sm",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {formData.endDate ? format(formData.endDate, "MMM d, yyyy") : t.contracts.pickDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate || undefined}
                    onSelect={(date) => updateField('endDate', date || null)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Hours & Rate */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Clock className="h-3 w-3 text-muted-foreground" />
                {t.contracts.hoursPerWeek}
              </Label>
              <Input
                type="number"
                min="1"
                value={formData.hoursPerWeek}
                onChange={(e) => updateField('hoursPerWeek', parseFloat(e.target.value) || 0)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                {t.contracts.hourlyRate}
              </Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.hourlyRate}
                  onChange={(e) => updateField('hourlyRate', parseFloat(e.target.value) || 0)}
                  className="pl-6 h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.billingFrequency}</Label>
              <Select 
                value={formData.billingFrequency} 
                onValueChange={(value: ContractFormData['billingFrequency']) => updateField('billingFrequency', value)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">{t.contracts.weekly}</SelectItem>
                  <SelectItem value="bi-weekly">{t.contracts.biweekly}</SelectItem>
                  <SelectItem value="monthly">{t.contracts.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cleaning Days */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.contracts.cleaningDays}</Label>
            <div className="flex flex-wrap gap-1.5">
              {weekDays.map(day => (
                <Button
                  key={day}
                  type="button"
                  variant={formData.cleaningDays.includes(day) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDay(day)}
                  className="h-7 px-2.5 text-xs"
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>

          {/* Time Window & Location */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.contracts.timeWindow}</Label>
              <Input
                value={formData.timeWindow}
                onChange={(e) => updateField('timeWindow', e.target.value)}
                placeholder="09:00 - 17:00"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {t.contracts.serviceLocation}
              </Label>
              <Input
                value={formData.serviceLocation}
                onChange={(e) => updateField('serviceLocation', e.target.value)}
                placeholder="Service address"
                className="h-9"
              />
            </div>
          </div>

          {/* Cleaning Scope */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.contracts.cleaningScope}</Label>
            <Textarea
              value={formData.cleaningScope}
              onChange={(e) => updateField('cleaningScope', e.target.value)}
              placeholder="Describe the cleaning scope and services included..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Special Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">{t.contracts.specialNotes}</Label>
            <Textarea
              value={formData.specialNotes}
              onChange={(e) => updateField('specialNotes', e.target.value)}
              placeholder="Any special instructions or notes..."
              rows={2}
              className="text-sm"
            />
          </div>

          {/* PDF Options */}
          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
            <h4 className="text-xs font-medium flex items-center gap-2">
              <FileDown className="h-3.5 w-3.5 text-primary" />
              {t.contracts.pdfOptions}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generatePdf"
                  checked={formData.generatePdfAutomatically}
                  onCheckedChange={(checked) => updateField('generatePdfAutomatically', !!checked)}
                />
                <Label htmlFor="generatePdf" className="text-xs font-normal cursor-pointer">
                  {t.contracts.generatePdfAutomatically}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowDownload"
                  checked={formData.allowPdfDownload}
                  onCheckedChange={(checked) => updateField('allowPdfDownload', !!checked)}
                />
                <Label htmlFor="allowDownload" className="text-xs font-normal cursor-pointer">
                  {t.contracts.allowPdfDownload}
                </Label>
              </div>
            </div>
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

export default AddContractModal;