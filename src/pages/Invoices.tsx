import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyStore } from '@/stores/companyStore';
import { useInvoiceStore, Invoice, InvoiceStatus } from '@/stores/invoiceStore';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  MoreHorizontal, 
  Eye, 
  Mail, 
  MessageSquare, 
  Download, 
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
  QrCode,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig: Record<InvoiceStatus, { color: string; bgColor: string; label: string }> = {
  draft: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Draft' },
  sent: { color: 'text-info', bgColor: 'bg-info/10', label: 'Sent' },
  paid: { color: 'text-success', bgColor: 'bg-success/10', label: 'Paid' },
  overdue: { color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Overdue' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted/50', label: 'Cancelled' },
};

const Invoices = () => {
  const { t } = useLanguage();
  const { profile, branding } = useCompanyStore();
  const { invoices, markAsPaid, markAsSent, deleteInvoice } = useInvoiceStore();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
        invoice.cleanerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'sent').length;
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);
    const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((acc, i) => acc + i.total, 0);
    return { total, paid, pending, totalRevenue, pendingAmount };
  }, [invoices]);

  const handleSendEmail = (invoice: Invoice) => {
    markAsSent(invoice.id);
    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} sent via email` });
  };

  const handleSendSMS = (invoice: Invoice) => {
    markAsSent(invoice.id);
    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} sent via SMS` });
  };

  const handleMarkPaid = (invoice: Invoice) => {
    markAsPaid(invoice.id);
    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} marked as paid` });
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // Generate and download PDF
    const html = generateInvoiceHTML(invoice, profile, branding);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.document.title = `Invoice_${invoice.invoiceNumber}`;
    }
    toast({ title: 'Success', description: 'Invoice PDF opened for download' });
  };

  const handlePreview = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const columns: Column<Invoice>[] = [
    {
      key: 'invoiceNumber',
      header: 'Invoice #',
      render: (invoice) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-medium">{invoice.invoiceNumber}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (invoice) => (
        <div>
          <p className="font-medium">{invoice.clientName}</p>
          <p className="text-xs text-muted-foreground">{invoice.serviceAddress}</p>
        </div>
      ),
    },
    {
      key: 'serviceDate',
      header: 'Service Date',
      render: (invoice) => format(new Date(invoice.serviceDate), 'MMM d, yyyy'),
    },
    {
      key: 'cleanerName',
      header: 'Cleaner',
    },
    {
      key: 'total',
      header: 'Amount',
      render: (invoice) => (
        <span className="font-semibold">${invoice.total.toFixed(2)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (invoice) => {
        const config = statusConfig[invoice.status];
        return (
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (invoice) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={() => handlePreview(invoice)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
              <Mail className="h-4 w-4 mr-2" />
              Send via Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSendSMS(invoice)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Send via SMS
            </DropdownMenuItem>
            {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMarkPaid(invoice)} className="text-success">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title="Invoices"
        description="Manage invoices for completed cleaning services"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold">{stats.paid}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${stats.pendingAmount.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchInput 
          placeholder="Search invoices..."
          value={search}
          onChange={setSearch}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <DataTable 
        columns={columns}
        data={filteredInvoices}
        onRowClick={handlePreview}
        emptyMessage="No invoices found. Invoices are automatically generated when jobs are marked as completed."
      />

      {/* Invoice Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6 mt-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{profile.companyName}</h3>
                  <p className="text-sm text-muted-foreground">{profile.address}</p>
                  <p className="text-sm text-muted-foreground">{profile.city}, {profile.province}</p>
                  <p className="text-sm text-muted-foreground">{profile.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Created: {format(new Date(selectedInvoice.createdAt), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due: {format(new Date(selectedInvoice.dueDate), 'MMM d, yyyy')}
                  </p>
                  <div className="mt-2">
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium',
                      statusConfig[selectedInvoice.status].bgColor,
                      statusConfig[selectedInvoice.status].color
                    )}>
                      {statusConfig[selectedInvoice.status].label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Client & Service Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Bill To</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-medium">{selectedInvoice.clientName}</p>
                    <p className="text-sm text-muted-foreground">{selectedInvoice.clientAddress}</p>
                    {selectedInvoice.clientEmail && (
                      <p className="text-sm text-muted-foreground">{selectedInvoice.clientEmail}</p>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-border/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Service Details</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="font-medium">{selectedInvoice.serviceAddress}</p>
                    <p className="text-sm text-muted-foreground">
                      Date: {format(new Date(selectedInvoice.serviceDate), 'MMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Duration: {selectedInvoice.serviceDuration}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cleaner: {selectedInvoice.cleanerName}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Line Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-right p-3 text-sm font-medium">Qty</th>
                      <th className="text-right p-3 text-sm font-medium">Price</th>
                      <th className="text-right p-3 text-sm font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.lineItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 text-sm">{item.description}</td>
                        <td className="p-3 text-sm text-right">{item.quantity}</td>
                        <td className="p-3 text-sm text-right">${item.unitPrice.toFixed(2)}</td>
                        <td className="p-3 text-sm text-right font-medium">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({selectedInvoice.taxRate}%)</span>
                    <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total</span>
                    <span>${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* QR Code placeholder */}
              <div className="flex items-center justify-center py-4 border-t">
                <div className="text-center">
                  <div className="h-24 w-24 mx-auto bg-muted rounded-lg flex items-center justify-center mb-2">
                    <QrCode className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground">Scan to pay (coming soon)</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            {selectedInvoice && (
              <>
                <Button variant="outline" onClick={() => handleDownloadPDF(selectedInvoice)}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={() => handleSendEmail(selectedInvoice)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button onClick={() => { handleMarkPaid(selectedInvoice); setShowPreview(false); }}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Paid
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Generate Invoice HTML for PDF
function generateInvoiceHTML(invoice: Invoice, profile: any, branding: any): string {
  const lineItemsHTML = invoice.lineItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.description}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">$${item.unitPrice.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">$${item.total.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; line-height: 1.6; }
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.04;
      z-index: -1;
    }
    .watermark img { max-width: 400px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .company { font-size: 24px; font-weight: 700; color: ${branding.primaryColor || '#1a3d2e'}; }
    .invoice-number { font-size: 28px; font-weight: 700; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .status-paid { background: #dcfce7; color: #16a34a; }
    .status-sent { background: #dbeafe; color: #2563eb; }
    .status-draft { background: #f3f4f6; color: #6b7280; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; }
    .totals { text-align: right; margin-top: 20px; }
    .total-row { font-size: 20px; font-weight: 700; color: ${branding.primaryColor || '#1a3d2e'}; }
  </style>
</head>
<body>
  ${branding.logoUrl ? `<div class="watermark"><img src="${branding.logoUrl}" alt="" /></div>` : ''}
  
  <div class="header">
    <div>
      <div class="company">${profile.companyName}</div>
      <p>${profile.address || ''}<br>${profile.city || ''}, ${profile.province || ''} ${profile.postalCode || ''}</p>
      <p>${profile.phone || ''}<br>${profile.email || ''}</p>
    </div>
    <div style="text-align: right;">
      <div class="invoice-number">${invoice.invoiceNumber}</div>
      <p>Date: ${format(new Date(invoice.createdAt), 'MMM d, yyyy')}</p>
      <p>Due: ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
      <span class="status status-${invoice.status}">${invoice.status.toUpperCase()}</span>
    </div>
  </div>

  <div style="display: flex; gap: 40px; margin-bottom: 30px;">
    <div>
      <h3 style="margin: 0 0 8px; color: #666; font-size: 14px;">BILL TO</h3>
      <p style="margin: 0;"><strong>${invoice.clientName}</strong><br>${invoice.clientAddress}</p>
      ${invoice.clientEmail ? `<p style="margin: 4px 0 0;">${invoice.clientEmail}</p>` : ''}
    </div>
    <div>
      <h3 style="margin: 0 0 8px; color: #666; font-size: 14px;">SERVICE LOCATION</h3>
      <p style="margin: 0;">${invoice.serviceAddress}</p>
      <p style="margin: 4px 0 0;">Date: ${format(new Date(invoice.serviceDate), 'MMM d, yyyy')}</p>
      <p style="margin: 4px 0 0;">Cleaner: ${invoice.cleanerName}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align: right;">Qty</th>
        <th style="text-align: right;">Price</th>
        <th style="text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemsHTML}
    </tbody>
  </table>

  <div class="totals">
    <p>Subtotal: $${invoice.subtotal.toFixed(2)}</p>
    <p>Tax (${invoice.taxRate}%): $${invoice.taxAmount.toFixed(2)}</p>
    <p class="total-row">Total: $${invoice.total.toFixed(2)}</p>
  </div>

  <div style="margin-top: 60px; text-align: center; color: #999; font-size: 12px;">
    Thank you for your business!<br>
    ${profile.companyName} | ${profile.phone || ''} | ${profile.email || ''}
  </div>
</body>
</html>
  `;
}

export default Invoices;