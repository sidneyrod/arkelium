import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, CalendarOff, Palmtree, Clock, UserX } from 'lucide-react';
import { format, differenceInDays, differenceInWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';

export type OffRequestType = 'time_off' | 'vacation' | 'personal';

interface OffRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (request: { 
    startDate: string; 
    endDate: string; 
    reason: string;
    requestType: OffRequestType;
  }) => void;
  employeeName?: string;
}

const requestTypeConfig = {
  time_off: { 
    label: 'Folga', 
    labelEn: 'Day Off',
    icon: Clock, 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  vacation: { 
    label: 'Férias', 
    labelEn: 'Vacation',
    icon: Palmtree, 
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
  },
  personal: { 
    label: 'Indisponibilidade Pessoal', 
    labelEn: 'Personal Unavailability',
    icon: UserX, 
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' 
  },
};

const OffRequestModal = ({ open, onOpenChange, onSubmit, employeeName }: OffRequestModalProps) => {
  const { language } = useLanguage();
  const isEnglish = language === 'en';
  
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [reason, setReason] = useState('');
  const [requestType, setRequestType] = useState<OffRequestType>('time_off');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Quick selection helpers
  const handleQuickSelect = (type: 'week' | 'month') => {
    const today = new Date();
    if (type === 'week') {
      // Next week
      const nextWeekStart = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
      const nextWeekEnd = endOfWeek(addDays(today, 7), { weekStartsOn: 1 });
      setDateRange({ from: nextWeekStart, to: nextWeekEnd });
    } else {
      // Next month
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const monthStart = startOfMonth(nextMonth);
      const monthEnd = endOfMonth(nextMonth);
      setDateRange({ from: monthStart, to: monthEnd });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!dateRange?.from) {
      newErrors.date = isEnglish ? 'Start date is required' : 'Data inicial é obrigatória';
    }
    if (!dateRange?.to) {
      newErrors.date = isEnglish ? 'End date is required' : 'Data final é obrigatória';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSubmit({
      startDate: format(dateRange!.from!, 'yyyy-MM-dd'),
      endDate: format(dateRange!.to!, 'yyyy-MM-dd'),
      reason: reason.trim(),
      requestType,
    });
    onOpenChange(false);
    setDateRange(undefined);
    setReason('');
    setRequestType('time_off');
  };

  const daysDiff = dateRange?.from && dateRange?.to 
    ? differenceInDays(dateRange.to, dateRange.from) + 1 
    : 0;

  const weeksDiff = daysDiff >= 7 ? Math.floor(daysDiff / 7) : 0;

  const TypeIcon = requestTypeConfig[requestType].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
          
          {/* Request Type */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Request Type' : 'Tipo de Solicitação'}</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as OffRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(requestTypeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{isEnglish ? config.labelEn : config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          
          {/* Quick Selection Buttons */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Quick Selection' : 'Seleção Rápida'}</Label>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickSelect('week')}
                className="flex-1"
              >
                {isEnglish ? 'Next Week' : 'Próxima Semana'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => handleQuickSelect('month')}
                className="flex-1"
              >
                {isEnglish ? 'Next Month' : 'Próximo Mês'}
              </Button>
            </div>
          </div>
          
          {/* Date Range */}
          <div className="space-y-2">
            <Label>{isEnglish ? 'Period' : 'Período'}</Label>
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
            {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}
            
            {/* Period Summary */}
            {daysDiff > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("border", requestTypeConfig[requestType].color)}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {daysDiff} {isEnglish ? (daysDiff === 1 ? 'day' : 'days') : (daysDiff === 1 ? 'dia' : 'dias')}
                </Badge>
                {weeksDiff >= 1 && (
                  <Badge variant="secondary">
                    {weeksDiff} {isEnglish ? (weeksDiff === 1 ? 'week' : 'weeks') : (weeksDiff === 1 ? 'semana' : 'semanas')}
                  </Badge>
                )}
                {daysDiff >= 30 && (
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                    ~{Math.round(daysDiff / 30)} {isEnglish ? (Math.round(daysDiff / 30) === 1 ? 'month' : 'months') : (Math.round(daysDiff / 30) === 1 ? 'mês' : 'meses')}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Reason (Optional) */}
          <div className="space-y-2">
            <Label>
              {isEnglish ? 'Reason' : 'Motivo'} 
              <span className="text-muted-foreground ml-1">
                ({isEnglish ? 'optional' : 'opcional'})
              </span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
                ? '⚠️ This request requires admin approval. While pending, you may still be scheduled. Once approved, you will be completely blocked from the schedule during this period.' 
                : '⚠️ Esta solicitação requer aprovação do administrador. Enquanto pendente, você ainda poderá ser agendado. Após aprovação, você será completamente bloqueado da agenda neste período.'}
            </p>
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {isEnglish ? 'Cancel' : 'Cancelar'}
            </Button>
            <Button type="submit" disabled={!dateRange?.from || !dateRange?.to}>
              {isEnglish ? 'Submit Request' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default OffRequestModal;