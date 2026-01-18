import { useState, useCallback, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import SearchInput from '@/components/ui/search-input';
import PaginatedDataTable, { Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import GenerateReportModal from '@/components/financial/GenerateReportModal';
import { LedgerColumnSettings } from '@/components/financial/LedgerColumnSettings';
import { FinancialInfoBanner } from '@/components/financial/FinancialInfoBanner';
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
  Banknote,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

// Import local types - enterprise type-safe approach
import type { LedgerEntry } from '@/types/financial-ledger';
import { 
  queryFinancialLedger, 
  queryLedgerDistinctValues,
  type LedgerQueryParams 
} from '@/lib/supabase-queries';

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

// Event type configuration (cash_collection removed - revenue captured via payment_receipts)
const eventTypeConfig: Record<string, { color: string; bgColor: string; label: string; icon: typeof DollarSign }> = {
  invoice: { color: 'text-primary', bgColor: 'bg-primary/10', label: 'Invoice', icon: FileText },
  payment: { color: 'text-success', bgColor: 'bg-success/10', label: 'Receipt', icon: DollarSign },
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
  kept_by_cleaner: 'Kept by Cleaner',
};

const Financial = () => {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const { activeCompanyId, activeCompanyName } = useActiveCompanyStore();
  const isAdmin = hasRole(['admin']);
  const isAdminOrManager = hasRole(['admin', 'manager']);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Validation error state for enterprise error handling
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [cleanerFilter, setCleanerFilter] = useState<string>('all');
  
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
  
  // Dynamic filter options based on actual data
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [statusTypes, setStatusTypes] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch filter options (clients, cleaners, and dynamic filter values)
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!activeCompanyId) return;
      
      // Fetch clients and cleaners from their respective tables (type-safe)
      const [clientsRes, cleanersRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name')
          .eq('company_id', activeCompanyId)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('company_id', activeCompanyId)
          .order('first_name'),
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

      // Fetch unique filter values from financial_ledger view (type-safe via helper)
      const [eventTypesData, statusData, paymentMethodsData] = await Promise.all([
        queryLedgerDistinctValues('event_type', activeCompanyId),
        queryLedgerDistinctValues('status', activeCompanyId),
        queryLedgerDistinctValues('payment_method', activeCompanyId),
      ]);

      setEventTypes(eventTypesData);
      setStatusTypes(statusData);
      setPaymentMethods(paymentMethodsData);
    };
    
    fetchFilterOptions();
  }, [activeCompanyId]);

  // Server-side pagination fetch function - type-safe with Zod validation
  const fetchLedgerEntries = useCallback(async (from: number, to: number) => {
    if (!activeCompanyId) {
      return { data: [], count: 0 };
    }

    const startDate = globalPeriod.from ? format(globalPeriod.from, 'yyyy-MM-dd') : format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const endDate = globalPeriod.to ? format(globalPeriod.to, 'yyyy-MM-dd') : format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Build query params
    const params: LedgerQueryParams = {
      companyId: activeCompanyId,
      startDate,
      endDate,
      eventTypeFilter,
      statusFilter,
      paymentMethodFilter,
      clientFilter,
      cleanerFilter,
      referenceFilter,
      grossFilter,
      deductFilter,
      netFilter,
      search: debouncedSearch,
      from,
      to,
    };

    // Execute type-safe query with Zod validation
    const result = await queryFinancialLedger(params);

    // Handle query errors
    if (result.error) {
      toast({ title: 'Error', description: 'Failed to load financial data', variant: 'destructive' });
      setValidationError(null);
      return { data: [], count: 0 };
    }

    // Handle validation errors (show banner but don't crash)
    if (result.validation.hasErrors) {
      setValidationError(`${result.validation.errorCount} record(s) failed validation and may not be displayed.`);
    } else {
      setValidationError(null);
    }

    return { data: result.data, count: result.count };
  }, [activeCompanyId, globalPeriod, eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, debouncedSearch, referenceFilter, grossFilter, deductFilter, netFilter]);

  const {
    data: entries,
    isLoading,
    pagination,
    setPage,
    setPageSize,
    refresh,
  } = useServerPagination<LedgerEntry>(fetchLedgerEntries, { pageSize: 25 });

  // Refresh when filters or company change
  useEffect(() => {
    refresh();
  }, [activeCompanyId, globalPeriod, eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, debouncedSearch, referenceFilter, grossFilter, deductFilter, netFilter]);

  // Export functions
  const exportToCSV = () => {
    const periodFrom = globalPeriod.from ? format(globalPeriod.from, 'MMM d, yyyy') : 'N/A';
    const periodTo = globalPeriod.to ? format(globalPeriod.to, 'MMM d, yyyy') : 'N/A';
    
    // Company info header for accountant
    const companyInfo = [
      ['Company:', activeCompanyName || 'N/A'],
      ['Period:', `${periodFrom} - ${periodTo}`],
      ['Generated:', format(new Date(), 'MMMM d, yyyy HH:mm')],
      ['Records:', entries.length.toString()],
      [], // Empty row
    ];
    
    const headers = ['Date', 'Type', 'Client', 'Employee', 'Reference', 'Payment Method', 'Gross (CAD)', 'Deductions (CAD)', 'Net (CAD)', 'Status'];
    const rows = entries.map(e => [
      e.transactionDate,
      eventTypeConfig[e.eventType]?.label || e.eventType,
      e.clientName || '',
      e.cleanerName || '',
      e.referenceNumber || e.serviceReference || '',
      paymentMethodLabels[e.paymentMethod || ''] || e.paymentMethod || '',
      e.grossAmount.toFixed(2),
      e.deductions.toFixed(2),
      e.netAmount.toFixed(2),
      statusConfig[e.status]?.label || e.status,
    ]);
    
    // Calculate totals for accountant
    const totals = entries.reduce((acc, e) => ({
      gross: acc.gross + e.grossAmount,
      deductions: acc.deductions + e.deductions,
      net: acc.net + e.netAmount,
    }), { gross: 0, deductions: 0, net: 0 });
    
    // Add empty row and totals row
    rows.push(['', '', '', '', '', '', '', '', '', '']);
    rows.push(['', '', '', '', 'TOTALS:', '', totals.gross.toFixed(2), totals.deductions.toFixed(2), totals.net.toFixed(2), '']);
    
    const csvContent = [
      ...companyInfo.map(row => row.join(',')),
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const companySlug = activeCompanyName?.replace(/\s+/g, '-') || 'report';
    a.download = `ledger-${companySlug}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Success', description: 'CSV exported successfully' });
  };

  const exportToPDF = () => {
    const totals = entries.reduce((acc, e) => ({
      gross: acc.gross + e.grossAmount,
      deductions: acc.deductions + e.deductions,
      net: acc.net + e.netAmount,
    }), { gross: 0, deductions: 0, net: 0 });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Error', description: 'Please allow popups to export PDF', variant: 'destructive' });
      return;
    }

    const periodFrom = globalPeriod.from ? format(globalPeriod.from, 'MMMM d, yyyy') : 'N/A';
    const periodTo = globalPeriod.to ? format(globalPeriod.to, 'MMMM d, yyyy') : 'N/A';
    const companySlug = activeCompanyName?.replace(/\s+/g, '-') || 'report';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ledger - ${activeCompanyName || 'Company'}</title>
        <style>
          @page { size: A4 landscape; margin: 1.5cm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9px; color: #333; margin: 0; padding: 20px; }
          .company-name { color: #0A6C53; font-size: 20px; margin: 0 0 2px 0; font-weight: bold; }
          .report-title { color: #666; font-size: 14px; margin: 0 0 15px 0; }
          .meta { color: #666; margin-bottom: 15px; font-size: 10px; }
          .meta p { margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f4f4f4; padding: 8px 6px; text-align: left; border-bottom: 2px solid #ddd; font-size: 9px; font-weight: 600; }
          td { padding: 6px; border-bottom: 1px solid #eee; font-size: 9px; }
          tr:nth-child(even) { background: #fafafa; }
          .amount { text-align: right; font-family: 'Courier New', monospace; }
          .ref { font-family: 'Courier New', monospace; font-size: 8px; }
          .total-row { font-weight: bold; background: #f0f9f6 !important; border-top: 2px solid #0A6C53; }
          .total-row td { padding: 10px 6px; font-size: 10px; }
          .footer { margin-top: 20px; padding: 10px; background: #f9f9f9; border-radius: 4px; font-size: 9px; }
          .footer strong { color: #0A6C53; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <h1 class="company-name">${activeCompanyName || 'Company'}</h1>
        <h2 class="report-title">Financial Ledger Report</h2>
        <div class="meta">
          <p><strong>Period:</strong> ${periodFrom} — ${periodTo}</p>
          <p><strong>Generated:</strong> ${format(new Date(), 'MMMM d, yyyy HH:mm')} | <strong>Records:</strong> ${entries.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Client</th>
              <th>Employee</th>
              <th>Reference</th>
              <th>Payment</th>
              <th class="amount">Gross (CAD)</th>
              <th class="amount">Deductions</th>
              <th class="amount">Net (CAD)</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(e => `
              <tr>
                <td>${e.transactionDate}</td>
                <td>${eventTypeConfig[e.eventType]?.label || e.eventType}</td>
                <td>${e.clientName || '—'}</td>
                <td>${e.cleanerName || '—'}</td>
                <td class="ref">${e.referenceNumber || e.serviceReference || '—'}</td>
                <td>${paymentMethodLabels[e.paymentMethod || ''] || e.paymentMethod || '—'}</td>
                <td class="amount">$${e.grossAmount.toFixed(2)}</td>
                <td class="amount">$${e.deductions.toFixed(2)}</td>
                <td class="amount">$${e.netAmount.toFixed(2)}</td>
                <td>${statusConfig[e.status]?.label || e.status}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="6"><strong>TOTALS</strong></td>
              <td class="amount">$${totals.gross.toFixed(2)}</td>
              <td class="amount">$${totals.deductions.toFixed(2)}</td>
              <td class="amount">$${totals.net.toFixed(2)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <div class="footer">
          <strong>Summary:</strong> Total Net Revenue: <strong>$${totals.net.toFixed(2)} CAD</strong> | 
          Currency: Canadian Dollar (CAD)
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  // Filter options for column headers

  // Dynamic filter options based on actual data in the ledger
  const eventTypeOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Types' },
    ...eventTypes.map(type => ({
      value: type,
      label: eventTypeConfig[type]?.label || type
    }))
  ], [eventTypes]);

  const statusOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Status' },
    ...statusTypes.map(status => ({
      value: status,
      label: statusConfig[status]?.label || status
    }))
  ], [statusTypes]);

  const paymentMethodOptions: FilterOption[] = useMemo(() => [
    { value: 'all', label: 'All Methods' },
    ...paymentMethods.map(method => ({
      value: method,
      label: paymentMethodLabels[method] || method
    }))
  ], [paymentMethods]);

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
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</span>
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
      render: (entry) => {
        const refValue = entry.referenceNumber || entry.serviceReference || '—';
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[100px] block cursor-default">
                {refValue}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="font-mono text-xs">{refValue}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
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
  }), [eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, referenceFilter, grossFilter, deductFilter, netFilter, eventTypeOptions, statusOptions, paymentMethodOptions, clientOptions, cleanerOptions, referenceOptions, grossOptions, deductOptions, netOptions]);

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
      {/* Validation Error Banner - Enterprise error handling */}
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Ledger data validation warning: {validationError}
          </AlertDescription>
        </Alert>
      )}

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
                <DropdownMenuItem onClick={exportToPDF} className="text-xs">
                  <Printer className="h-3.5 w-3.5 mr-2" />
                  Export PDF
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
