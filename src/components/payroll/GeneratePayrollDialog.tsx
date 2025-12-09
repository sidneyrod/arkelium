import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Clock } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface GeneratePayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (startDate: string, endDate: string) => Promise<void>;
  isGenerating: boolean;
  employeeCount: number;
}

type FrequencyType = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export function GeneratePayrollDialog({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  employeeCount,
}: GeneratePayrollDialogProps) {
  const [frequency, setFrequency] = useState<FrequencyType>('biweekly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Calculate dates based on frequency
  useEffect(() => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (frequency) {
      case 'weekly':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'biweekly':
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = addDays(start, 13);
        break;
      case 'semimonthly':
        if (today.getDate() <= 15) {
          start = startOfMonth(today);
          end = new Date(today.getFullYear(), today.getMonth(), 15);
        } else {
          start = new Date(today.getFullYear(), today.getMonth(), 16);
          end = endOfMonth(today);
        }
        break;
      case 'monthly':
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      default:
        start = startOfWeek(today, { weekStartsOn: 1 });
        end = addDays(start, 13);
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  }, [frequency]);

  const handleGenerate = async () => {
    await onGenerate(startDate, endDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Generate Payroll Period
          </DialogTitle>
          <DialogDescription>
            Create a new payroll period and calculate employee hours from completed jobs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pay Frequency</Label>
            <Select value={frequency} onValueChange={(v: FrequencyType) => setFrequency(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="semimonthly">Semi-monthly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {employeeCount} employee{employeeCount !== 1 ? 's' : ''} will be included
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 rounded-lg bg-info/10 border border-info/20">
            <Clock className="h-4 w-4 text-info" />
            <span className="text-sm text-info">
              Hours will be calculated from completed jobs in this period
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Payroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
