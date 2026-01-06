import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Banknote, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  Check, 
  AlertTriangle,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashCollection {
  id: string;
  job_id: string;
  client_id: string;
  cleaner_id: string;
  amount: number;
  service_date: string;
  cash_handling: 'kept_by_cleaner' | 'delivered_to_office';
  compensation_status: string;
  notes: string | null;
  client_name?: string;
  cleaner_name?: string;
  job?: {
    scheduled_date: string;
    duration_minutes: number;
    job_type: string;
  };
}

interface CashApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashCollection: CashCollection;
  onApprove: () => void;
  onDispute: (reason: string) => void;
}

const CashApprovalModal = ({
  open,
  onOpenChange,
  cashCollection,
  onApprove,
  onDispute,
}: CashApprovalModalProps) => {
  const [action, setAction] = useState<'approve' | 'dispute' | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (action === 'dispute' && !disputeReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (action === 'approve') {
        await onApprove();
      } else if (action === 'dispute') {
        await onDispute(disputeReason);
      }
    } finally {
      setIsSubmitting(false);
      setAction(null);
      setDisputeReason('');
    }
  };

  const handleClose = () => {
    setAction(null);
    setDisputeReason('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-warning" />
            Cash Collection Review
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Information */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Service Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="font-medium">{cashCollection.client_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Service Date</p>
                  <p className="font-medium">{cashCollection.service_date}</p>
                </div>
              </div>
              {cashCollection.job && (
                <>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium">{cashCollection.job.duration_minutes} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{cashCollection.job.job_type || 'Cleaning'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Cash Details */}
          <div className="rounded-lg border bg-warning/5 border-warning/30 p-4 space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Cash Handling Details
            </h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Collected By</p>
                  <p className="font-medium">{cashCollection.cleaner_name || 'Unknown'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="text-2xl font-bold">${cashCollection.amount.toFixed(2)}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground mb-1">Cleaner's Decision</p>
              <Badge 
                variant="outline" 
                className={cn(
                  cashCollection.cash_handling === 'kept_by_cleaner' 
                    ? 'border-warning text-warning' 
                    : 'border-success text-success'
                )}
              >
                {cashCollection.cash_handling === 'kept_by_cleaner' 
                  ? '💰 Keep cash (deduct from payroll)' 
                  : '📤 Deliver to office'}
              </Badge>
            </div>
            {cashCollection.notes && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{cashCollection.notes}</p>
              </div>
            )}
          </div>

          {/* Admin Action */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Admin Decision
            </h4>
            <div className="flex gap-3">
              <Button
                variant={action === 'approve' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setAction('approve')}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                variant={action === 'dispute' ? 'destructive' : 'outline'}
                className={cn(
                  "flex-1",
                  action !== 'dispute' && 'border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground'
                )}
                onClick={() => setAction('dispute')}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Dispute
              </Button>
            </div>

            {action === 'approve' && (
              <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 text-sm">
                <p className="font-medium text-primary mb-1">Confirm Approval</p>
                <p className="text-muted-foreground">
                  {cashCollection.cash_handling === 'kept_by_cleaner' 
                    ? 'This will enable the amount to be deducted from the cleaner\'s next payroll.'
                    : 'This confirms the cleaner will deliver the cash to the office.'}
                </p>
              </div>
            )}

            {action === 'dispute' && (
              <div className="space-y-3">
                <Label htmlFor="dispute-reason">Dispute Reason *</Label>
                <Textarea
                  id="dispute-reason"
                  placeholder="Explain why this cash collection is being disputed..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  The cleaner will be notified of this dispute and the reason provided.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!action || (action === 'dispute' && !disputeReason.trim()) || isSubmitting}
            variant={action === 'dispute' ? 'destructive' : 'default'}
          >
            {isSubmitting ? 'Processing...' : action === 'approve' ? 'Confirm Approval' : 'Submit Dispute'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CashApprovalModal;
