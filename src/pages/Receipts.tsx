import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PeriodSelector, DateRange, getDefaultDateRange } from '@/components/ui/period-selector';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Receipt, 
  Search, 
  Download, 
  Eye, 
  MoreHorizontal,
  Mail,
  DollarSign,
  FileText,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { openPdfPreview } from '@/utils/pdfGenerator';
import ViewReceiptModal from '@/components/receipts/ViewReceiptModal';
import GenerateReceiptModal from '@/components/receipts/GenerateReceiptModal';

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
  client_email?: string;
}

const Receipts = () => {
  const { t } = useLanguage();
  
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange());
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_receipts')
        .select(`
          *,
          clients(name, email),
          profiles:cleaner_id(first_name, last_name)
        `)
        .gte('service_date', format(dateRange.startDate, 'yyyy-MM-dd'))
        .lte('service_date', format(dateRange.endDate, 'yyyy-MM-dd'))
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      const mappedData = (data || []).map(r => ({
        ...r,
        client_name: (r.clients as any)?.name || '-',
        client_email: (r.clients as any)?.email || null,
        cleaner_name: (r.profiles as any) 
          ? `${(r.profiles as any).first_name || ''} ${(r.profiles as any).last_name || ''}`.trim() || '-'
          : '-',
      }));
      
      setReceipts(mappedData);
    } catch (error: any) {
      console.error('Error fetching receipts:', error);
      toast.error('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [dateRange]);

  const filteredReceipts = receipts.filter(receipt => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      receipt.receipt_number.toLowerCase().includes(query) ||
      (receipt.client_name || '').toLowerCase().includes(query) ||
      (receipt.cleaner_name || '').toLowerCase().includes(query) ||
      receipt.payment_method.toLowerCase().includes(query)
    );
  });

  const handleViewReceipt = (receipt: PaymentReceipt) => {
    setSelectedReceipt(receipt);
    setViewModalOpen(true);
  };

  const handleViewPdf = (receipt: PaymentReceipt) => {
    if (receipt.receipt_html) {
      openPdfPreview(receipt.receipt_html, `Receipt-${receipt.receipt_number}`);
    } else {
      toast.error('Receipt preview not available');
    }
  };

  const handleDownloadReceipt = (receipt: PaymentReceipt) => {
    if (receipt.receipt_html) {
      const blob = new Blob([receipt.receipt_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${receipt.receipt_number}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSendEmail = async (receipt: PaymentReceipt) => {
    if (!receipt.client_email) {
      toast.error('Client does not have an email address');
      return;
    }

    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-receipt-email', {
        body: {
          receiptId: receipt.id,
          recipientEmail: receipt.client_email,
          recipientName: receipt.client_name,
        },
      });

      if (error) throw error;

      // Update local state
      const updatedReceipts = receipts.map(r => 
        r.id === receipt.id 
          ? { ...r, sent_at: new Date().toISOString(), sent_to_email: receipt.client_email }
          : r
      );
      setReceipts(updatedReceipts);
      
      if (selectedReceipt?.id === receipt.id) {
        setSelectedReceipt({ 
          ...selectedReceipt, 
          sent_at: new Date().toISOString(), 
          sent_to_email: receipt.client_email 
        });
      }

      toast.success(`Receipt sent to ${receipt.client_email}`);
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please check if email service is configured.');
    } finally {
      setSendingEmail(false);
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      e_transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      credit_card: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      cheque: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    };
    
    const labels: Record<string, string> = {
      cash: 'Cash',
      e_transfer: 'E-Transfer',
      credit_card: 'Credit Card',
      cheque: 'Cheque',
    };
    
    return (
      <Badge variant="secondary" className={colors[method] || ''}>
        {labels[method] || method}
      </Badge>
    );
  };

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + r.total, 0);
  const sentCount = filteredReceipts.filter(r => r.sent_at).length;

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Single Consolidated Row: Search + KPIs + DatePicker + Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative w-full sm:w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search receipts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        {/* Inline KPIs with flex-1 (neutral style like Invoices) */}
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <Receipt className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground">Total</span>
            <span className="font-semibold text-sm">{filteredReceipts.length}</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Amount</span>
            <span className="font-semibold text-sm">${totalAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Sent</span>
            <span className="font-semibold text-sm">{sentCount}/{filteredReceipts.length}</span>
          </div>
        </div>

        {/* Date Filter */}
        <PeriodSelector value={dateRange} onChange={setDateRange} className="shrink-0" />
        
        {/* Generate Button */}
        <Button onClick={() => setGenerateModalOpen(true)} size="sm" className="gap-1.5 h-8">
          <Plus className="h-4 w-4" />
          Generate Receipt
        </Button>
      </div>

      {/* Receipts Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No receipts found for this period</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Receipt #</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Client</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider hidden md:table-cell">Cleaner</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Service Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Method</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Total</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider hidden sm:table-cell">Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReceipts.map((receipt) => (
                <TableRow 
                  key={receipt.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewReceipt(receipt)}
                >
                  <TableCell className="font-mono font-medium">{receipt.receipt_number}</TableCell>
                  <TableCell>{receipt.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell">{receipt.cleaner_name}</TableCell>
                  <TableCell>{format(new Date(receipt.service_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="hidden sm:table-cell">{getPaymentMethodBadge(receipt.payment_method)}</TableCell>
                  <TableCell className="font-medium">${receipt.total.toFixed(2)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={receipt.sent_at ? 'default' : 'secondary'}>
                      {receipt.sent_at ? 'Sent' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewReceipt(receipt); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewPdf(receipt); }}>
                          <FileText className="h-4 w-4 mr-2" />
                          View PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(receipt); }}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleSendEmail(receipt); }}
                          disabled={!receipt.client_email || sendingEmail}
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          {receipt.sent_at ? 'Resend Email' : 'Send Email'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Receipt Modal */}
      <ViewReceiptModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        receipt={selectedReceipt}
        onSendEmail={handleSendEmail}
        onDownload={handleDownloadReceipt}
        sendingEmail={sendingEmail}
      />

      {/* Generate Receipt Modal */}
      <GenerateReceiptModal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        onReceiptGenerated={fetchReceipts}
      />
    </div>
  );
};

export default Receipts;