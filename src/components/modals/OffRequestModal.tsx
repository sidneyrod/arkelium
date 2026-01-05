import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, CalendarOff, Palmtree, Clock, UserX, Stethoscope, Calendar as CalendarMonth, X } from 'lucide-react';
import { differenceInDays, startOfMonth, endOfMonth, addMonths, format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';

// Helper to format date to yyyy-MM-dd in local timezone (avoids timezone issues)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date for display
const formatDisplayDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Request Duration Types (what the user is requesting)
export type OffRequestDurationType = 'day_off' | 'multi_day_off' | 'non_consecutive_days' | 'full_month_block';

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
    selectedDates?: string[]; // For non-consecutive days
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
  non_consecutive_days: {
    label: 'Non-Consecutive Days',
    labelPt: 'Dias Não Consecutivos',
    icon: CalendarMonth,
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    description: 'Select specific days (e.g., 5, 7, 14, 16)',
    descriptionPt: 'Selecione dias específicos (ex: 5, 7, 14, 16)',
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
  const [singleDateCalendarOpen, setSingleDateCalendarOpen] = useState(false);
  const [rangeDateCalendarOpen, setRangeDateCalendarOpen] = useState(false);
  const [nonConsecutiveCalendarOpen, setNonConsecutiveCalendarOpen] = useState(false);
  
  // Non-consecutive days selection
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);

  // Handle duration type change
  const handleDurationTypeChange = (value: OffRequestDurationType) => {
    setDurationType(value);
    setDateRange(undefined);
    setSelectedMonth(undefined);
    setSelectedDates([]);
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

  // Handle single date selection with auto-close
  const handleSingleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Create date at noon to avoid timezone issues
      const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      setDateRange({ from: safeDate, to: safeDate });
      setSingleDateCalendarOpen(false);
    }
  };

  // Handle range date selection with auto-close when both dates are selected
  const handleRangeDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      // Create safe dates at noon to avoid timezone issues
      const safeFrom = new Date(range.from.getFullYear(), range.from.getMonth(), range.from.getDate(), 12, 0, 0);
      const safeTo = range.to 
        ? new Date(range.to.getFullYear(), range.to.getMonth(), range.to.getDate(), 12, 0, 0) 
        : undefined;
      setDateRange({ from: safeFrom, to: safeTo });
      
      // Auto-close when both dates are selected
      if (range.from && range.to) {
        setRangeDateCalendarOpen(false);
      }
    } else {
      setDateRange(undefined);
    }
  };

  // Handle non-consecutive date selection (toggle dates)
  const handleNonConsecutiveDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    
    setSelectedDates(prev => {
      const existingIndex = prev.findIndex(d => 
        d.getFullYear() === safeDate.getFullYear() &&
        d.getMonth() === safeDate.getMonth() &&
        d.getDate() === safeDate.getDate()
      );
      
      if (existingIndex >= 0) {
        // Remove date
        return prev.filter((_, i) => i !== existingIndex);
      } else {
        // Add date
        return [...prev, safeDate].sort((a, b) => a.getTime() - b.getTime());
      }
    });
  };

  // Remove a selected non-consecutive date
  const removeNonConsecutiveDate = (dateToRemove: Date) => {
    setSelectedDates(prev => prev.filter(d => 
      !(d.getFullYear() === dateToRemove.getFullYear() &&
        d.getMonth() === dateToRemove.getMonth() &&
        d.getDate() === dateToRemove.getDate())
    ));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (durationType === 'non_consecutive_days') {
      if (selectedDates.length === 0) {
        newErrors.date = isEnglish ? 'Select at least one date' : 'Selecione pelo menos uma data';
      }
    } else {
      if (!dateRange?.from) {
        newErrors.date = isEnglish ? 'Start date is required' : 'Data inicial é obrigatória';
      }
    }
    
    // For day_off, set end date = start date if not set
    let finalEndDate = dateRange?.to || dateRange?.from;
    
    if (durationType === 'day_off' && dateRange?.from) {
      finalEndDate = dateRange.from;
    }
    
    if (durationType !== 'non_consecutive_days' && !finalEndDate) {
      newErrors.date = isEnglish ? 'End date is required' : 'Data final é obrigatória';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    
    const legacyType = mapToLegacyType(durationType, reasonType);
    
    if (durationType === 'non_consecutive_days') {
      // For non-consecutive days, use first and last date as range, but also pass all selected dates
      const sortedDates = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());
      const firstDate = sortedDates[0];
      const lastDate = sortedDates[sortedDates.length - 1];
      
      onSubmit({
        startDate: formatLocalDate(firstDate),
        endDate: formatLocalDate(lastDate),
        reason: observation.trim(),
        requestType: legacyType,
        durationType,
        reasonType,
        selectedDates: sortedDates.map(d => formatLocalDate(d)),
      });
    } else {
      // Use formatLocalDate to prevent timezone issues
      onSubmit({
        startDate: formatLocalDate(dateRange!.from!),
        endDate: formatLocalDate(finalEndDate!),
        reason: observation.trim(),
        requestType: legacyType,
        durationType,
        reasonType,
      });
    }
    
    onOpenChange(false);
    setDateRange(undefined);
    setObservation('');
    setDurationType('day_off');
    setReasonType('personal');
    setSelectedMonth(undefined);
    setSelectedDates([]);
  };

  const daysDiff = durationType === 'non_consecutive_days'
    ? selectedDates.length
    : dateRange?.from && (dateRange?.to || dateRange?.from)
      ? differenceInDays(dateRange.to || dateRange.from, dateRange.from) + 1 
      : 0;

  const DurationIcon = durationTypeConfig[durationType].icon;

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
          
          {/* Duration Type (Day Off / Multi-Day / Non-Consecutive / Full Month) */}
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
                  : durationType === 'non_consecutive_days'
                    ? (isEnglish ? 'Select Days' : 'Selecionar Dias')
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
                      {formatDisplayDate(dateRange.from)} - {formatDisplayDate(dateRange.to!)}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {daysDiff} {isEnglish ? 'days' : 'dias'}
                    </Badge>
                  </div>
                )}
              </div>
            ) : durationType === 'day_off' ? (
              // Single date selection for day off
              <Popover open={singleDateCalendarOpen} onOpenChange={setSingleDateCalendarOpen}>
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
                      ? formatDisplayDate(dateRange.from)
                      : <span>{isEnglish ? 'Select date' : 'Selecione a data'}</span>
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={dateRange?.from}
                    onSelect={handleSingleDateSelect}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            ) : durationType === 'non_consecutive_days' ? (
              // Non-consecutive days selection
              <div className="space-y-3">
                <Popover open={nonConsecutiveCalendarOpen} onOpenChange={setNonConsecutiveCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        selectedDates.length === 0 && "text-muted-foreground",
                        errors.date && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDates.length > 0 
                        ? `${selectedDates.length} ${isEnglish ? 'days selected' : 'dias selecionados'}`
                        : <span>{isEnglish ? 'Click to select days' : 'Clique para selecionar dias'}</span>
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="single"
                      selected={undefined}
                      onSelect={handleNonConsecutiveDateSelect}
                      numberOfMonths={2}
                      disabled={(date) => date < new Date()}
                      modifiers={{
                        selected: selectedDates,
                      }}
                      modifiersStyles={{
                        selected: { 
                          backgroundColor: 'hsl(var(--primary))', 
                          color: 'hsl(var(--primary-foreground))',
                          borderRadius: '50%'
                        }
                      }}
                    />
                    <div className="p-3 border-t">
                      <p className="text-xs text-muted-foreground">
                        {isEnglish 
                          ? 'Click on dates to select/deselect. Selected days will appear below.'
                          : 'Clique nas datas para selecionar/desmarcar. Os dias selecionados aparecerão abaixo.'}
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
                
                {/* Show selected dates */}
                {selectedDates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedDates.map((date, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="gap-1 pr-1"
                      >
                        {format(date, 'dd/MM')}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => removeNonConsecutiveDate(date)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Date range selection for multi-day
              <Popover open={rangeDateCalendarOpen} onOpenChange={setRangeDateCalendarOpen}>
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
                          {formatDisplayDate(dateRange.from)} - {formatDisplayDate(dateRange.to)}
                        </>
                      ) : (
                        formatDisplayDate(dateRange.from)
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
                    onSelect={handleRangeDateSelect}
                    numberOfMonths={2}
                    disabled={(date) => date < new Date()}
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
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ {isEnglish 
                ? 'Once approved, you will be blocked from all job assignments on the selected dates.' 
                : 'Uma vez aprovado, você será bloqueado de todas as atribuições de trabalho nas datas selecionadas.'}
            </p>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isEnglish ? 'Cancel' : 'Cancelar'}
            </Button>
            <Button type="submit">
              {isEnglish ? 'Submit Request' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OffRequestModal;
