import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { DateRange } from "react-day-picker";

const labels = {
  en: {
    selectDate: 'Select Date',
    selectRange: 'Select Date Range',
    from: 'From',
    to: 'To',
    apply: 'Apply',
    cancel: 'Cancel',
  },
  fr: {
    selectDate: 'Sélectionner la date',
    selectRange: 'Sélectionner la période',
    from: 'De',
    to: 'À',
    apply: 'Appliquer',
    cancel: 'Annuler',
  },
};

interface DatePickerDialogProps {
  mode: 'single' | 'range';
  selected?: Date | DateRange;
  onSelect: (value: Date | DateRange | undefined) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  placeholder?: string;
  dateFormat?: string;
  numberOfMonths?: number;
}

export function DatePickerDialog({
  mode,
  selected,
  onSelect,
  disabled,
  className,
  placeholder,
  dateFormat = 'MMM d, yyyy',
  numberOfMonths = mode === 'range' ? 2 : 1,
}: DatePickerDialogProps) {
  const { language } = useLanguage();
  const t = labels[language] || labels.en;
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [tempSelected, setTempSelected] = React.useState<Date | DateRange | undefined>(selected);

  React.useEffect(() => {
    if (isOpen) {
      setTempSelected(selected);
    }
  }, [isOpen, selected]);

  const handleApply = () => {
    onSelect(tempSelected);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setTempSelected(selected);
    setIsOpen(false);
  };

  const getDisplayValue = (): string => {
    if (mode === 'single') {
      const date = selected as Date | undefined;
      return date ? format(date, dateFormat) : (placeholder || t.selectDate);
    } else {
      const range = selected as DateRange | undefined;
      if (range?.from) {
        if (range.to) {
          return `${format(range.from, 'MMM d')} - ${format(range.to, dateFormat)}`;
        }
        return format(range.from, dateFormat);
      }
      return placeholder || t.selectRange;
    }
  };

  const hasSelection = mode === 'single' 
    ? !!(selected as Date) 
    : !!((selected as DateRange)?.from);

  const canApply = mode === 'single'
    ? !!(tempSelected as Date)
    : !!((tempSelected as DateRange)?.from && (tempSelected as DateRange)?.to);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !hasSelection && "text-muted-foreground",
          className
        )}
        onClick={() => setIsOpen(true)}
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {getDisplayValue()}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-fit">
          <DialogHeader>
            <DialogTitle>
              {mode === 'single' ? t.selectDate : t.selectRange}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {mode === 'single' ? (
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={tempSelected as Date | undefined}
                  onSelect={(date) => setTempSelected(date)}
                  disabled={disabled}
                  className="pointer-events-auto rounded-md border"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.from}</label>
                  <Calendar
                    mode="range"
                    selected={tempSelected as DateRange | undefined}
                    onSelect={(range) => setTempSelected(range)}
                    disabled={disabled}
                    numberOfMonths={1}
                    className="pointer-events-auto rounded-md border"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t.to}</label>
                  <Calendar
                    mode="range"
                    selected={tempSelected as DateRange | undefined}
                    onSelect={(range) => setTempSelected(range)}
                    disabled={disabled}
                    numberOfMonths={1}
                    defaultMonth={(tempSelected as DateRange)?.to || (tempSelected as DateRange)?.from || new Date()}
                    className="pointer-events-auto rounded-md border"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              {t.cancel}
            </Button>
            <Button onClick={handleApply} disabled={!canApply}>
              {t.apply}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default DatePickerDialog;
