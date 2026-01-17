import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, DollarSign, User, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';

interface CashCollectionData {
  id: string;
  amount: number;
  client_name?: string;
  cleaner_name?: string;
  service_date: string;
  cash_handling: 'kept_by_cleaner' | 'delivered_to_office';
  compensation_status: string;
}

interface VoidCashCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashCollection: CashCollectionData | null;
  onSuccess?: () => void;
}

const VoidCashCollectionModal = ({ open, onOpenChange, cashCollection, onSuccess }: VoidCashCollectionModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVoid = async () => {
    if (!cashCollection || !reason.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('cash_collections')
        .update({
          is_voided: true,
          void_reason: reason.trim(),
          voided_by: user?.id,
          voided_at: new Date().toISOString(),
        })
        .eq('id', cashCollection.id);

      if (error) throw error;

      toast.success('Cash collection voided successfully');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error voiding cash collection:', error);
      toast.error('Failed to void cash collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  if (!cashCollection) return null;

  const serviceDate = toSafeLocalDate(cashCollection.service_date);
  const handlingLabel = cashCollection.cash_handling === 'kept_by_cleaner' ? 'Kept by Cleaner' : 'Delivered to Office';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Cash Collection Record
          </DialogTitle>
          <DialogDescription>
            This will void the cash collection record. Voided records are preserved for audit purposes but will not appear in financial reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cash Collection Details */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="font-semibold text-lg">${cashCollection.amount.toFixed(2)}</span>
            </div>
            {cashCollection.client_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Client: {cashCollection.client_name}</span>
              </div>
            )}
            {cashCollection.cleaner_name && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Cleaner: {cashCollection.cleaner_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(serviceDate, 'MMMM d, yyyy')}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Handling: {handlingLabel} • Status: {cashCollection.compensation_status}
            </div>
          </div>

          {/* Void Reason */}
          <div className="space-y-2">
            <Label htmlFor="void-reason" className="text-sm font-medium">
              Void Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="void-reason"
              placeholder="Please provide a reason for voiding this record..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A reason is required for audit and compliance purposes.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleVoid} 
            disabled={!reason.trim() || isLoading}
          >
            {isLoading ? 'Voiding...' : 'Void Record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidCashCollectionModal;
