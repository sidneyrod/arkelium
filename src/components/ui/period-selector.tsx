import * as React from "react";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, addDays } from "date-fns";
import { CalendarIcon, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export type PeriodPreset = 'today' | 'this_week' | 'last_week' | 'biweekly' | 'this_month' | 'last_month' | 'custom';

interface PeriodSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

const periodLabels = {
  en: {
    today: 'Today',
    this_week: 'This Week',
    last_week: 'Last Week',
    biweekly: 'Last 2 Weeks',
    this_month: 'This Month',
    last_month: 'Last Month',
    custom: 'Custom Range',
    selectPeriod: 'Select Period',
    from: 'From',
    to: 'To',
    apply: 'Apply',
    cancel: 'Cancel',
  },
  fr: {
    today: "Aujourd'hui",
    this_week: 'Cette Semaine',
    last_week: 'Semaine Dernière',
    biweekly: '2 Dernières Semaines',
    this_month: 'Ce Mois',
    last_month: 'Mois Dernier',
    custom: 'Période Personnalisée',
    selectPeriod: 'Sélectionner Période',
    from: 'De',
    to: 'À',
    apply: 'Appliquer',
    cancel: 'Annuler',
  },
};

export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const { language } = useLanguage();
  const labels = periodLabels[language] || periodLabels.en;
  
  const [selectedPreset, setSelectedPreset] = React.useState<PeriodPreset>('this_month');
  const [customStart, setCustomStart] = React.useState<Date | undefined>(value.startDate);
  const [customEnd, setCustomEnd] = React.useState<Date | undefined>(value.endDate);
  const [isOpen, setIsOpen] = React.useState(false);
  const [showCustomCalendar, setShowCustomCalendar] = React.useState(false);

  const getPresetRange = (preset: PeriodPreset): DateRange => {
    const today = new Date();
    
    switch (preset) {
      case 'today':
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
      case 'this_week':
        return { startDate: startOfWeek(today, { weekStartsOn: 1 }), endDate: endOfWeek(today, { weekStartsOn: 1 }) };
      case 'last_week':
        const lastWeekStart = subDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
        return { startDate: lastWeekStart, endDate: addDays(lastWeekStart, 6) };
      case 'biweekly':
        return { startDate: subDays(today, 13), endDate: endOfDay(today) };
      case 'this_month':
        return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
      case 'last_month':
        const lastMonth = subDays(startOfMonth(today), 1);
        return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
      case 'custom':
        return value;
      default:
        return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
    }
  };

  const handlePresetSelect = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    if (preset === 'custom') {
      setShowCustomCalendar(true);
      setCustomStart(value.startDate);
      setCustomEnd(value.endDate);
    } else {
      const range = getPresetRange(preset);
      onChange(range);
      setIsOpen(false);
      setShowCustomCalendar(false);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onChange({ startDate: startOfDay(customStart), endDate: endOfDay(customEnd) });
      setIsOpen(false);
      setShowCustomCalendar(false);
    }
  };

  const handleCustomCancel = () => {
    setShowCustomCalendar(false);
    setSelectedPreset('this_month');
  };

  const getDisplayLabel = (): string => {
    if (selectedPreset === 'custom') {
      return `${format(value.startDate, 'MMM d')} - ${format(value.endDate, 'MMM d, yyyy')}`;
    }
    return labels[selectedPreset];
  };

  const presets: { key: PeriodPreset; label: string; dividerAfter?: boolean }[] = [
    { key: 'today', label: labels.today },
    { key: 'this_week', label: labels.this_week },
    { key: 'last_week', label: labels.last_week },
    { key: 'biweekly', label: labels.biweekly, dividerAfter: true },
    { key: 'this_month', label: labels.this_month },
    { key: 'last_month', label: labels.last_month, dividerAfter: true },
    { key: 'custom', label: labels.custom },
  ];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>{getDisplayLabel()}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn(
            "p-0 max-h-[80vh] overflow-y-auto",
            showCustomCalendar ? "w-auto" : "w-48"
          )} 
          align="start"
          side="bottom"
          sideOffset={4}
          avoidCollisions={true}
          collisionPadding={16}
        >
          {!showCustomCalendar ? (
            // Preset Selection Menu
            <div className="py-1">
              {presets.map((preset) => (
                <React.Fragment key={preset.key}>
                  <button
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center justify-between transition-colors",
                      selectedPreset === preset.key && "bg-muted"
                    )}
                    onClick={() => handlePresetSelect(preset.key)}
                  >
                    <span>{preset.label}</span>
                    {selectedPreset === preset.key && preset.key !== 'custom' && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                  {preset.dividerAfter && (
                    <div className="h-px bg-border my-1" />
                  )}
                </React.Fragment>
              ))}
            </div>
          ) : (
            // Custom Date Range Picker
            <div className="flex flex-col">
              <div className="p-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{labels.from}</label>
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={setCustomStart}
                      className="p-0 pointer-events-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{labels.to}</label>
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={setCustomEnd}
                      disabled={(date) => customStart ? date < customStart : false}
                      className="p-0 pointer-events-auto"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 p-4 border-t bg-background sticky bottom-0">
                <Button 
                  variant="outline"
                  onClick={handleCustomCancel} 
                  className="flex-1"
                >
                  {labels.cancel}
                </Button>
                <Button 
                  onClick={handleCustomApply} 
                  className="flex-1"
                  disabled={!customStart || !customEnd}
                >
                  {labels.apply}
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Display current range inline */}
      {selectedPreset !== 'custom' && (
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {format(value.startDate, 'MMM d')} - {format(value.endDate, 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );
}

export default PeriodSelector;
