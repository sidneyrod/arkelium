import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditEntry } from '@/hooks/useAuditLog';
import type { Visit } from '@/pages/VisitHistory';

interface CancelVisitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: Visit;
  onSuccess: () => void;
}

const CancelVisitModal = ({ open, onOpenChange, visit, onSuccess }: CancelVisitModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a cancellation reason');
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'cancelled',
          notes: visit.notes 
            ? `${visit.notes}\n\n--- Cancellation Reason ---\n${reason}`
            : `--- Cancellation Reason ---\n${reason}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visit.id);

      if (error) throw error;

      await logAuditEntry({
        action: 'job_cancelled',
        entityType: 'visit',
        entityId: visit.id,
        details: {
          description: 'Visit cancelled',
          reason: reason,
          previousStatus: visit.status,
        }
      }, user?.id, user?.profile?.company_id);

      toast.success('Visit cancelled successfully');
      onSuccess();
      onOpenChange(false);
      setReason('');
    } catch (error) {
      console.error('Error cancelling visit:', error);
      toast.error('Failed to cancel visit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <DialogTitle>Cancel Visit</DialogTitle>
          </div>
          <DialogDescription>
            Are you sure you want to cancel this visit? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm"><strong>Client:</strong> {visit.clientName}</p>
            <p className="text-sm"><strong>Date:</strong> {visit.date}</p>
            <p className="text-sm"><strong>Purpose:</strong> {visit.visitPurpose || 'Business Visit'}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Cancellation Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for cancelling this visit..."
              rows={4}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Visit
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleCancel} 
            disabled={isLoading || !reason.trim()}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Cancel Visit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelVisitModal;
