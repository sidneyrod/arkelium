import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import GenerateReportModal from '@/components/financial/GenerateReportModal';
import { PeriodSelector, DateRange as PeriodDateRange } from '@/components/ui/period-selector';
import {
  BookOpen,
  TrendingUp,
  DollarSign,
  Clock,
  Wallet,
  PieChart,
  MoreHorizontal,
  Eye,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  Loader2,
  Calendar as CalendarIcon,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileBarChart
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isWithinInterval, subMonths, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

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

interface FinancialSummary {
  grossRevenue: number;
  amountReceived: number;
  outstandingBalance: number;
  payrollCost: number;
  netMargin: number;
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
};

// Event type configuration
const eventTypeConfig: Record<string, { color: string; bgColor: string; label: string; icon: typeof TrendingUp }> = {
  invoice: { color: 'text-primary', bgColor: 'bg-primary/10', label: 'Invoice', icon: FileText },
  payment: { color: 'text-success', bgColor: 'bg-success/10', label: 'Payment', icon: DollarSign },
  visit: { color: 'text-info', bgColor: 'bg-info/10', label: 'Visit', icon: Eye },
  payroll: { color: 'text-warning', bgColor: 'bg-warning/10', label: 'Payroll', icon: Wallet },
  refund: { color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'Refund', icon: ArrowDownRight },
  adjustment: { color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'Adjustment', icon: Minus },
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
  
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  
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
  const [periodFilter, setPeriodFilter] = useState<string>('thisMonth');
  
  // Unique values for filters
  const [clients, setClients] = useState<{id: string; name: string}[]>([]);
  const [cleaners, setCleaners] = useState<{id: string; name: string}[]>([]);
  
  // Fetch ledger entries
  const fetchLedgerEntries = useCallback(async () => {
    if (!user?.profile?.company_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch from financial_ledger view
      const { data, error } = await supabase
        .from('financial_ledger')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching ledger:', error);
        toast({ title: 'Error', description: 'Failed to load financial data', variant: 'destructive' });
        setIsLoading(false);
        return;
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

      setEntries(mappedEntries);
      
      // Extract unique clients and cleaners
      const uniqueClients = new Map<string, string>();
      const uniqueCleaners = new Map<string, string>();
      
      mappedEntries.forEach(entry => {
        if (entry.clientId && entry.clientName) {
          uniqueClients.set(entry.clientId, entry.clientName);
        }
        if (entry.cleanerId && entry.cleanerName) {
          uniqueCleaners.set(entry.cleanerId, entry.cleanerName);
        }
      });
      
      setClients(Array.from(uniqueClients, ([id, name]) => ({ id, name })));
      setCleaners(Array.from(uniqueCleaners, ([id, name]) => ({ id, name })));
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Failed to load financial data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.profile?.company_id]);

  useEffect(() => {
    fetchLedgerEntries();
  }, [fetchLedgerEntries]);

  // Period filter is now handled by PeriodSelector component

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Search
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        (entry.clientName?.toLowerCase().includes(searchLower)) ||
        (entry.cleanerName?.toLowerCase().includes(searchLower)) ||
        (entry.referenceNumber?.toLowerCase().includes(searchLower)) ||
        (entry.serviceReference?.toLowerCase().includes(searchLower));
      
      if (search && !matchesSearch) return false;
      
      // Event type filter
      if (eventTypeFilter !== 'all' && entry.eventType !== eventTypeFilter) return false;
      
      // Status filter
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      
      // Payment method filter
      if (paymentMethodFilter !== 'all' && entry.paymentMethod !== paymentMethodFilter) return false;
      
      // Client filter
      if (clientFilter !== 'all' && entry.clientId !== clientFilter) return false;
      
      // Cleaner filter
      if (cleanerFilter !== 'all' && entry.cleanerId !== cleanerFilter) return false;
      
      // Date range filter - use globalPeriod
      if (globalPeriod.startDate && globalPeriod.endDate && entry.transactionDate) {
        try {
          const entryDate = parseISO(entry.transactionDate);
          if (!isWithinInterval(entryDate, { start: globalPeriod.startDate, end: globalPeriod.endDate })) {
            return false;
          }
        } catch {
          // Invalid date, include anyway
        }
      }
      
      return true;
    });
  }, [entries, search, eventTypeFilter, statusFilter, paymentMethodFilter, clientFilter, cleanerFilter, globalPeriod]);

  // Calculate summary
  const summary = useMemo((): FinancialSummary => {
    const invoices = filteredEntries.filter(e => e.eventType === 'invoice');
    const payments = filteredEntries.filter(e => e.eventType === 'payment' || (e.eventType === 'invoice' && e.status === 'paid'));
    const payroll = filteredEntries.filter(e => e.eventType === 'payroll');
    const pending = invoices.filter(e => e.status !== 'paid' && e.status !== 'cancelled');
    
    const grossRevenue = invoices.reduce((sum, e) => sum + e.grossAmount, 0);
    const amountReceived = payments.reduce((sum, e) => sum + e.netAmount, 0);
    const outstandingBalance = pending.reduce((sum, e) => sum + e.netAmount, 0);
    const payrollCost = payroll.reduce((sum, e) => sum + e.netAmount, 0);
    const netMargin = amountReceived - payrollCost;
    
    return { grossRevenue, amountReceived, outstandingBalance, payrollCost, netMargin };
  }, [filteredEntries]);

  // Export functions
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Client', 'Employee', 'Reference', 'Payment Method', 'Gross (CAD)', 'Deductions (CAD)', 'Net (CAD)', 'Status'];
    const rows = filteredEntries.map(e => [
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

  const exportToExcel = () => {
    // For Excel, we'll export as CSV with .xlsx extension (basic compatibility)
    // A more robust solution would use a library like xlsx
    exportToCSV();
  };

  // Table columns
  const columns: Column<LedgerEntry>[] = [
    {
      key: 'transactionDate',
      header: 'Date',
      render: (entry) => (
        <span className="font-mono text-sm">
          {entry.transactionDate ? format(parseISO(entry.transactionDate), 'MMM d, yyyy') : 'N/A'}
        </span>
      ),
    },
    {
      key: 'eventType',
      header: 'Type',
      render: (entry) => {
        const config = eventTypeConfig[entry.eventType];
        if (!config) return entry.eventType;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', config.bgColor)}>
              <Icon className={cn('h-3.5 w-3.5', config.color)} />
            </div>
            <span className="text-sm font-medium">{config.label}</span>
          </div>
        );
      },
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (entry) => (
        <span className="text-sm">{entry.clientName || '—'}</span>
      ),
    },
    {
      key: 'cleanerName',
      header: 'Employee',
      render: (entry) => (
        <span className="text-sm">{entry.cleanerName || '—'}</span>
      ),
    },
    {
      key: 'referenceNumber',
      header: 'Reference',
      render: (entry) => (
        <span className="font-mono text-xs text-muted-foreground">
          {entry.referenceNumber || entry.serviceReference?.substring(0, 8) || '—'}
        </span>
      ),
    },
    {
      key: 'paymentMethod',
      header: 'Payment',
      render: (entry) => (
        <span className="text-sm">
          {paymentMethodLabels[entry.paymentMethod || ''] || entry.paymentMethod || '—'}
        </span>
      ),
    },
    {
      key: 'grossAmount',
      header: 'Gross (CAD)',
      render: (entry) => (
        <span className={cn(
          'font-mono text-sm font-medium tabular-nums',
          entry.eventType === 'payroll' || entry.eventType === 'refund' ? 'text-destructive' : 'text-foreground'
        )}>
          {entry.eventType === 'payroll' || entry.eventType === 'refund' ? '-' : ''}
          ${entry.grossAmount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (entry) => (
        <span className="font-mono text-sm text-muted-foreground tabular-nums">
          ${entry.deductions.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'netAmount',
      header: 'Net (CAD)',
      render: (entry) => (
        <span className={cn(
          'font-mono text-sm font-semibold tabular-nums',
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
          <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
            {config.label}
          </span>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="container px-4 py-8 lg:px-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader 
          title="Financial Ledger"
          description="Comprehensive view of all financial transactions and events"
        />
        
        <div className="flex items-center gap-3">
          <PeriodSelector value={globalPeriod} onChange={setGlobalPeriod} />
          {isAdminOrManager && (
            <>
              <Button onClick={() => setShowReportModal(true)} className="gap-2">
                <FileBarChart className="h-4 w-4" />
                Generate Financial Report
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={exportToCSV}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.print()}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-border/50 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Gross Revenue</p>
                <p className="text-xl font-bold tabular-nums">${summary.grossRevenue.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Received</p>
                <p className="text-xl font-bold tabular-nums text-success">${summary.amountReceived.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-gradient-to-br from-amber-500/5 to-amber-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Outstanding</p>
                <p className="text-xl font-bold tabular-nums text-warning">${summary.outstandingBalance.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-gradient-to-br from-orange-500/5 to-orange-500/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Payroll Cost</p>
                <p className="text-xl font-bold tabular-nums">${summary.payrollCost.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={cn(
          "border-border/50",
          summary.netMargin >= 0 
            ? "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10" 
            : "bg-gradient-to-br from-red-500/5 to-red-500/10"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                summary.netMargin >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
              )}>
                <PieChart className={cn(
                  "h-5 w-5",
                  summary.netMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                )} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Net Margin</p>
                <p className={cn(
                  "text-xl font-bold tabular-nums",
                  summary.netMargin >= 0 ? "text-success" : "text-destructive"
                )}>
                  {summary.netMargin >= 0 ? '+' : ''}${summary.netMargin.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <SearchInput 
            placeholder="Search by client, employee, reference..."
            value={search}
            onChange={setSearch}
            className="w-full sm:max-w-xs"
          />
          
          {/* Period filter is handled by PeriodSelector in header */}
          
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Event Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="invoice">Invoice</SelectItem>
              <SelectItem value="payment">Payment</SelectItem>
              <SelectItem value="visit">Visit</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="refund">Refund</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Payment Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="e_transfer">E-Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="credit_card">Credit Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="no_charge">No Charge</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Secondary filters */}
        <div className="flex flex-wrap gap-3">
          {clients.length > 0 && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {cleaners.length > 0 && (
            <Select value={cleanerFilter} onValueChange={setCleanerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {cleaners.map(cleaner => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>{cleaner.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {/* Results count */}
          <div className="flex items-center text-sm text-muted-foreground ml-auto">
            <BookOpen className="h-4 w-4 mr-2" />
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg overflow-hidden">
        <DataTable 
          columns={columns}
          data={filteredEntries}
          emptyMessage="No financial entries found for the selected filters."
          className="[&_th]:bg-muted/50 [&_th]:font-semibold [&_td]:font-mono [&_td:nth-child(7)]:text-right [&_td:nth-child(8)]:text-right [&_td:nth-child(9)]:text-right"
        />
      </div>
      
      {/* Footer with period info */}
      <div className="flex justify-between items-center text-sm text-muted-foreground">
        <span>
          Currency: CAD (Canadian Dollar)
        </span>
        {globalPeriod.startDate && globalPeriod.endDate && (
          <span>
            Period: {format(globalPeriod.startDate, 'MMM d, yyyy')} — {format(globalPeriod.endDate, 'MMM d, yyyy')}
          </span>
        )}
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
