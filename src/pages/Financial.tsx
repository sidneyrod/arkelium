import { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SearchInput from '@/components/ui/search-input';
import PaginatedDataTable, { Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import GenerateReportModal from '@/components/financial/GenerateReportModal';
import { PeriodSelector, DateRange as PeriodDateRange } from '@/components/ui/period-selector';
import {
  BookOpen,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
  ArrowDownRight,
  Minus,
  FileBarChart,
  Eye,
  Banknote,
  Wallet
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { cn } from '@/lib/utils';

// Types
interface LedgerEntry {
  id: string;
  companyId: string;
  clientId: string | null;
  cleanerId: string | null;
  jobId: string | null;
  transactionDate: string;
  eventType: string;
  clientName: string | null;
  cleanerName: string | null;
  serviceReference: string | null;
  referenceNumber: string | null;
  paymentMethod: string | null;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: string;
  createdAt: string;
  notes: string | null;
}

// Status configuration
const statusConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  paid: { color: 'text-success', bgColor: 'bg-success/10', label: 'Paid' },
  pending: { color: 'text-warning', bgColor: 'bg-warning/10', label: 'Pending' },
  overdue: { color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Overdue' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted/50', label: 'Cancelled' },
  completed: { color: 'text-success', bgColor: 'bg-success/10', label: 'Completed' },
  approved: { color: 'text-info', bgColor: 'bg-info/10', label: 'Approved' },
  scheduled: { color: 'text-info', bgColor: 'bg-info/10', label: 'Scheduled' },
  draft: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Draft' },
  sent: { color: 'text-info', bgColor: 'bg-info/10', label: 'Sent' },
  settled: { color: 'text-success', bgColor: 'bg-success/10', label: 'Settled' },
};

// Event type configuration
const eventTypeConfig: Record<string, { color: string; bgColor: string; label: string; icon: typeof DollarSign }> = {
  invoice: { color: 'text-primary', bgColor: 'bg-primary/10', label: 'Invoice', icon: FileText },
  payment: { color: 'text-success', bgColor: 'bg-success/10', label: 'Payment', icon: DollarSign },
  cash_collection: { color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'Cash', icon: Banknote },
  visit: { color: 'text-info', bgColor: 'bg-info/10', label: 'Visit', icon: Eye },
  payroll: { color: 'text-warning', bgColor: 'bg-warning/10', label: 'Payroll', icon: Wallet },
  refund: { color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Refund', icon: ArrowDownRight },
  adjustment: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Adj.', icon: Minus },
};

// Payment method labels
const paymentMethodLabels: Record<string, string> = {
  cash: 'Cash',
  e_transfer: 'E-Transfer',
  'e-transfer': 'E-Transfer',
  cheque: 'Cheque',
  credit_card: 'Credit Card',
  bank_transfer: 'Bank Transfer',
  no_charge: 'No Charge',
  pending: 'Pending',
};

const Financial = () => {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(['admin']);
  const isAdminOrManager = hasRole(['admin', 'manager']);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [cleanerFilter, setCleanerFilter] = useState<string>('all');
  const [globalPeriod, setGlobalPeriod] = useState<PeriodDateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });
  
  // Unique values for filters
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [cleaners, setCleaners] = useState<{id: string; name: string}[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!user?.profile?.company_id) return;
      
      const [clientsRes, cleanersRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name')
          .eq('company_id', user.profile.company_id)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('company_id', user.profile.company_id)
          .order('first_name')
      ]);
      
      if (clientsRes.data) {
        setClients(clientsRes.data.map(c => ({ id: c.id, name: c.name })));
      }
      if (cleanersRes.data) {
        setCleaners(cleanersRes.data.map(c => ({ 
          id: c.id, 
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown'
        })));
      }
    };
    
    fetchFilterOptions();
  }, [user?.profile?.company_id]);

  // Server-side pagination fetch function
  const fetchLedgerEntries = useCallback(async (from: number, to: number) => {
    if (!user?.profile?.company_id) {
      return { data: [], count: 0 };
    }

    const startDate = format(globalPeriod.startDate, 'yyyy-MM-dd');
    const endDate = format(globalPeriod.endDate, 'yyyy-MM-dd');

    let query = supabase
      .from('financial_ledger')
      .select('*', { count: 'exact' })
      .eq('company_id', user.profile.company_id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // Apply filters
    if (eventTypeFilter !== 'all') {
      query = query.eq('event_type', eventTypeFilter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (paymentMethodFilter !== 'all') {
      query = query.eq('payment_method', paymentMethodFilter);
    }
    if (clientFilter !== 'all') {
      query = query.eq('client_id', clientFilter);
    }
    if (cleanerFilter !== 'all') {
      query = query.eq('cleaner_id', cleanerFilter);
    }
    if (debouncedSearch) {
      query = query.or(`client_name.ilike.%${debouncedSearch}%,cleaner_name.ilike.%${debouncedSearch}%,reference_number.ilike.%${debouncedSearch}%`);
    }

    query = query
      .order('transaction_date', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching ledger:', error);
      toast({ title: 'Error', description: 'Failed to load financial data', variant: 'destructive' });
      return { data: [], count: 0 };
    }

    const mappedEntries: LedgerEntry[] = (data || []).map((entry: any) => ({
      id: entry.id,
      companyId: entry.company_id,
      clientId: entry.client_id,
      cleanerId: entry.cleaner_id,
      jobId: entry.job_id,
      transactionDate: entry.transaction_date,
      eventType: entry.event_type,
      clientName: entry.client_name,
      cleanerName: entry.cleaner_name,
      serviceReference: entry.service_reference,
      referenceNumber: entry.reference_number,
      paymentMethod: entry.payment_method,
      grossAmount: parseFloat(entry.gross_amount) || 0,
      deductions: parseFloat(entry.deductions) || 0,
      netAmount: parseFloat(entry.net_amount) || 0,
      status: entry.status,
      createdAt: entry.created_at,
      notes: entry.notes,
    }));

    return { data: mappedEntries, count: count || 0 };
  }, [user?.profile?.company_id, globalPeriod, eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, debouncedSearch]);

  const {
    data: entries,
    isLoading,
    pagination,
    setPage,
    setPageSize,
    refresh,
  } = useServerPagination<LedgerEntry>(fetchLedgerEntries, { pageSize: 25 });

  // Refresh when filters change
  useEffect(() => {
    refresh();
  }, [globalPeriod, eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, debouncedSearch]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Client', 'Employee', 'Reference', 'Payment Method', 'Gross (CAD)', 'Deductions (CAD)', 'Net (CAD)', 'Status'];
    const rows = entries.map(e => [
      e.transactionDate,
      eventTypeConfig[e.eventType]?.label || e.eventType,
      e.clientName || '',
      e.cleanerName || '',
      e.referenceNumber || '',
      paymentMethodLabels[e.paymentMethod || ''] || e.paymentMethod || '',
      e.grossAmount.toFixed(2),
      e.deductions.toFixed(2),
      e.netAmount.toFixed(2),
      statusConfig[e.status]?.label || e.status,
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `\"${cell}\"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-ledger-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'CSV exported successfully' });
  };

  // Table columns - Dense, accountant-friendly formatting
  const columns: Column<LedgerEntry>[] = [
    {
      key: 'transactionDate',
      header: 'Date',
      render: (entry) => (
        <span className="font-mono text-xs">
          {entry.transactionDate ? format(parseISO(entry.transactionDate), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'eventType',
      header: 'Type',
      render: (entry) => {
        const config = eventTypeConfig[entry.eventType];
        if (!config) return <span className="text-xs">{entry.eventType}</span>;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-1.5">
            <div className={cn('p-1 rounded', config.bgColor)}>
              <Icon className={cn('h-3 w-3', config.color)} />
            </div>
            <span className="text-xs font-medium">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (entry) => (
        <span className="text-xs truncate max-w-[120px] block">{entry.clientName || '—'}</span>
      ),
    },
    {
      key: 'cleanerName',
      header: 'Employee',
      render: (entry) => (
        <span className="text-xs truncate max-w-[100px] block">{entry.cleanerName || '—'}</span>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (entry) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {entry.referenceNumber || entry.serviceReference?.substring(0, 8) || '—'}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (entry) => (
        <span className="text-xs">
          {paymentMethodLabels[entry.paymentMethod || ''] || entry.paymentMethod || '—'}
        </span>
      ),
    },
    {
      key: 'grossAmount',
      header: 'Gross',
      render: (entry) => (
        <span className={cn(
          'font-mono text-xs tabular-nums',
          entry.eventType === 'payroll' || entry.eventType === 'refund' ? 'text-destructive' : 'text-foreground'
        )}>
          {entry.eventType === 'payroll' || entry.eventType === 'refund' ? '-' : ''}
          ${entry.grossAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deduct.',
      render: (entry) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          ${entry.deductions.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'netAmount',
      header: 'Net',
      render: (entry) => (
        <span className={cn(
          'font-mono text-xs font-semibold tabular-nums',
          entry.eventType === 'payroll' || entry.eventType === 'refund' ? 'text-destructive' : 'text-success'
        )}>
          {entry.eventType === 'payroll' || entry.eventType === 'refund' ? '-' : '+'}
          ${entry.netAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (entry) => {
        const config = statusConfig[entry.status] || statusConfig.pending;
        return (
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', config.bgColor, config.color)}>
            {config.label}
          </span>
        );
      },
    },
  ];

  if (isLoading && entries.length === 0) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Compact Top Bar: Period + Entry Count + Actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <PeriodSelector value={globalPeriod} onChange={setGlobalPeriod} />
          <div className="flex items-center text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            {pagination.totalCount} {pagination.totalCount === 1 ? 'entry' : 'entries'}
          </div>
        </div>
        
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowReportModal(true)} className="gap-1.5 h-8 text-xs">
              <FileBarChart className="h-3.5 w-3.5" />
              Generate Report
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={exportToCSV} className="text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.print()} className="text-xs">
                  <Printer className="h-3.5 w-3.5 mr-2" />
                  Print Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Filters Row - Compact inline */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput 
          placeholder="Search client, employee, ref..."
          value={search}
          onChange={setSearch}
          className="w-48 h-8 text-xs"
        />
        
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Types</SelectItem>
            <SelectItem value="invoice" className="text-xs">Invoice</SelectItem>
            <SelectItem value="payment" className="text-xs">Payment</SelectItem>
            <SelectItem value="cash_collection" className="text-xs">Cash</SelectItem>
            <SelectItem value="payroll" className="text-xs">Payroll</SelectItem>
            <SelectItem value="refund" className="text-xs">Refund</SelectItem>
            <SelectItem value="adjustment" className="text-xs">Adjustment</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="paid" className="text-xs">Paid</SelectItem>
            <SelectItem value="approved" className="text-xs">Approved</SelectItem>
            <SelectItem value="settled" className="text-xs">Settled</SelectItem>
            <SelectItem value="completed" className="text-xs">Completed</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Methods</SelectItem>
            <SelectItem value="cash" className="text-xs">Cash</SelectItem>
            <SelectItem value="e_transfer" className="text-xs">E-Transfer</SelectItem>
            <SelectItem value="cheque" className="text-xs">Cheque</SelectItem>
            <SelectItem value="credit_card" className="text-xs">Credit Card</SelectItem>
            <SelectItem value="bank_transfer" className="text-xs">Bank Transfer</SelectItem>
          </SelectContent>
        </Select>
        
        {clients.length > 0 && (
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client.id} value={client.id} className="text-xs">{client.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        
        {cleaners.length > 0 && (
          <Select value={cleanerFilter} onValueChange={setCleanerFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Employees</SelectItem>
              {cleaners.map(cleaner => (
                <SelectItem key={cleaner.id} value={cleaner.id} className="text-xs">{cleaner.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Full-Width Ledger Table - Dense styling */}
      <PaginatedDataTable
        columns={columns}
        data={entries}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
        emptyMessage="No finalized transactions found for the selected period."
        className="[&_th]:bg-muted/30 [&_th]:text-xs [&_th]:font-medium [&_th]:py-2 [&_td]:py-1.5"
      />
      
      {/* Footer - Currency and period info */}
      <div className="flex justify-between items-center text-xs text-muted-foreground border-t border-border/50 pt-2">
        <span>Currency: CAD (Canadian Dollar)</span>
        <div className="flex items-center gap-4">
          <span>Showing {entries.length} of {pagination.totalCount}</span>
          {globalPeriod.startDate && globalPeriod.endDate && (
            <span>Period: {format(globalPeriod.startDate, 'MMM d')} — {format(globalPeriod.endDate, 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>

      {/* Generate Financial Report Modal */}
      <GenerateReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
      />
    </div>
  );
};

export default Financial;
