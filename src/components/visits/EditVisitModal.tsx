import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logAuditEntry } from '@/hooks/useAuditLog';
import type { Visit } from '@/pages/VisitHistory';

interface EditVisitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: Visit;
  onSuccess: () => void;
}

const EditVisitModal = ({ open, onOpenChange, visit, onSuccess }: EditVisitModalProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [date, setDate] = useState(visit.date);
  const [time, setTime] = useState(visit.time);
  const [visitPurpose, setVisitPurpose] = useState(visit.visitPurpose || '');
  const [visitRoute, setVisitRoute] = useState(visit.visitRoute || '');
  const [notes, setNotes] = useState(visit.notes || '');
  const [status, setStatus] = useState(visit.status);

  useEffect(() => {
    if (open) {
      setDate(visit.date);
      setTime(visit.time);
      setVisitPurpose(visit.visitPurpose || '');
      setVisitRoute(visit.visitRoute || '');
      setNotes(visit.notes || '');
      setStatus(visit.status);
    }
  }, [open, visit]);

  const handleSubmit = async () => {
    try {
      setIsLoading(true);

      const { error } = await supabase
        .from('jobs')
        .update({
          scheduled_date: date,
          start_time: time,
          visit_purpose: visitPurpose,
          visit_route: visitRoute,
          notes: notes,
          status: status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', visit.id);

      if (error) throw error;

      await logAuditEntry({
        action: 'job_updated',
        entityType: 'visit',
        entityId: visit.id,
        details: {
          description: 'Visit updated',
          previousValue: {
            date: visit.date,
            time: visit.time,
            purpose: visit.visitPurpose,
            status: visit.status
          },
          newValue: {
            date,
            time,
            purpose: visitPurpose,
            status
          }
        }
      }, user?.id, user?.profile?.company_id);

      toast.success('Visit updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating visit:', error);
      toast.error('Failed to update visit');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Visit</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Visit['status'])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input
              id="purpose"
              value={visitPurpose}
              onChange={(e) => setVisitPurpose(e.target.value)}
              placeholder="e.g., Inspection, Consultation, Quote"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="route">Route / Instructions</Label>
            <Textarea
              id="route"
              value={visitRoute}
              onChange={(e) => setVisitRoute(e.target.value)}
              placeholder="Access instructions, parking info..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditVisitModal;
