import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle, XCircle, Calendar, ArrowRight } from 'lucide-react';

export type VisitOutcome = 'visited' | 'no_show' | 'rescheduled' | 'follow_up_needed';

export interface VisitCompletionData {
  outcome: VisitOutcome;
  notes?: string;
  nextAction?: string;
}

interface VisitCompletionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: {
    id: string;
    clientName: string;
    address: string;
    date: string;
    time: string;
    visitPurpose?: string;
  } | null;
  onComplete: (jobId: string, data: VisitCompletionData) => Promise<void>;
}

const outcomeOptions: { value: VisitOutcome; label: string; description: string; icon: React.ReactNode }[] = [
  { 
    value: 'visited', 
    label: 'Visited', 
    description: 'Successfully completed the visit',
    icon: <CheckCircle className="h-4 w-4 text-success" />
  },
  { 
    value: 'no_show', 
    label: 'No Show', 
    description: 'Client was not available',
    icon: <XCircle className="h-4 w-4 text-destructive" />
  },
  { 
    value: 'rescheduled', 
    label: 'Rescheduled', 
    description: 'Visit was rescheduled for another date',
    icon: <Calendar className="h-4 w-4 text-warning" />
  },
  { 
    value: 'follow_up_needed', 
    label: 'Follow-up Needed', 
    description: 'Requires additional follow-up',
    icon: <ArrowRight className="h-4 w-4 text-info" />
  },
];

const VisitCompletionModal = ({ open, onOpenChange, job, onComplete }: VisitCompletionModalProps) => {
  const [outcome, setOutcome] = useState<VisitOutcome>('visited');
  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!job) return;
    
    setIsSubmitting(true);
    try {
      await onComplete(job.id, {
        outcome,
        notes: notes.trim() || undefined,
        nextAction: nextAction.trim() || undefined,
      });
      
      // Reset form
      setOutcome('visited');
      setNotes('');
      setNextAction('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error completing visit:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl lg:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>Complete Visit</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2 flex-1 overflow-y-auto">
          {/* Visit Info - Compact */}
          <div className="rounded-lg bg-muted/50 p-2.5 flex flex-wrap gap-x-4 gap-y-1">
            <p className="font-medium text-foreground">{job.clientName}</p>
            <p className="text-sm text-muted-foreground">{job.address}</p>
            <p className="text-sm text-muted-foreground">{job.date} at {job.time}</p>
            {job.visitPurpose && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Purpose:</span> {job.visitPurpose}
              </p>
            )}
          </div>

          {/* Outcome Selection - 4 columns on larger screens */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Visit Outcome *</Label>
            <RadioGroup
              value={outcome}
              onValueChange={(value) => setOutcome(value as VisitOutcome)}
              className="grid grid-cols-2 lg:grid-cols-4 gap-2"
            >
              {outcomeOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-colors min-h-[70px]"
                  >
                    {option.icon}
                    <span className="mt-1 text-xs font-medium text-center">{option.label}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes and Next Action in row on large screens */}
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-sm">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any observations..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nextAction" className="text-sm">Next Action</Label>
              <Input
                id="nextAction"
                placeholder="e.g., Send quote, Schedule cleaning..."
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t mt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VisitCompletionModal;
