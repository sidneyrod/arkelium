import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Calendar, User, MapPin, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';
import { notifyJobCancelled } from '@/hooks/useNotifications';

interface JobData {
  id: string;
  clientName: string;
  employeeName: string;
  date: string;
  time?: string;
  address?: string;
  employeeId?: string;
  jobType?: 'cleaning' | 'visit';
}

interface CancelJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobData | null;
  onSuccess?: () => void;
}

const CancelJobModal = ({ open, onOpenChange, job, onSuccess }: CancelJobModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [notifyCleaner, setNotifyCleaner] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleCancel = async () => {
    if (!job || !reason.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'cancelled',
          cancel_reason: reason.trim(),
          cancelled_by: user?.id,
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      if (error) throw error;

      // Send notification to cleaner if requested
      if (notifyCleaner && job.employeeId) {
        await notifyJobCancelled(
          job.employeeId,
          job.clientName,
          job.date,
          job.id
        );
      }

      toast.success('Job cancelled successfully');
      setReason('');
      setNotifyCleaner(true);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error cancelling job:', error);
      toast.error('Failed to cancel job');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setNotifyCleaner(true);
    onOpenChange(false);
  };

  if (!job) return null;

  const jobDate = toSafeLocalDate(job.date);
  const isVisit = job.jobType === 'visit';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel {isVisit ? 'Visit' : 'Job'}
          </DialogTitle>
          <DialogDescription>
            This action will mark the {isVisit ? 'visit' : 'job'} as cancelled. It cannot be undone but the record will be preserved for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Job Details */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{job.clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(jobDate, 'EEEE, MMMM d, yyyy')}</span>
              {job.time && (
                <>
                  <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                  <span>{job.time}</span>
                </>
              )}
            </div>
            {job.address && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{job.address}</span>
              </div>
            )}
            {job.employeeName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Assigned to: {job.employeeName}</span>
              </div>
            )}
          </div>

          {/* Cancellation Reason */}
          <div className="space-y-2">
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
              Cancellation Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please provide a reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A reason is required for audit and compliance purposes.
            </p>
          </div>

          {/* Notify Cleaner */}
          {job.employeeId && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="notify-cleaner"
                checked={notifyCleaner}
                onCheckedChange={(checked) => setNotifyCleaner(checked as boolean)}
              />
              <Label htmlFor="notify-cleaner" className="text-sm font-normal cursor-pointer">
                Notify {job.employeeName || 'cleaner'} about this cancellation
              </Label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Keep {isVisit ? 'Visit' : 'Job'}
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel} 
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? 'Cancelling...' : `Cancel ${isVisit ? 'Visit' : 'Job'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelJobModal;
