import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, FileText, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  status: string;
  createdAt?: string;
  serviceDate?: string;
}

interface VoidInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onSuccess?: () => void;
}

const VoidInvoiceModal = ({ open, onOpenChange, invoice, onSuccess }: VoidInvoiceModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVoid = async () => {
    if (!invoice || !reason.trim()) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          is_voided: true,
          void_reason: reason.trim(),
          voided_by: user?.id,
          voided_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      if (error) throw error;

      toast.success('Invoice voided successfully');
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error voiding invoice:', error);
      toast.error('Failed to void invoice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  if (!invoice) return null;

  const displayDate = invoice.serviceDate || invoice.createdAt;
  const formattedDate = displayDate ? format(toSafeLocalDate(displayDate), 'MMMM d, yyyy') : 'N/A';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Void Invoice
          </DialogTitle>
          <DialogDescription>
            This will void a paid invoice. Use this when a payment needs to be reversed or was recorded incorrectly. Voided invoices are preserved for audit purposes but will not appear in the ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Invoice Details */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                invoice.status === 'paid' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              }`}>
                {invoice.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="font-semibold text-lg">${invoice.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{invoice.clientName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Warning for paid invoices */}
          {invoice.status === 'paid' && (
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-3">
              <p className="text-sm text-warning-foreground">
                <strong>Warning:</strong> This invoice has been marked as paid. Voiding it will remove it from the accounting ledger. Consider if you need to issue a credit note instead.
              </p>
            </div>
          )}

          {/* Void Reason */}
          <div className="space-y-2">
            <Label htmlFor="void-reason" className="text-sm font-medium">
              Void Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="void-reason"
              placeholder="Please provide a reason for voiding this invoice..."
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
            {isLoading ? 'Voiding...' : 'Void Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidInvoiceModal;
