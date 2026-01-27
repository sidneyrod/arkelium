import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { notifyInvoicePaid } from '@/hooks/useNotifications';
import { CompanyFilter } from '@/components/ui/company-filter';
import SearchInput from '@/components/ui/search-input';
import PaginatedDataTable, { Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { CancelInvoiceModal, RegenerateInvoiceModal } from '@/components/modals/InvoiceActionModals';
import VoidInvoiceModal from '@/components/modals/VoidInvoiceModal';
import { PeriodSelector, DateRange, getDefaultDateRange } from '@/components/ui/period-selector';
import { 
  FileText, 
  MoreHorizontal, 
  Eye, 
  Mail, 
  Download, 
  CheckCircle,
  Clock,
  DollarSign,
  Printer,
  Loader2,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatSafeDate, toSafeLocalDate } from '@/lib/dates';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

interface Invoice {
  id: string;
  invoiceNumber: string;
  companyName: string;
  clientId: string;
  clientName: string;
  clientAddress: string;
  clientEmail?: string;
  serviceAddress: string;
  serviceDate: string;
  serviceDuration: string;
  cleanerName: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: InvoiceStatus;
  createdAt: string;
  dueDate: string;
  paidAt?: string;
  jobId?: string | null;
  lineItems: { id: string; description: string; quantity: number; unitPrice: number; total: number }[];
}

const statusConfig: Record<InvoiceStatus, { color: string; bgColor: string; label: string }> = {
  draft: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Draft' },
  sent: { color: 'text-info', bgColor: 'bg-info/10', label: 'Sent' },
  paid: { color: 'text-success', bgColor: 'bg-success/10', label: 'Paid' },
  partially_paid: { color: 'text-warning', bgColor: 'bg-warning/10', label: 'Partially Paid' },
  overdue: { color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Overdue' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted/50', label: 'Cancelled' },
};

const Invoices = () => {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Use accessible companies hook for module-level filtering
  const { companies: accessibleCompanies, getDefaultCompanyId, isLoading: isLoadingCompanies } = useAccessibleCompanies();
  
  // Module-local company filter state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');
  
  // Get accessible company IDs for query
  const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);
  
  // Determine which company IDs to query
  const queryCompanyIds = useMemo(() => {
    if (selectedCompanyId === 'all') {
      return accessibleCompanyIds;
    }
    return [selectedCompanyId];
  }, [selectedCompanyId, accessibleCompanyIds]);
  
  const urlStatus = searchParams.get('status');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');
  
  const getInitialDateRange = (): DateRange => {
    if (urlFrom && urlTo) {
      try {
        return {
          startDate: toSafeLocalDate(urlFrom),
          endDate: toSafeLocalDate(urlTo),
        };
      } catch {
        // Fall back to default
      }
    }
    return getDefaultDateRange();
  };
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || 'all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange);
  
  // Action modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [actionInvoice, setActionInvoice] = useState<Invoice | null>(null);
  
  const isAdmin = hasRole(['admin']);
  
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Update URL when date range changes
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', format(newRange.startDate, 'yyyy-MM-dd'));
    newParams.set('to', format(newRange.endDate, 'yyyy-MM-dd'));
    setSearchParams(newParams, { replace: true });
  };

  // Fetch company profile using first selected company
  const primaryCompanyId = useMemo(() => {
    if (selectedCompanyId !== 'all') return selectedCompanyId;
    return getDefaultCompanyId() || accessibleCompanyIds[0] || null;
  }, [selectedCompanyId, getDefaultCompanyId, accessibleCompanyIds]);
  
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!primaryCompanyId) return;

      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', primaryCompanyId)
        .maybeSingle();

      if (data) {
        setCompanyProfile({
          companyName: data.trade_name || data.legal_name,
          address: data.address,
          city: data.city,
          province: data.province,
          postalCode: data.postal_code,
          phone: data.phone,
          email: data.email,
        });
      }
    };

    fetchCompanyProfile();
  }, [primaryCompanyId]);

  // Server-side pagination fetch function
  const fetchInvoices = useCallback(async (from: number, to: number) => {
    if (queryCompanyIds.length === 0) {
      return { data: [], count: 0 };
    }

    const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDate = format(dateRange.endDate, 'yyyy-MM-dd');

    let query = supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        client_id,
        job_id,
        status,
        subtotal,
        tax_rate,
        tax_amount,
        total,
        service_date,
        service_duration,
        due_date,
        notes,
        created_at,
        paid_at,
        companies:company_id (
          trade_name
        ),
        clients (
          id,
          name,
          email,
          client_locations (address, city)
        ),
        profiles:cleaner_id (
          first_name,
          last_name
        ),
        client_locations:location_id (
          address,
          city
        ),
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          total
        )
      `, { count: 'exact' });
    
    // Apply company filter
    if (queryCompanyIds.length === 1) {
      query = query.eq('company_id', queryCompanyIds[0]);
    } else {
      query = query.in('company_id', queryCompanyIds);
    }
    
    query = query.gte('service_date', startDate).lte('service_date', endDate);

    // Apply filters
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (debouncedSearch) {
      query = query.or(`invoice_number.ilike.%${debouncedSearch}%,clients.name.ilike.%${debouncedSearch}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data: invoicesData, error, count } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' });
      return { data: [], count: 0 };
    }

    const mappedInvoices: Invoice[] = (invoicesData || []).map((inv: any) => {
      const cleaner = inv.profiles;
      const cleanerName = cleaner 
        ? `${cleaner.first_name || ''} ${cleaner.last_name || ''}`.trim() || 'Unassigned'
        : 'Unassigned';
      
      const location = inv.client_locations;
      const serviceAddress = location 
        ? `${location.address || ''}${location.city ? `, ${location.city}` : ''}`
        : 'N/A';

      return {
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        companyName: (inv.companies as any)?.trade_name || 'Unknown',
        clientId: inv.client_id,
        clientName: inv.clients?.name || 'Unknown Client',
        clientAddress: inv.clients?.client_locations?.[0]?.address || '',
        clientEmail: inv.clients?.email,
        serviceAddress,
        serviceDate: inv.service_date || inv.created_at,
        serviceDuration: inv.service_duration || '2h',
        cleanerName,
        subtotal: inv.subtotal || 0,
        taxRate: inv.tax_rate || 13,
        taxAmount: inv.tax_amount || 0,
        total: inv.total || 0,
        status: inv.status as InvoiceStatus,
        createdAt: inv.created_at,
        dueDate: inv.due_date || inv.created_at,
        paidAt: inv.paid_at,
        jobId: inv.job_id,
        lineItems: (inv.invoice_items || []).map((item: any) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity || 1,
          unitPrice: item.unit_price,
          total: item.total,
        })),
      };
    });

    return { data: mappedInvoices, count: count || 0 };
  }, [queryCompanyIds, dateRange, statusFilter, debouncedSearch]);

  const {
    data: invoices,
    isLoading,
    pagination,
    setPage,
    setPageSize,
    refresh,
  } = useServerPagination<Invoice>(fetchInvoices, { pageSize: 25 });

  // Refresh when filters change OR when accessible companies finish loading
  useEffect(() => {
    // Only refresh if we have companies to query (prevents empty query on mount)
    if (accessibleCompanyIds.length > 0 || selectedCompanyId !== 'all') {
      refresh();
    }
  }, [dateRange, statusFilter, debouncedSearch, selectedCompanyId, accessibleCompanyIds]);

  // Stats based on visible invoices (simplified - for accurate totals use RPC)
  const stats = useMemo(() => {
    const total = pagination.totalCount;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'sent').length;
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);
    const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((acc, i) => acc + i.total, 0);
    return { total, paid, pending, totalRevenue, pendingAmount };
  }, [invoices, pagination.totalCount]);

  const handleMarkPaid = async (invoice: Invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update invoice', variant: 'destructive' });
      return;
    }

    await notifyInvoicePaid(invoice.invoiceNumber, invoice.clientName, invoice.total, invoice.id);
    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} marked as paid` });
    refresh();
  };

  const handleSendEmail = async (invoice: Invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoice.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update invoice', variant: 'destructive' });
      return;
    }

    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} sent via email` });
    refresh();
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
      key: 'companyName',
      header: 'Company',
      render: (invoice) => (
        <span className="text-sm">{invoice.companyName}</span>
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
      render: (invoice) => formatSafeDate(invoice.serviceDate, 'MMM d, yyyy') || 'N/A',
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
      render: (invoice) => {
        const isPaid = invoice.status === 'paid' || invoice.status === 'partially_paid';
        const isCancelled = invoice.status === 'cancelled';
        
        return (
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
              
              {!isPaid && !isCancelled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSendEmail(invoice)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send via Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleMarkPaid(invoice)} className="text-success">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Paid
                  </DropdownMenuItem>
                </>
              )}
              
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  {isPaid ? (
                    // For paid invoices - allow voiding (reversal) with reason
                    <DropdownMenuItem 
                      onClick={() => { setActionInvoice(invoice); setShowVoidModal(true); }}
                      className="text-destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Void Invoice (Reversal)
                    </DropdownMenuItem>
                  ) : (
                    <>
                      {!isCancelled && (
                        <DropdownMenuItem 
                          onClick={() => { setActionInvoice(invoice); setShowCancelModal(true); }}
                          className="text-warning"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Invoice
                        </DropdownMenuItem>
                      )}
                      {invoice.jobId && !isCancelled && (
                        <DropdownMenuItem 
                          onClick={() => { setActionInvoice(invoice); setShowRegenerateModal(true); }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Regenerate Invoice
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading && invoices.length === 0) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Inline KPIs + Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input - 1st */}
        <SearchInput
          placeholder="Search invoices..."
          value={search}
          onChange={setSearch}
          className="min-w-[120px] max-w-[200px] flex-shrink-0 h-8"
        />
        
        {/* Company Filter - 2nd */}
        <CompanyFilter
          value={selectedCompanyId}
          onChange={setSelectedCompanyId}
          showAllOption={accessibleCompanies.length > 1}
          allLabel="All Companies"
          className="w-[180px] h-8 text-xs flex-shrink-0"
        />
        
        {/* Status Filter - 3rd */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 flex-shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Inline KPIs */}
        <div className="flex items-center gap-2 flex-1">
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[10px] text-muted-foreground">Total</span>
            <span className="font-semibold text-sm">{stats.total}</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
            <span className="text-[10px] text-muted-foreground">Paid</span>
            <span className="font-semibold text-sm">{stats.paid}</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <Clock className="h-3.5 w-3.5 text-warning shrink-0" />
            <span className="text-[10px] text-muted-foreground">Pending</span>
            <span className="font-semibold text-sm">{stats.pending}</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-card border rounded-md min-w-0">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground">Revenue</span>
            <span className="font-semibold text-sm">${stats.totalRevenue.toFixed(2)}</span>
          </div>
        </div>

        {/* Date Filter */}
        <PeriodSelector value={dateRange} onChange={handleDateRangeChange} className="shrink-0" />
      </div>

      {/* Data Table with Pagination */}
      <PaginatedDataTable
        columns={columns}
        data={invoices}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        emptyMessage="No invoices found for the selected filters."
      />

      {/* Invoice Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6 p-4 bg-card rounded-lg border">
              {/* Company Header */}
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold">{companyProfile?.companyName || 'Company Name'}</h2>
                <p className="text-sm text-muted-foreground">{companyProfile?.address}</p>
                <p className="text-sm text-muted-foreground">
                  {companyProfile?.city}, {companyProfile?.province} {companyProfile?.postalCode}
                </p>
              </div>

              {/* Invoice Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground">Bill To</h3>
                  <p className="font-medium">{selectedInvoice.clientName}</p>
                  <p className="text-sm">{selectedInvoice.clientAddress}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm"><span className="text-muted-foreground">Invoice #:</span> {selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Date:</span> {formatSafeDate(selectedInvoice.createdAt, 'MMM d, yyyy')}</p>
                  <p className="text-sm"><span className="text-muted-foreground">Due:</span> {formatSafeDate(selectedInvoice.dueDate, 'MMM d, yyyy')}</p>
                </div>
              </div>

              {/* Line Items */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-right p-3 text-sm font-medium">Qty</th>
                      <th className="text-right p-3 text-sm font-medium">Rate</th>
                      <th className="text-right p-3 text-sm font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.lineItems.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3">{item.description}</td>
                        <td className="text-right p-3">{item.quantity}</td>
                        <td className="text-right p-3">${item.unitPrice.toFixed(2)}</td>
                        <td className="text-right p-3">${item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({selectedInvoice.taxRate}%)</span>
                    <span>${selectedInvoice.taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Total</span>
                    <span>${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Modals */}
      {actionInvoice && (
        <>
          <CancelInvoiceModal
            open={showCancelModal}
            onOpenChange={setShowCancelModal}
            invoice={actionInvoice}
            onSuccess={() => { setShowCancelModal(false); setActionInvoice(null); refresh(); }}
          />
          <VoidInvoiceModal
            open={showVoidModal}
            onOpenChange={setShowVoidModal}
            invoice={actionInvoice}
            onSuccess={() => { setShowVoidModal(false); setActionInvoice(null); refresh(); }}
          />
          <RegenerateInvoiceModal
            open={showRegenerateModal}
            onOpenChange={setShowRegenerateModal}
            invoice={actionInvoice}
            onSuccess={() => { setShowRegenerateModal(false); setActionInvoice(null); refresh(); }}
          />
        </>
      )}
    </div>
  );
};

export default Invoices;
