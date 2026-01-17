import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Receipt, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';

interface ReceiptData {
  id: string;
  receipt_number: string;
  amount: number;
  total: number;
  client_name?: string;
  cleaner_name?: string;
  service_date: string;
  payment_method: string;
}

interface VoidReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receipt: ReceiptData | null;
  onSuccess?: () => void;
}

const VoidReceiptModal = ({ open, onOpenChange, receipt, onSuccess }: VoidReceiptModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVoid = async () => {
    if (!receipt || !reason.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('payment_receipts')
        .update({
          is_voided: true,
          void_reason: reason.trim(),
          voided_by: user?.id,
          voided_at: new Date().toISOString(),
        })
        .eq('id', receipt.id);

      if (error) throw error;

      toast.success('Receipt voided successfully');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error voiding receipt:', error);
      toast.error('Failed to void receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  if (!receipt) return null;

  const serviceDate = toSafeLocalDate(receipt.service_date);
  const displayAmount = receipt.total || receipt.amount;

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Cash',
    e_transfer: 'E-Transfer',
    credit_card: 'Credit Card',
    cheque: 'Cheque',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Payment Receipt
          </DialogTitle>
          <DialogDescription>
            This will void the payment receipt. Voided receipts are preserved for audit purposes but will not appear in financial reports or the ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Receipt Details */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" />
                <span className="font-mono font-medium">{receipt.receipt_number}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-muted">
                {paymentMethodLabels[receipt.payment_method] || receipt.payment_method}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="font-semibold text-lg">${displayAmount.toFixed(2)}</span>
            </div>
            {receipt.client_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Client: {receipt.client_name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(serviceDate, 'MMMM d, yyyy')}</span>
            </div>
          </div>

          {/* Void Reason */}
          <div className="space-y-2">
            <Label htmlFor="void-reason" className="text-sm font-medium">
              Void Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="void-reason"
              placeholder="Please provide a reason for voiding this receipt..."
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
            {isLoading ? 'Voiding...' : 'Void Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidReceiptModal;
