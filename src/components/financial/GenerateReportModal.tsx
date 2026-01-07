import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DatePickerDialog } from '@/components/ui/date-picker-dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { toast } from '@/hooks/use-toast';
import { format, isWithinInterval } from 'date-fns';
import { FileSpreadsheet, FileText, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

// ✅ CORREÇÃO CRÍTICA 1: Importar helpers de datas seguras
import { formatSafeDate, toSafeLocalDate, toDateOnlyString } from '@/lib/dates';

interface GenerateReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PaidInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  service_date: string;
  payment_method: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  paid_at: string;
  job_id: string | null;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  e_transfer: 'E-Transfer',
  'e-transfer': 'E-Transfer',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  no_charge: 'No Charge',
};

export const GenerateReportModal = ({ open, onOpenChange }: GenerateReportModalProps) => {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<PaidInvoice[] | null>(null);
  const [isGenerated, setIsGenerated] = useState(false);

  const handleGenerateReport = async () => {
    if (!dateRange?.from || !dateRange?.to || !user?.profile?.company_id) {
      toast({ title: 'Error', description: 'Please select a date range', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      // Fetch only PAID and PARTIALLY PAID invoices
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          service_date,
          payment_method,
          subtotal,
          tax_amount,
          total,
          paid_at,
          job_id,
          clients (name)
        `)
        .eq('company_id', user.profile.company_id)
        .in('status', ['paid', 'partially_paid'])
        .not('paid_at', 'is', null)
        .order('paid_at', { ascending: false });

      if (error) throw error;

      // ✅ CORREÇÃO: Filter by date range usando toSafeLocalDate
      const filteredData = (data || []).filter(inv => {
        if (!inv.paid_at) return false;
        try {
          const paidDate = toSafeLocalDate(inv.paid_at);
          if (!paidDate) return false;
          return isWithinInterval(paidDate, { start: dateRange.from!, end: dateRange.to! });
        } catch {
          return false;
        }
      }).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        client_name: (inv.clients as any)?.name || 'Unknown',
        service_date: inv.service_date || '',
        payment_method: inv.payment_method,
        subtotal: inv.subtotal || 0,
        tax_amount: inv.tax_amount || 0,
        total: inv.total || 0,
        paid_at: inv.paid_at!,
        job_id: inv.job_id,
      }));

      setReportData(filteredData);
      setIsGenerated(true);

      // ✅ CORREÇÃO: Log com datas formatadas corretamente
      await logAction({
        action: 'invoice_created',
        entityType: 'financial_report',
        details: {
          description: `Financial report generated for period ${toDateOnlyString(dateRange.from)} to ${toDateOnlyString(dateRange.to)}`,
          recordCount: filteredData.length,
          totalAmount: filteredData.reduce((sum, inv) => sum + inv.total, 0),
        },
      });

      toast({ title: 'Success', description: `Report generated with ${filteredData.length} paid records` });
    } catch (err) {
      console.error('Error generating report:', err);
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (!reportData) return { total: 0, subtotal: 0, tax: 0, count: 0 };
    return {
      count: reportData.length,
      subtotal: reportData.reduce((sum, inv) => sum + inv.subtotal, 0),
      tax: reportData.reduce((sum, inv) => sum + inv.tax_amount, 0),
      total: reportData.reduce((sum, inv) => sum + inv.total, 0),
    };
  }, [reportData]);

  const exportToCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const headers = ['Date', 'Client', 'Invoice #', 'Service Date', 'Payment Method', 'Subtotal (CAD)', 'Tax (CAD)', 'Total (CAD)'];
    const rows = reportData.map(inv => [
      // ✅ CORREÇÃO: Usar formatSafeDate para datas
      formatSafeDate(inv.paid_at, 'yyyy-MM-dd'),
      inv.client_name,
      inv.invoice_number,
      formatSafeDate(inv.service_date, 'yyyy-MM-dd'),
      paymentMethodLabels[inv.payment_method || ''] || inv.payment_method || '',
      inv.subtotal.toFixed(2),
      inv.tax_amount.toFixed(2),
      inv.total.toFixed(2),
    ]);

    // Add summary row
    rows.push([]);
    rows.push(['', '', '', '', 'TOTALS:', summary.subtotal.toFixed(2), summary.tax.toFixed(2), summary.total.toFixed(2)]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${toDateOnlyString(dateRange?.from || new Date())}-to-${toDateOnlyString(dateRange?.to || new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'CSV exported successfully' });
  };

  const exportToExcel = () => {
    // Export as CSV with Excel-friendly format
    exportToCSV();
  };

  const exportToPDF = () => {
    // For now, use print functionality for PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportData) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { color: #0A6C53; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
          .summary { margin-top: 20px; font-weight: bold; }
          .amount { text-align: right; }
        </style>
      </head>
      <body>
        <h1>Financial Report</h1>
        <p>Period: ${dateRange?.from ? format(dateRange.from, 'MMMM d, yyyy') : ''} - ${dateRange?.to ? format(dateRange.to, 'MMMM d, yyyy') : ''}</p>
        <p>Generated: ${format(new Date(), 'MMMM d, yyyy HH:mm')}</p>
        <p>Records: ${summary.count} | Only Paid Invoices</p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Invoice #</th>
              <th>Payment Method</th>
              <th class="amount">Subtotal</th>
              <th class="amount">Tax</th>
              <th class="amount">Total</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map(inv => `
              <tr>
                <td>${formatSafeDate(inv.paid_at, 'yyyy-MM-dd')}</td>
                <td>${inv.client_name}</td>
                <td>${inv.invoice_number}</td>
                <td>${paymentMethodLabels[inv.payment_method || ''] || inv.payment_method || ''}</td>
                <td class="amount">$${inv.subtotal.toFixed(2)}</td>
                <td class="amount">$${inv.tax_amount.toFixed(2)}</td>
                <td class="amount">$${inv.total.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td colspan="4">TOTALS</td>
              <td class="amount">$${summary.subtotal.toFixed(2)}</td>
              <td class="amount">$${summary.tax.toFixed(2)}</td>
              <td class="amount">$${summary.total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="summary">
          <p>Total Revenue (Paid): $${summary.total.toFixed(2)} CAD</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const handleClose = () => {
    setReportData(null);
    setIsGenerated(false);
    setDateRange(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Generate Financial Report
          </DialogTitle>
          <DialogDescription>
            Generate an accounting report with only paid invoices for the selected period.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Date Range Selection */}
          <div className="space-y-2">
            <Label>Select Period *</Label>
            <DatePickerDialog
              mode="range"
              selected={dateRange}
              onSelect={(range) => setDateRange(range as DateRange | undefined)}
              placeholder="Select date range"
            />
            <p className="text-xs text-muted-foreground">
              Report will include only invoices with status "Paid" or "Partially Paid"
            </p>
          </div>

          {/* Generate Button */}
          {!isGenerated && (
            <Button
              onClick={handleGenerateReport}
              disabled={!dateRange?.from || !dateRange?.to || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          )}

          {/* Report Results */}
          {isGenerated && reportData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Records</p>
                  <p className="text-2xl font-bold">{summary.count}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Tax Collected</p>
                  <p className="text-2xl font-bold">${summary.tax.toFixed(2)}</p>
                </div>
                <div className="bg-success/10 rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total Received</p>
                  <p className="text-2xl font-bold text-success">${summary.total.toFixed(2)}</p>
                </div>
              </div>

              {/* Data Table */}
              <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-left p-3 font-medium">Client</th>
                      <th className="text-left p-3 font-medium">Invoice</th>
                      <th className="text-left p-3 font-medium">Payment</th>
                      <th className="text-right p-3 font-medium">Gross</th>
                      <th className="text-right p-3 font-medium">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-muted-foreground">
                          No paid invoices found for this period
                        </td>
                      </tr>
                    ) : (
                      reportData.map((inv) => (
                        <tr key={inv.id} className="border-t">
                          {/* ✅ CORREÇÃO: Usar formatSafeDate */}
                          <td className="p-3">{formatSafeDate(inv.paid_at, 'MMM d, yyyy')}</td>
                          <td className="p-3">{inv.client_name}</td>
                          <td className="p-3 font-mono text-xs">{inv.invoice_number}</td>
                          <td className="p-3">{paymentMethodLabels[inv.payment_method || ''] || '-'}</td>
                          <td className="p-3 text-right">${inv.subtotal.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">${inv.total.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={exportToPDF} disabled={reportData.length === 0}>
                  <FileText className="mr-2 h-4 w-4" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={exportToCSV} disabled={reportData.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={exportToExcel} disabled={reportData.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateReportModal;