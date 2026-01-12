import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, XCircle, Trash2, RefreshCw, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  clientName: string;
  total: number;
  status: string;
  jobId?: string | null;
}

// Cancel Invoice Modal
interface CancelInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onSuccess: () => void;
}

export const CancelInvoiceModal = ({ open, onOpenChange, invoice, onSuccess }: CancelInvoiceModalProps) => {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompanyStore();
  const { logAction } = useAuditLog();
  const [isLoading, setIsLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleCancel = async () => {
    if (!invoice || !activeCompanyId) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ 
          status: 'cancelled',
        })
        .eq('id', invoice.id)
        .eq('company_id', activeCompanyId);

      if (error) throw error;

      // Log the action
      await logAction({
        action: 'invoice_cancelled',
        entityType: 'invoice',
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          total: invoice.total,
          reason: reason || 'No reason provided',
          description: `Invoice ${invoice.invoiceNumber} cancelled`,
        },
      });

      toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} has been cancelled` });
      onSuccess();
      onOpenChange(false);
      setReason('');
    } catch (err) {
      console.error('Error cancelling invoice:', err);
      toast({ title: 'Error', description: 'Failed to cancel invoice', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-warning">
            <XCircle className="h-5 w-5" />
            Cancel Invoice
          </DialogTitle>
          <DialogDescription>
            This will cancel the invoice and keep it in history with "Cancelled" status.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
            <p className="text-sm font-medium">Invoice: {invoice?.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">Client: {invoice?.clientName}</p>
            <p className="text-sm text-muted-foreground">Amount: ${invoice?.total.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for cancellation (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Back
          </Button>
          <Button variant="destructive" onClick={handleCancel} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
            Cancel Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Delete Invoice Modal
interface DeleteInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onSuccess: () => void;
}

export const DeleteInvoiceModal = ({ open, onOpenChange, invoice, onSuccess }: DeleteInvoiceModalProps) => {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompanyStore();
  const { logAction } = useAuditLog();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (!invoice || !activeCompanyId || confirmText !== 'DELETE') return;

    setIsLoading(true);
    try {
      // First delete invoice items
      await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);

      // Then delete the invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id)
        .eq('company_id', activeCompanyId);

      if (error) throw error;

      // Log the action
      await logAction({
        action: 'invoice_cancelled',
        entityType: 'invoice',
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          total: invoice.total,
          action: 'permanently_deleted',
          description: `Invoice ${invoice.invoiceNumber} permanently deleted`,
        },
      });

      toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} has been permanently deleted` });
      onSuccess();
      onOpenChange(false);
      setConfirmText('');
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast({ title: 'Error', description: 'Failed to delete invoice', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Invoice Permanently
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The invoice will be permanently removed from the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Warning: Permanent Deletion</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Invoice: {invoice?.invoiceNumber}<br />
                  Client: {invoice?.clientName}<br />
                  Amount: ${invoice?.total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Type "DELETE" to confirm</Label>
            <Input
              id="confirm"
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); setConfirmText(''); }} disabled={isLoading}>
            Back
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isLoading || confirmText !== 'DELETE'}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Delete Permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Regenerate Invoice Modal
interface RegenerateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onSuccess: () => void;
}

export const RegenerateInvoiceModal = ({ open, onOpenChange, invoice, onSuccess }: RegenerateInvoiceModalProps) => {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompanyStore();
  const { logAction } = useAuditLog();
  const [isLoading, setIsLoading] = useState(false);

  const handleRegenerate = async () => {
    if (!invoice || !activeCompanyId) return;

    // Check if the invoice has a linked job
    if (!invoice.jobId) {
      toast({ title: 'Error', description: 'Cannot regenerate: No linked service/job found', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // First, cancel the current invoice
      const { error: cancelError } = await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoice.id)
        .eq('company_id', activeCompanyId);

      if (cancelError) throw cancelError;

      // Check if there's already an active invoice for this job
      const { data: existingInvoices, error: checkError } = await supabase
        .from('invoices')
        .select('id, status')
        .eq('job_id', invoice.jobId)
        .eq('company_id', activeCompanyId)
        .not('status', 'eq', 'cancelled');

      if (checkError) throw checkError;

      if (existingInvoices && existingInvoices.length > 0) {
        toast({ 
          title: 'Error', 
          description: 'An active invoice already exists for this service. Please cancel it first.', 
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      // Get job details to create new invoice
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          clients (id, name),
          client_locations:location_id (address, city)
        `)
        .eq('id', invoice.jobId)
        .single();

      if (jobError || !jobData) {
        toast({ title: 'Error', description: 'Could not find the original service/job', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      // Generate new invoice number
      const timestamp = Date.now().toString(36).toUpperCase();
      const newInvoiceNumber = `INV-${timestamp}`;

      // Create new invoice
      const { error: insertError } = await supabase
        .from('invoices')
        .insert({
          company_id: activeCompanyId,
          invoice_number: newInvoiceNumber,
          client_id: jobData.client_id,
          cleaner_id: jobData.cleaner_id,
          job_id: invoice.jobId,
          location_id: jobData.location_id,
          service_date: jobData.scheduled_date,
          subtotal: jobData.payment_amount || 0,
          tax_rate: 13,
          tax_amount: (jobData.payment_amount || 0) * 0.13,
          total: (jobData.payment_amount || 0) * 1.13,
          status: 'draft',
        });

      if (insertError) throw insertError;

      // Log the action
      await logAction({
        action: 'invoice_created',
        entityType: 'invoice',
        details: {
          previousInvoice: invoice.invoiceNumber,
          newInvoice: newInvoiceNumber,
          clientName: invoice.clientName,
          description: `Invoice regenerated: ${invoice.invoiceNumber} → ${newInvoiceNumber}`,
        },
      });

      toast({ title: 'Success', description: `New invoice ${newInvoiceNumber} created. Previous invoice cancelled.` });
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error('Error regenerating invoice:', err);
      toast({ title: 'Error', description: 'Failed to regenerate invoice', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Regenerate Invoice
          </DialogTitle>
          <DialogDescription>
            This will cancel the current invoice and generate a new one for the same service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 border rounded-lg p-4">
            <p className="text-sm font-medium">Current Invoice: {invoice?.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">Client: {invoice?.clientName}</p>
            <p className="text-sm text-muted-foreground">Amount: ${invoice?.total.toFixed(2)}</p>
          </div>

          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
            <p className="text-sm">
              <strong>What will happen:</strong>
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
              <li>Current invoice will be marked as "Cancelled"</li>
              <li>A new invoice will be created with a new number</li>
              <li>The new invoice will be linked to the same service</li>
              <li>Both actions will be logged in the Activity Log</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Back
          </Button>
          <Button onClick={handleRegenerate} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Regenerate Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Mark as Paid Modal - auto-generates Receipt when Invoice is paid
interface MarkAsPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
  onSuccess: () => void;
}

type PaymentMethodType = 'cash' | 'e_transfer' | 'cheque' | 'credit_card' | 'bank_transfer';

const PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
];

export const MarkAsPaidModal = ({ open, onOpenChange, invoice, onSuccess }: MarkAsPaidModalProps) => {
  const { user } = useAuth();
  const { activeCompanyId } = useActiveCompanyStore();
  const { logAction } = useAuditLog();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('e_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const handleMarkAsPaid = async () => {
    if (!invoice || !activeCompanyId || !user) return;

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const paymentDate = format(new Date(), 'yyyy-MM-dd');

      // 1. Update invoice to paid status
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: now,
          payment_date: paymentDate,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
          payment_notes: paymentNotes || null,
          payment_amount: invoice.total,
          payment_received_by: user.id,
        })
        .eq('id', invoice.id)
        .eq('company_id', activeCompanyId);

      if (invoiceError) throw invoiceError;

      // 2. Check if a receipt already exists for this job
      let receiptExists = false;
      if (invoice.jobId) {
        const { data: existingReceipt } = await supabase
          .from('payment_receipts')
          .select('id')
          .eq('job_id', invoice.jobId)
          .eq('company_id', activeCompanyId)
          .maybeSingle();

        receiptExists = !!existingReceipt;
      }

      // 3. If no receipt exists, generate one
      if (!receiptExists && invoice.jobId) {
        // Get job details
        const { data: jobData, error: jobError } = await supabase
          .from('jobs')
          .select(`
            *,
            clients (id, name, email),
            client_locations:location_id (address, city)
          `)
          .eq('id', invoice.jobId)
          .single();

        if (jobError) {
          console.error('Error fetching job for receipt:', jobError);
        } else if (jobData) {
          // Generate receipt number
          const timestamp = Date.now().toString(36).toUpperCase();
          const receiptNumber = `RCPT-${timestamp}`;

          // Get company tax config
          const { data: configData } = await supabase
            .from('company_estimate_config')
            .select('tax_rate')
            .eq('company_id', activeCompanyId)
            .maybeSingle();

          const taxRate = configData?.tax_rate ?? 13;
          const subtotal = invoice.total / (1 + taxRate / 100);
          const taxAmount = invoice.total - subtotal;

          // Create receipt
          const { error: receiptError } = await supabase
            .from('payment_receipts')
            .insert({
              company_id: activeCompanyId,
              receipt_number: receiptNumber,
              job_id: invoice.jobId,
              client_id: jobData.client_id,
              cleaner_id: jobData.cleaner_id,
              service_date: jobData.scheduled_date,
              amount: subtotal,
              tax_amount: taxAmount,
              total: invoice.total,
              payment_method: paymentMethod,
              notes: paymentNotes || null,
              created_by: user.id,
              sent_at: now, // Mark as sent immediately to appear in Ledger
            });

          if (receiptError) {
            console.error('Error creating receipt:', receiptError);
            // Continue anyway - invoice is already marked as paid
          } else {
            // Log receipt creation
            await logAction({
              action: 'receipt_generated',
              entityType: 'payment_receipt',
              details: {
                receiptNumber,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.total,
                paymentMethod,
                description: `Receipt ${receiptNumber} auto-generated from paid invoice ${invoice.invoiceNumber}`,
              },
            });
          }
        }
      }

      // 4. Log invoice payment
      await logAction({
        action: 'invoice_paid',
        entityType: 'invoice',
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          total: invoice.total,
          paymentMethod,
          paymentReference: paymentReference || null,
          description: `Invoice ${invoice.invoiceNumber} marked as paid`,
        },
      });

      toast({ 
        title: 'Success', 
        description: `Invoice ${invoice.invoiceNumber} marked as paid${!receiptExists && invoice.jobId ? ' and receipt generated' : ''}` 
      });
      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setPaymentMethod('e_transfer');
      setPaymentReference('');
      setPaymentNotes('');
    } catch (err) {
      console.error('Error marking invoice as paid:', err);
      toast({ title: 'Error', description: 'Failed to mark invoice as paid', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            Mark Invoice as Paid
          </DialogTitle>
          <DialogDescription>
            Record payment received for this invoice. A receipt will be automatically generated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-success/10 border border-success/20 rounded-lg p-4">
            <p className="text-sm font-medium">Invoice: {invoice?.invoiceNumber}</p>
            <p className="text-sm text-muted-foreground">Client: {invoice?.clientName}</p>
            <p className="text-sm font-medium text-success">Amount: ${invoice?.total.toFixed(2)}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodType)}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentMethod !== 'cash' && (
            <div className="space-y-2">
              <Label htmlFor="paymentReference">Reference / Transaction ID (optional)</Label>
              <Input
                id="paymentReference"
                placeholder="e.g., E-Transfer confirmation number"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="paymentNotes">Notes (optional)</Label>
            <Textarea
              id="paymentNotes"
              placeholder="Additional payment notes..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleMarkAsPaid} disabled={isLoading} className="bg-success hover:bg-success/90">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
