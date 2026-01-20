import * as React from "react";
import { format, startOfDay, endOfDay, startOfMonth } from "date-fns";
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

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface PeriodSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const periodLabels = {
  en: {
    selectRange: 'Select Range',
    from: 'From',
    to: 'To',
    apply: 'Apply',
    cancel: 'Cancel',
  },
  fr: {
    selectRange: 'Sélectionner Période',
    from: 'De',
    to: 'À',
    apply: 'Appliquer',
    cancel: 'Annuler',
  },
};

// Helper to get default date range (first day of current month to today)
export function getDefaultDateRange(): DateRange {
  const today = new Date();
  return {
    startDate: startOfMonth(today),
    endDate: endOfDay(today),
  };
}

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const { language } = useLanguage();
  const labels = periodLabels[language] || periodLabels.en;
  
  const [customStart, setCustomStart] = React.useState<Date | undefined>(value.startDate);
  const [customEnd, setCustomEnd] = React.useState<Date | undefined>(value.endDate);
  const [showCalendarDialog, setShowCalendarDialog] = React.useState(false);

  // Sync local state when value prop changes
  React.useEffect(() => {
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
  }, [value.startDate, value.endDate]);

  const handleApply = () => {
    if (customStart && customEnd) {
      onChange({ startDate: startOfDay(customStart), endDate: endOfDay(customEnd) });
      setShowCalendarDialog(false);
    }
  };

  const handleCancel = () => {
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
    setShowCalendarDialog(false);
  };

  const handleOpenDialog = () => {
    setCustomStart(value.startDate);
    setCustomEnd(value.endDate);
    setShowCalendarDialog(true);
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button 
        variant="outline" 
        className="min-w-[200px] justify-start"
        onClick={handleOpenDialog}
      >
        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
        <span>
          {format(value.startDate, 'MMM d')} - {format(value.endDate, 'MMM d, yyyy')}
        </span>
      </Button>

      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="max-w-fit">
          <DialogHeader>
            <DialogTitle>{labels.selectRange}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{labels.from}</label>
              <Calendar
                mode="single"
                selected={customStart}
                onSelect={setCustomStart}
                disabled={(date) => customEnd ? date > customEnd : false}
                className="p-0 pointer-events-auto rounded-md border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{labels.to}</label>
              <Calendar
                mode="single"
                selected={customEnd}
                onSelect={setCustomEnd}
                disabled={(date) => customStart ? date < customStart : false}
                className="p-0 pointer-events-auto rounded-md border"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              {labels.cancel}
            </Button>
            <Button onClick={handleApply} disabled={!customStart || !customEnd || customStart > customEnd}>
              {labels.apply}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PeriodSelector;
