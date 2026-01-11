import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SearchInput from '@/components/ui/search-input';
import PaginatedDataTable, { Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import GenerateReportModal from '@/components/financial/GenerateReportModal';
import { LedgerColumnSettings } from '@/components/financial/LedgerColumnSettings';
import { DatePickerDialog } from '@/components/ui/date-picker-dialog';
import { FilterableColumnHeader, FilterOption } from '@/components/ui/filterable-column-header';
import { useLedgerColumnOrder } from '@/hooks/useLedgerColumnOrder';
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
import { DateRange } from 'react-day-picker';
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
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [referenceFilter, setReferenceFilter] = useState<string>('all');
  const [grossFilter, setGrossFilter] = useState<string>('all');
  const [deductFilter, setDeductFilter] = useState<string>('all');
  const [netFilter, setNetFilter] = useState<string>('all');
  const [globalPeriod, setGlobalPeriod] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
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

    const startDate = globalPeriod.from ? format(globalPeriod.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = globalPeriod.to ? format(globalPeriod.to, 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd');

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

  // Filter options for column headers
  const dateOptions: FilterOption[] = useMemo(() => {
    const uniqueDates = [...new Set(entries.map(e => {
      if (!e.transactionDate) return null;
      return format(parseISO(e.transactionDate), 'yyyy-MM');
    }).filter(Boolean))].sort().reverse();
    
    return [
      { value: 'all', label: 'All Dates' },
      ...uniqueDates.map(d => ({ value: d as string, label: format(parseISO(`${d}-01`), 'MMM yyyy') }))
    ];
  }, [entries]);

  const eventTypeOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Types' },
    { value: 'invoice', label: 'Invoice' },
    { value: 'payment', label: 'Payment' },
    { value: 'cash_collection', label: 'Cash' },
    { value: 'payroll', label: 'Payroll' },
    { value: 'refund', label: 'Refund' },
    { value: 'adjustment', label: 'Adjustment' },
  ], []);

  const statusOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Status' },
    { value: 'paid', label: 'Paid' },
    { value: 'approved', label: 'Approved' },
    { value: 'settled', label: 'Settled' },
    { value: 'completed', label: 'Completed' },
  ], []);

  const paymentMethodOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'e_transfer', label: 'E-Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
  ], []);

  const clientOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Clients' },
    ...clients.map(c => ({ value: c.id, label: c.name }))
  ], [clients]);

  const cleanerOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Employees' },
    ...cleaners.map(c => ({ value: c.id, label: c.name }))
  ], [cleaners]);

  const referenceOptions: FilterOption[] = useMemo(() => {
    const prefixes = [...new Set(entries.map(e => {
      const ref = e.referenceNumber || e.serviceReference || '';
      const match = ref.match(/^([A-Z]+)/);
      return match ? match[1] : null;
    }).filter(Boolean))].sort();
    
    return [
      { value: 'all', label: 'All Refs' },
      ...prefixes.map(p => ({ value: p as string, label: p as string }))
    ];
  }, [entries]);

  const grossOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Amounts' },
    { value: '0-50', label: '$0 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100-250', label: '$100 - $250' },
    { value: '250-500', label: '$250 - $500' },
    { value: '500+', label: '$500+' },
  ], []);

  const deductOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All' },
    { value: '0', label: '$0 (None)' },
    { value: '0-25', label: '$0.01 - $25' },
    { value: '25-50', label: '$25 - $50' },
    { value: '50+', label: '$50+' },
  ], []);

  const netOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Amounts' },
    { value: '0-50', label: '$0 - $50' },
    { value: '50-100', label: '$50 - $100' },
    { value: '100-250', label: '$100 - $250' },
    { value: '250-500', label: '$250 - $500' },
    { value: '500+', label: '$500+' },
  ], []);

  // Column reordering hook
  const { columnConfig, visibleColumns, setNewOrder, resetToDefaults } = useLedgerColumnOrder();

  // All possible column definitions mapped by key
  const allColumnDefinitions: Record<string, Column<LedgerEntry>> = useMemo(() => ({
    transactionDate: {
      key: 'transactionDate',
      header: (
        <FilterableColumnHeader
          title="Date"
          value={dateFilter}
          onChange={setDateFilter}
          options={dateOptions}
          allLabel="All Dates"
        />
      ),
      render: (entry) => (
        <span className="font-mono text-xs">
          {entry.transactionDate ? format(parseISO(entry.transactionDate), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    eventType: {
      key: 'eventType',
      header: (
        <FilterableColumnHeader
          title="Type"
          value={eventTypeFilter}
          onChange={setEventTypeFilter}
          options={eventTypeOptions}
          allLabel="All Types"
        />
      ),
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
    referenceNumber: {
      key: 'referenceNumber',
      header: (
        <FilterableColumnHeader
          title="Reference"
          value={referenceFilter}
          onChange={setReferenceFilter}
          options={referenceOptions}
          allLabel="All Refs"
        />
      ),
      render: (entry) => (
        <span className="font-mono text-[11px] text-muted-foreground">
          {entry.referenceNumber || entry.serviceReference?.substring(0, 8) || '—'}
        </span>
      ),
    },
    clientName: {
      key: 'clientName',
      header: (
        <FilterableColumnHeader
          title="Client"
          value={clientFilter}
          onChange={setClientFilter}
          options={clientOptions}
          allLabel="All Clients"
        />
      ),
      render: (entry) => (
        <span className="text-xs truncate max-w-[120px] block">{entry.clientName || '—'}</span>
      ),
    },
    cleanerName: {
      key: 'cleanerName',
      header: (
        <FilterableColumnHeader
          title="Employee"
          value={cleanerFilter}
          onChange={setCleanerFilter}
          options={cleanerOptions}
          allLabel="All Employees"
        />
      ),
      render: (entry) => (
        <span className="text-xs truncate max-w-[100px] block">{entry.cleanerName || '—'}</span>
      ),
    },
    paymentMethod: {
      key: 'paymentMethod',
      header: (
        <FilterableColumnHeader
          title="Payment"
          value={paymentMethodFilter}
          onChange={setPaymentMethodFilter}
          options={paymentMethodOptions}
          allLabel="All Methods"
        />
      ),
      render: (entry) => (
        <span className="text-xs">
          {paymentMethodLabels[entry.paymentMethod || ''] || entry.paymentMethod || '—'}
        </span>
      ),
    },
    grossAmount: {
      key: 'grossAmount',
      header: (
        <FilterableColumnHeader
          title="Gross"
          value={grossFilter}
          onChange={setGrossFilter}
          options={grossOptions}
          allLabel="All Amounts"
        />
      ),
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
    deductions: {
      key: 'deductions',
      header: (
        <FilterableColumnHeader
          title="Deduct."
          value={deductFilter}
          onChange={setDeductFilter}
          options={deductOptions}
          allLabel="All"
        />
      ),
      render: (entry) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          ${entry.deductions.toFixed(2)}
        </span>
      ),
    },
    netAmount: {
      key: 'netAmount',
      header: (
        <FilterableColumnHeader
          title="Net"
          value={netFilter}
          onChange={setNetFilter}
          options={netOptions}
          allLabel="All Amounts"
        />
      ),
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
    status: {
      key: 'status',
      header: (
        <FilterableColumnHeader
          title="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={statusOptions}
          allLabel="All Status"
        />
      ),
      render: (entry) => {
        const config = statusConfig[entry.status] || statusConfig.pending;
        return (
          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', config.bgColor, config.color)}>
            {config.label}
          </span>
        );
      },
    },
  }), [eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, dateFilter, referenceFilter, grossFilter, deductFilter, netFilter, eventTypeOptions, statusOptions, paymentMethodOptions, clientOptions, cleanerOptions, dateOptions, referenceOptions, grossOptions, deductOptions, netOptions]);

  // Build columns array based on user's configured order and visibility
  const columns: Column<LedgerEntry>[] = useMemo(() => {
    return visibleColumns
      .map(col => allColumnDefinitions[col.key])
      .filter(Boolean);
  }, [visibleColumns, allColumnDefinitions]);

  if (isLoading && entries.length === 0) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-3">
      {/* Single Compact Top Bar: Search + Date Picker + Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap pb-1">
        <div className="flex items-center gap-3">
          <SearchInput 
            placeholder="Search client, employee, ref..."
            value={search}
            onChange={setSearch}
            className="w-64 h-8 text-xs"
          />
          <DatePickerDialog
            mode="range"
            selected={globalPeriod}
            onSelect={(value) => value && setGlobalPeriod(value as DateRange)}
            className="h-8 text-xs w-auto"
            dateFormat="MMM d, yyyy"
          />
          <div className="flex items-center text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 mr-1" />
            {pagination.totalCount} {pagination.totalCount === 1 ? 'entry' : 'entries'}
          </div>
        </div>
        
        {isAdminOrManager && (
          <div className="flex items-center gap-2">
            <LedgerColumnSettings
              columnConfig={columnConfig}
              onSave={setNewOrder}
              onReset={resetToDefaults}
            />
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
          {globalPeriod.from && globalPeriod.to && (
            <span>Period: {format(globalPeriod.from, 'MMM d')} — {format(globalPeriod.to, 'MMM d, yyyy')}</span>
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
