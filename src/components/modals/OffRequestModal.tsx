import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, CalendarOff, Palmtree, Clock, UserX, Stethoscope, Calendar as CalendarMonth } from 'lucide-react';
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';

// Request Duration Types (what the user is requesting)
export type OffRequestDurationType = 'day_off' | 'multi_day_off' | 'full_month_block';

// Reason Types (why they need it)
export type OffRequestReasonType = 'personal' | 'medical' | 'vacation' | 'other';

// Legacy type for backwards compatibility with database
export type OffRequestType = 'time_off' | 'vacation' | 'personal';

interface OffRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: { 
    startDate: string; 
    endDate: string; 
    reason: string;
    requestType: OffRequestType;
    durationType?: OffRequestDurationType;
    reasonType?: OffRequestReasonType;
  }) => void;
  employeeName?: string;
}

const durationTypeConfig = {
  day_off: { 
    label: 'Day Off', 
    labelPt: 'Folga (1 dia)',
    icon: Clock, 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    description: 'Single day off',
    descriptionPt: 'Folga de um único dia',
  },
  multi_day_off: { 
    label: 'Multi-Day Off', 
    labelPt: 'Folga (Múltiplos dias)',
    icon: CalendarOff, 
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    description: 'Multiple consecutive days',
    descriptionPt: 'Múltiplos dias consecutivos',
  },
  full_month_block: { 
    label: 'Full Month Block', 
    labelPt: 'Bloqueio do Mês Inteiro',
    icon: CalendarMonth, 
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
    description: 'Block an entire month',
    descriptionPt: 'Bloquear um mês inteiro',
  },
};

const reasonTypeConfig = {
  personal: { 
    label: 'Personal', 
    labelPt: 'Pessoal',
    icon: UserX, 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  medical: { 
    label: 'Medical', 
    labelPt: 'Médico',
    icon: Stethoscope, 
    color: 'bg-red-500/10 text-red-500 border-red-500/20' 
  },
  vacation: { 
    label: 'Vacation', 
    labelPt: 'Férias',
    icon: Palmtree, 
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
  },
  other: { 
    label: 'Other', 
    labelPt: 'Outro',
    icon: CalendarOff, 
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' 
  },
};

// Map duration + reason to legacy request_type for database compatibility
const mapToLegacyType = (durationType: OffRequestDurationType, reasonType: OffRequestReasonType): OffRequestType => {
  if (reasonType === 'vacation') return 'vacation';
  if (reasonType === 'personal' || reasonType === 'other') return 'personal';
  return 'time_off';
};

const OffRequestModal = ({ open, onOpenChange, onSubmit, employeeName }: OffRequestModalProps) => {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  
  const [durationType, setDurationType] = useState<OffRequestDurationType>('day_off');
  const [reasonType, setReasonType] = useState<OffRequestReasonType>('personal');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [observation, setObservation] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState<Date | undefined>();

  // Handle duration type change
  const handleDurationTypeChange = (value: OffRequestDurationType) => {
    setDurationType(value);
    setDateRange(undefined);
    setSelectedMonth(undefined);
    setErrors({});
  };

  // Quick select full month
  const handleFullMonthSelect = (monthsAhead: number) => {
    const targetMonth = addMonths(new Date(), monthsAhead);
    const monthStart = startOfMonth(targetMonth);
    const monthEnd = endOfMonth(targetMonth);
    setDateRange({ from: monthStart, to: monthEnd });
    setSelectedMonth(targetMonth);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!dateRange?.from) {
      newErrors.date = isEnglish ? 'Start date is required' : 'Data inicial é obrigatória';
    }
    
    // For day_off, set end date = start date if not set
    let finalEndDate = dateRange?.to || dateRange?.from;
    
    if (durationType === 'day_off' && dateRange?.from) {
      finalEndDate = dateRange.from;
    }
    
    if (!finalEndDate) {
      newErrors.date = isEnglish ? 'End date is required' : 'Data final é obrigatória';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    const legacyType = mapToLegacyType(durationType, reasonType);
    
    onSubmit({
      startDate: format(dateRange!.from!, 'yyyy-MM-dd'),
      endDate: format(finalEndDate!, 'yyyy-MM-dd'),
      reason: observation.trim(),
      requestType: legacyType,
      durationType,
      reasonType,
    });
    
    onOpenChange(false);
    setDateRange(undefined);
    setObservation('');
    setDurationType('day_off');
    setReasonType('personal');
    setSelectedMonth(undefined);
  };

  const daysDiff = dateRange?.from && (dateRange?.to || dateRange?.from)
    ? differenceInDays(dateRange.to || dateRange.from, dateRange.from) + 1 
    : 0;

  const DurationIcon = durationTypeConfig[durationType].icon;
  const ReasonIcon = reasonTypeConfig[reasonType].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarOff className="h-5 w-5 text-primary" />
            {isEnglish ? 'Off Request' : 'Solicitação de Folga'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {employeeName && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {isEnglish ? 'Requesting for' : 'Solicitante'}
              </p>
              <p className="font-medium">{employeeName}</p>
            </div>
          )}
          
          {/* Duration Type (Day Off / Multi-Day / Full Month) */}
          <div className="space-y-2">
            <Label className="font-semibold">
              {isEnglish ? 'Request Type' : 'Tipo de Solicitação'} *
            </Label>
            <Select value={durationType} onValueChange={(v) => handleDurationTypeChange(v as OffRequestDurationType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(durationTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <div className="flex flex-col">
                          <span>{isEnglish ? config.label : config.labelPt}</span>
                        </div>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isEnglish 
                ? durationTypeConfig[durationType].description 
                : durationTypeConfig[durationType].descriptionPt}
            </p>
          </div>
          
          {/* Date Selection - varies by duration type */}
          <div className="space-y-2">
            <Label className="font-semibold">
              {durationType === 'day_off' 
                ? (isEnglish ? 'Date' : 'Data')
                : durationType === 'full_month_block'
                  ? (isEnglish ? 'Month' : 'Mês')
                  : (isEnglish ? 'Date Range' : 'Período')} *
            </Label>
            
            {durationType === 'full_month_block' ? (
              // Quick month selection for full month block
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((monthsAhead) => {
                    const targetMonth = addMonths(new Date(), monthsAhead);
                    const isSelected = selectedMonth && 
                      selectedMonth.getMonth() === targetMonth.getMonth() &&
                      selectedMonth.getFullYear() === targetMonth.getFullYear();
                    return (
                      <Button
                        key={monthsAhead}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        onClick={() => handleFullMonthSelect(monthsAhead)}
                        className="w-full"
                      >
                        {format(targetMonth, 'MMM yyyy')}
                      </Button>
                    );
                  })}
                </div>
                {dateRange?.from && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <span className="font-medium">
                      {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to!, 'dd/MM/yyyy')}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {daysDiff} {isEnglish ? 'days' : 'dias'}
                    </Badge>
                  </div>
                )}
              </div>
            ) : durationType === 'day_off' ? (
              // Single date selection for day off
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange?.from && "text-muted-foreground",
                      errors.date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from 
                      ? format(dateRange.from, 'dd/MM/yyyy')
                      : <span>{isEnglish ? 'Select date' : 'Selecione a data'}</span>
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={(date) => setDateRange(date ? { from: date, to: date } : undefined)}
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            ) : (
              // Date range selection for multi-day
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateRange && "text-muted-foreground",
                      errors.date && "border-destructive"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      <span>{isEnglish ? 'Select dates' : 'Selecione as datas'}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date()}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
            
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            
            {/* Period Summary */}
            {daysDiff > 0 && durationType !== 'full_month_block' && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("border", durationTypeConfig[durationType].color)}>
                  <DurationIcon className="h-3 w-3 mr-1" />
                  {daysDiff} {isEnglish ? (daysDiff === 1 ? 'day' : 'days') : (daysDiff === 1 ? 'dia' : 'dias')}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Reason Type */}
          <div className="space-y-2">
            <Label className="font-semibold">
              {isEnglish ? 'Reason' : 'Motivo'} *
            </Label>
            <Select value={reasonType} onValueChange={(v) => setReasonType(v as OffRequestReasonType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reasonTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{isEnglish ? config.label : config.labelPt}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Observation (Optional) */}
          <div className="space-y-2">
            <Label>
              {isEnglish ? 'Observation' : 'Observação'} 
              <span className="text-muted-foreground ml-1">
                ({isEnglish ? 'optional' : 'opcional'})
              </span>
            </Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder={isEnglish 
                ? 'Add additional details if needed...' 
                : 'Adicione detalhes se necessário...'}
              rows={3}
              maxLength={500}
            />
          </div>
          
          {/* Warning Message */}
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning-foreground">
              {isEnglish 
                ? '⚠️ This request requires admin approval. Once approved, you will be completely blocked from the schedule during this period. No jobs can be assigned to you.' 
                : '⚠️ Esta solicitação requer aprovação do administrador. Após aprovação, você será completamente bloqueado da agenda neste período. Nenhum serviço poderá ser atribuído a você.'}
            </p>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isEnglish ? 'Cancel' : 'Cancelar'}
            </Button>
            <Button type="submit" disabled={!dateRange?.from}>
              {isEnglish ? 'Submit Request' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OffRequestModal;
