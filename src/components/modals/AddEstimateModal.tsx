import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyStore } from '@/stores/companyStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Calculator } from 'lucide-react';
import { Estimate } from '@/stores/estimateStore';
import { estimateSchema, validateForm } from '@/lib/validations';

interface AddEstimateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (estimate: Omit<Estimate, 'id' | 'createdAt'>) => void;
  estimate?: Estimate;
}

const AddEstimateModal = ({ open, onOpenChange, onSave, estimate }: AddEstimateModalProps) => {
  const { t } = useLanguage();
  const { estimateConfig } = useCompanyStore();
  const isEditing = !!estimate;
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Get fee amounts from store
  const getFeeAmount = (name: string, fallback: number) => {
    const fee = estimateConfig.extraFees.find(f => f.name.toLowerCase().includes(name.toLowerCase()));
    return fee?.amount || fallback;
  };

  const petsFee = getFeeAmount('pets', 15);
  const childrenFee = getFeeAmount('children', 10);
  const greenCleaningFee = getFeeAmount('green', 20);
  const cleanFridgeFee = getFeeAmount('fridge', 25);
  const cleanOvenFee = getFeeAmount('oven', 30);
  const cleanCabinetsFee = getFeeAmount('cabinet', 40);
  const cleanWindowsFee = getFeeAmount('window', 35);
  
  const [formData, setFormData] = useState({
    clientName: estimate?.clientName || '',
    clientEmail: estimate?.clientEmail || '',
    clientPhone: estimate?.clientPhone || '',
    squareFootage: estimate?.squareFootage || 1500,
    bedrooms: estimate?.bedrooms || 2,
    bathrooms: estimate?.bathrooms || 1,
    livingAreas: estimate?.livingAreas || 1,
    hasKitchen: estimate?.hasKitchen ?? true,
    serviceType: estimate?.serviceType || 'standard' as const,
    frequency: estimate?.frequency || 'biweekly' as const,
    includePets: estimate?.includePets || false,
    includeChildren: estimate?.includeChildren || false,
    includeGreen: estimate?.includeGreen || false,
    includeFridge: estimate?.includeFridge || false,
    includeOven: estimate?.includeOven || false,
    includeCabinets: estimate?.includeCabinets || false,
    includeWindows: estimate?.includeWindows || false,
    notes: estimate?.notes || '',
    status: estimate?.status || 'draft' as const,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      if (estimate) {
        setFormData({
          clientName: estimate.clientName,
          clientEmail: estimate.clientEmail,
          clientPhone: estimate.clientPhone,
          squareFootage: estimate.squareFootage,
          bedrooms: estimate.bedrooms,
          bathrooms: estimate.bathrooms,
          livingAreas: estimate.livingAreas,
          hasKitchen: estimate.hasKitchen,
          serviceType: estimate.serviceType,
          frequency: estimate.frequency,
          includePets: estimate.includePets,
          includeChildren: estimate.includeChildren,
          includeGreen: estimate.includeGreen,
          includeFridge: estimate.includeFridge,
          includeOven: estimate.includeOven,
          includeCabinets: estimate.includeCabinets,
          includeWindows: estimate.includeWindows,
          notes: estimate.notes || '',
          status: estimate.status,
        });
      }
      setErrors({});
    }
  }, [open, estimate]);

  // Calculate total in real-time
  const calculateTotal = () => {
    const hourlyRate = estimateConfig.defaultHourlyRate;
    const baseHours = formData.squareFootage / 400;
    
    const serviceMultipliers = {
      standard: 1,
      deep: 1.5,
      moveOut: 2,
      commercial: 1.3,
    };
    
    const frequencyDiscounts = {
      oneTime: 1,
      monthly: 0.95,
      biweekly: 0.9,
      weekly: 0.85,
    };
    
    const roomHours = (formData.bedrooms * 0.5) + (formData.bathrooms * 0.75) + (formData.livingAreas * 0.5) + (formData.hasKitchen ? 0.75 : 0);
    
    let totalHours = (baseHours + roomHours) * serviceMultipliers[formData.serviceType];
    let basePrice = totalHours * hourlyRate * frequencyDiscounts[formData.frequency];
    
    let extras = 0;
    if (formData.includePets) extras += petsFee;
    if (formData.includeChildren) extras += childrenFee;
    if (formData.includeGreen) extras += greenCleaningFee;
    if (formData.includeFridge) extras += cleanFridgeFee;
    if (formData.includeOven) extras += cleanOvenFee;
    if (formData.includeCabinets) extras += cleanCabinetsFee;
    if (formData.includeWindows) extras += cleanWindowsFee;
    
    return Math.round(basePrice + extras);
  };

  const totalAmount = calculateTotal();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationData = {
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      serviceType: formData.serviceType,
      frequency: formData.frequency === 'biweekly' ? 'biweekly' : formData.frequency,
      squareFootage: formData.squareFootage,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      hourlyRate: estimateConfig.defaultHourlyRate,
    };

    const result = validateForm(estimateSchema, validationData);
    if ('errors' in result && !result.success) {
      setErrors(result.errors);
      return;
    }

    setErrors({});
    onSave({
      ...formData,
      hourlyRate: estimateConfig.defaultHourlyRate,
      totalAmount,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            {isEditing ? t.calculator.editEstimate : t.calculator.addEstimate}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.calculator.clientInfo}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.clientName}</Label>
                <Input
                  value={formData.clientName}
                  onChange={(e) => { setFormData(prev => ({ ...prev, clientName: e.target.value })); setErrors(prev => ({ ...prev, clientName: '' })); }}
                  maxLength={100}
                  className={`h-9 ${errors.clientName ? 'border-destructive' : ''}`}
                />
                {errors.clientName && <p className="text-xs text-destructive">{errors.clientName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.email}</Label>
                <Input
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => { setFormData(prev => ({ ...prev, clientEmail: e.target.value })); setErrors(prev => ({ ...prev, clientEmail: '' })); }}
                  maxLength={255}
                  className={`h-9 ${errors.clientEmail ? 'border-destructive' : ''}`}
                />
                {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t.calculator.phone}</Label>
              <Input
                value={formData.clientPhone}
                onChange={(e) => { setFormData(prev => ({ ...prev, clientPhone: e.target.value })); setErrors(prev => ({ ...prev, clientPhone: '' })); }}
                maxLength={20}
                className={`h-9 sm:max-w-[50%] ${errors.clientPhone ? 'border-destructive' : ''}`}
              />
              {errors.clientPhone && <p className="text-xs text-destructive">{errors.clientPhone}</p>}
            </div>
          </div>
          
          <Separator />
          
          {/* Property Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.calculator.roomConfiguration}</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t.calculator.squareFootage}</Label>
                <span className="text-xs font-medium text-primary">{formData.squareFootage.toLocaleString()} sq ft</span>
              </div>
              <Slider
                value={[formData.squareFootage]}
                onValueChange={(v) => setFormData(prev => ({ ...prev, squareFootage: v[0] }))}
                min={500}
                max={10000}
                step={100}
              />
            </div>
            
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.bedrooms}</Label>
                <Select 
                  value={formData.bedrooms.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, bedrooms: parseInt(v) }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.bathrooms}</Label>
                <Select 
                  value={formData.bathrooms.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, bathrooms: parseInt(v) }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.livingAreas}</Label>
                <Select 
                  value={formData.livingAreas.toString()} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, livingAreas: parseInt(v) }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end pb-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="kitchen"
                    checked={formData.hasKitchen}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, hasKitchen: !!checked }))}
                  />
                  <Label htmlFor="kitchen" className="cursor-pointer text-xs">{t.calculator.kitchen}</Label>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Service Options */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.calculator.serviceOptions}</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.serviceType}</Label>
                <Select 
                  value={formData.serviceType} 
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, serviceType: v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Clean</SelectItem>
                    <SelectItem value="deep">Deep Clean (+50%)</SelectItem>
                    <SelectItem value="moveOut">Move-out Clean (+100%)</SelectItem>
                    <SelectItem value="commercial">Commercial Clean (+30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">{t.calculator.cleaningFrequency}</Label>
                <Select 
                  value={formData.frequency} 
                  onValueChange={(v: any) => setFormData(prev => ({ ...prev, frequency: v }))}
                >
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oneTime">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly (-5%)</SelectItem>
                    <SelectItem value="biweekly">Bi-weekly (-10%)</SelectItem>
                    <SelectItem value="weekly">Weekly (-15%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Extras */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t.calculator.extras}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pets"
                    checked={formData.includePets}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includePets: !!checked }))}
                  />
                  <Label htmlFor="pets" className="cursor-pointer text-xs">{t.calculator.includePets}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${petsFee}</span>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="children"
                    checked={formData.includeChildren}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeChildren: !!checked }))}
                  />
                  <Label htmlFor="children" className="cursor-pointer text-xs">{t.calculator.includeChildren}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${childrenFee}</span>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="green"
                    checked={formData.includeGreen}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeGreen: !!checked }))}
                  />
                  <Label htmlFor="green" className="cursor-pointer text-xs">{t.calculator.includeGreen}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${greenCleaningFee}</span>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fridge"
                    checked={formData.includeFridge}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeFridge: !!checked }))}
                  />
                  <Label htmlFor="fridge" className="cursor-pointer text-xs">{t.calculator.includeFridge}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${cleanFridgeFee}</span>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="oven"
                    checked={formData.includeOven}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeOven: !!checked }))}
                  />
                  <Label htmlFor="oven" className="cursor-pointer text-xs">{t.calculator.includeOven}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${cleanOvenFee}</span>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="cabinets"
                    checked={formData.includeCabinets}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeCabinets: !!checked }))}
                  />
                  <Label htmlFor="cabinets" className="cursor-pointer text-xs">{t.calculator.includeCabinets}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${cleanCabinetsFee}</span>
              </div>
              
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 sm:col-span-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="windows"
                    checked={formData.includeWindows}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, includeWindows: !!checked }))}
                  />
                  <Label htmlFor="windows" className="cursor-pointer text-xs">{t.calculator.includeWindows}</Label>
                </div>
                <span className="text-xs text-muted-foreground">+${cleanWindowsFee}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">{t.common.notes}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t.calculator.notesPlaceholder}
              rows={2}
              maxLength={1000}
              className="text-sm"
            />
          </div>
          
          {/* Total */}
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span className="font-medium">{t.calculator.totalEstimate}</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-primary">${totalAmount}</span>
                  <span className="text-xs text-muted-foreground ml-1">/ {t.calculator.perVisit}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="sm">
              {t.common.cancel}
            </Button>
            <Button type="submit" size="sm">
              {isEditing ? t.common.update : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEstimateModal;