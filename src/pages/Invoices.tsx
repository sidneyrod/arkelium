import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { notifyInvoicePaid } from '@/hooks/useNotifications';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { CancelInvoiceModal, DeleteInvoiceModal, RegenerateInvoiceModal } from '@/components/modals/InvoiceActionModals';
import { PeriodSelector, DateRange } from '@/components/ui/period-selector';
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
  QrCode,
  Printer,
  Loader2,
  Calendar,
  XCircle,
  Trash2,
  RefreshCw,
  Lock
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatSafeDate, toSafeLocalDate } from '@/lib/dates';

type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partially_paid';

interface Invoice {
  id: string;
  invoiceNumber: string;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read URL params for filters
  const urlStatus = searchParams.get('status');
  const urlFrom = searchParams.get('from');
  const urlTo = searchParams.get('to');
  
  // Initialize date range from URL params or default to this month
  const getInitialDateRange = (): DateRange => {
    if (urlFrom && urlTo) {
      try {
        return {
          startDate: toSafeLocalDate(urlFrom),
          endDate: toSafeLocalDate(urlTo),
        };
      } catch {
        // Fall back to this month
      }
    }
    return {
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    };
  };
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || 'all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(getInitialDateRange);
  
  // Action modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [actionInvoice, setActionInvoice] = useState<Invoice | null>(null);
  
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['admin']);
  
  // Update URL when date range changes
  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('from', format(newRange.startDate, 'yyyy-MM-dd'));
    newParams.set('to', format(newRange.endDate, 'yyyy-MM-dd'));
    setSearchParams(newParams, { replace: true });
  };
  
  const [companyProfile, setCompanyProfile] = useState<any>(null);

  // Fetch invoices from Supabase
  const fetchInvoices = useCallback(async () => {
    if (!user?.profile?.company_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      const { data: invoicesData, error } = await supabase
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
        `)
        .eq('company_id', user.profile.company_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invoices:', error);
        toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' });
        setIsLoading(false);
        return;
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

      setInvoices(mappedInvoices);
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Failed to load invoices', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.profile?.company_id]);

  // Fetch company profile
  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!user?.profile?.company_id) return;

      const { data } = await supabase
        .from('companies')
        .select('*')
        .eq('id', user.profile.company_id)
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
  }, [user?.profile?.company_id]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const matchesSearch = 
        invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        invoice.clientName.toLowerCase().includes(search.toLowerCase()) ||
        invoice.cleanerName.toLowerCase().includes(search.toLowerCase());
      
      // Status filter (from URL or dropdown)
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      
      // Date range filter - filter by service date
      let matchesDateRange = true;
      if (dateRange.startDate && dateRange.endDate && invoice.serviceDate) {
        try {
          const serviceDate = toSafeLocalDate(invoice.serviceDate);
          matchesDateRange = isWithinInterval(serviceDate, { 
            start: dateRange.startDate, 
            end: dateRange.endDate 
          });
        } catch {
          matchesDateRange = true;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [invoices, search, statusFilter, dateRange]);

  const stats = useMemo(() => {
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'sent').length;
    const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.total, 0);
    const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((acc, i) => acc + i.total, 0);
    return { total, paid, pending, totalRevenue, pendingAmount };
  }, [invoices]);

  const handleMarkPaid = async (invoice: Invoice) => {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoice.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to update invoice', variant: 'destructive' });
      return;
    }

    // Notify admin about the paid invoice
    await notifyInvoicePaid(invoice.invoiceNumber, invoice.clientName, invoice.total, invoice.id);

    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'paid' } : i));
    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} marked as paid` });
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

    setInvoices(prev => prev.map(i => i.id === invoice.id ? { ...i, status: 'sent' } : i));
    toast({ title: 'Success', description: `Invoice ${invoice.invoiceNumber} sent via email` });
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
              
              {/* Admin-only actions */}
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  {isPaid ? (
                    <DropdownMenuItem disabled className="text-muted-foreground">
                      <Lock className="h-4 w-4 mr-2" />
                      Invoice is locked (Paid)
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
                      <DropdownMenuItem 
                        onClick={() => { setActionInvoice(invoice); setShowDeleteModal(true); }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Permanently
                      </DropdownMenuItem>
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

  if (isLoading) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      <PageHeader 
        title="Invoices"
        description="Manage invoices for completed cleaning services"
      />

      {/* Stats Cards */}
      <div className="grid gap-2.5 md:grid-cols-4">
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
        <PeriodSelector 
          value={dateRange}
          onChange={handleDateRangeChange}
        />
      </div>

      {/* Table */}
      <DataTable 
        columns={columns}
        data={filteredInvoices}
        onRowClick={handlePreview}
        emptyMessage="No invoices found. Invoices are generated when jobs are marked as completed."
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
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold">{companyProfile?.companyName || 'Company'}</h3>
                  <p className="text-sm text-muted-foreground">{companyProfile?.address}</p>
                  <p className="text-sm text-muted-foreground">{companyProfile?.city}, {companyProfile?.province}</p>
                  <p className="text-sm text-muted-foreground">{companyProfile?.phone}</p>
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
                      Cleaner: {selectedInvoice.cleanerName}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {selectedInvoice.lineItems.length > 0 && (
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
              )}

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
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            {selectedInvoice && (
              <>
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

      {/* Invoice Action Modals */}
      <CancelInvoiceModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        invoice={actionInvoice ? {
          id: actionInvoice.id,
          invoiceNumber: actionInvoice.invoiceNumber,
          clientName: actionInvoice.clientName,
          total: actionInvoice.total,
          status: actionInvoice.status,
          jobId: actionInvoice.jobId,
        } : null}
        onSuccess={fetchInvoices}
      />

      <DeleteInvoiceModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        invoice={actionInvoice ? {
          id: actionInvoice.id,
          invoiceNumber: actionInvoice.invoiceNumber,
          clientName: actionInvoice.clientName,
          total: actionInvoice.total,
          status: actionInvoice.status,
          jobId: actionInvoice.jobId,
        } : null}
        onSuccess={fetchInvoices}
      />

      <RegenerateInvoiceModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        invoice={actionInvoice ? {
          id: actionInvoice.id,
          invoiceNumber: actionInvoice.invoiceNumber,
          clientName: actionInvoice.clientName,
          total: actionInvoice.total,
          status: actionInvoice.status,
          jobId: actionInvoice.jobId,
        } : null}
        onSuccess={fetchInvoices}
      />
    </div>
  );
};

export default Invoices;