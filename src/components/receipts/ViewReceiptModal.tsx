import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Mail, Printer, X } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentReceipt {
  id: string;
  receipt_number: string;
  client_id: string;
  cleaner_id: string | null;
  payment_method: string;
  amount: number;
  tax_amount: number;
  total: number;
  service_date: string;
  service_description: string | null;
  receipt_html: string | null;
  sent_at: string | null;
  sent_to_email: string | null;
  notes: string | null;
  created_at: string;
  client_name?: string;
  cleaner_name?: string;
}

interface ViewReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: PaymentReceipt | null;
  onSendEmail: (receipt: PaymentReceipt) => void;
  onDownload: (receipt: PaymentReceipt) => void;
  sendingEmail?: boolean;
}

const ViewReceiptModal = ({ 
  open, 
  onClose, 
  receipt, 
  onSendEmail, 
  onDownload,
  sendingEmail = false 
}: ViewReceiptModalProps) => {
  if (!receipt) return null;

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Cash',
      e_transfer: 'E-Transfer',
      credit_card: 'Credit Card',
      cheque: 'Cheque',
    };
    return labels[method] || method;
  };

  const handlePrint = () => {
    if (receipt.receipt_html) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(receipt.receipt_html);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Receipt #{receipt.receipt_number}</span>
            <Badge variant={receipt.sent_at ? 'default' : 'secondary'}>
              {receipt.sent_at ? 'Sent' : 'Not Sent'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Receipt Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Client</p>
              <p className="font-medium">{receipt.client_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cleaner</p>
              <p className="font-medium">{receipt.cleaner_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Service Date</p>
              <p className="font-medium">{format(new Date(receipt.service_date), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-medium">{getPaymentMethodLabel(receipt.payment_method)}</p>
            </div>
          </div>

          <Separator />

          {/* Service Description */}
          {receipt.service_description && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Service Description</p>
              <p className="text-sm">{receipt.service_description}</p>
            </div>
          )}

          {/* Amount Breakdown */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${receipt.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>${(receipt.tax_amount || 0).toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">${receipt.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Notes */}
          {receipt.notes && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-muted/30 p-3 rounded-lg">{receipt.notes}</p>
            </div>
          )}

          {/* Email Status */}
          {receipt.sent_at && receipt.sent_to_email && (
            <div className="text-sm text-muted-foreground">
              Sent to <span className="text-foreground">{receipt.sent_to_email}</span> on{' '}
              {format(new Date(receipt.sent_at), 'MMM d, yyyy h:mm a')}
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDownload(receipt)}
              disabled={!receipt.receipt_html}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              disabled={!receipt.receipt_html}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => onSendEmail(receipt)}
              disabled={sendingEmail}
            >
              <Mail className="h-4 w-4 mr-2" />
              {sendingEmail ? 'Sending...' : receipt.sent_at ? 'Resend Email' : 'Send Email'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewReceiptModal;
