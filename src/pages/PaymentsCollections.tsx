import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/ui/status-badge';
import PeriodSelector from '@/components/ui/period-selector';
import PaginatedDataTable, { Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import SearchInput from '@/components/ui/search-input';
import { 
  DollarSign, 
  Banknote, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  RefreshCw,
  Receipt,
  FileText,
  Eye,
  Check,
  X,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { logActivity } from '@/stores/activityStore';
import CashApprovalModal from '@/components/financial/CashApprovalModal';

// Type definitions
interface CashCollection {
  id: string;
  job_id: string;
  client_id: string;
  cleaner_id: string;
  amount: number;
  service_date: string;
  cash_handling: 'kept_by_cleaner' | 'delivered_to_office';
  compensation_status: 'pending' | 'approved' | 'disputed' | 'settled';
  approved_by: string | null;
  approved_at: string | null;
  disputed_by: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  payroll_period_id: string | null;
  notes: string | null;
  created_at: string;
  client_name?: string;
  cleaner_name?: string;
}

interface PaymentReceipt {
  id: string;
  receipt_number: string;
  job_id: string;
  client_id: string;
  cleaner_id: string | null;
  amount: number;
  payment_method: string;
  service_date: string;
  created_at: string;
  client_name?: string;
  cleaner_name?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  cleaner_id: string | null;
  subtotal: number;
  total: number;
  status: string;
  service_date: string | null;
  created_at: string;
  client_name?: string;
  cleaner_name?: string;
}

const statusConfig: Record<string, { label: string; variant: 'active' | 'pending' | 'completed' | 'inactive' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  approved: { label: 'Approved', variant: 'active' },
  disputed: { label: 'Disputed', variant: 'inactive' },
  settled: { label: 'Settled', variant: 'completed' },
  paid: { label: 'Paid', variant: 'completed' },
  sent: { label: 'Sent', variant: 'active' },
  draft: { label: 'Draft', variant: 'pending' },
  cancelled: { label: 'Cancelled', variant: 'inactive' },
};

const PaymentsCollections = () => {
  const { user } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('cash');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending'); // Default to pending for governance focus
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(subMonths(new Date(), 1)),
    endDate: endOfMonth(new Date()),
  });
  
  // Modal state
  const [selectedCashCollection, setSelectedCashCollection] = useState<CashCollection | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // KPIs state
  const [kpis, setKpis] = useState({
    totalReceived: 0,
    cashPending: 0,
    cashApproved: 0,
    cashDisputed: 0,
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch KPIs separately
  const fetchKpis = useCallback(async () => {
    const { data: companyId } = await supabase.rpc('get_user_company_id');
    if (!companyId) return;

    const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDate = format(dateRange.endDate, 'yyyy-MM-dd');

    const [cashRes, receiptsRes] = await Promise.all([
      supabase
        .from('cash_collections')
        .select('amount, cash_handling, compensation_status')
        .eq('company_id', companyId)
        .gte('service_date', startDate)
        .lte('service_date', endDate),
      supabase
        .from('payment_receipts')
        .select('amount')
        .eq('company_id', companyId)
        .gte('service_date', startDate)
        .lte('service_date', endDate),
    ]);

    const cashData = cashRes.data || [];
    const receiptsData = receiptsRes.data || [];

    const totalReceived = receiptsData.reduce((sum, r) => sum + r.amount, 0) +
      cashData.filter(c => c.cash_handling === 'delivered_to_office').reduce((sum, c) => sum + c.amount, 0);
    
    const cashPending = cashData.filter(c => c.compensation_status === 'pending').reduce((sum, c) => sum + c.amount, 0);
    const cashApproved = cashData.filter(c => c.compensation_status === 'approved').reduce((sum, c) => sum + c.amount, 0);
    const cashDisputed = cashData.filter(c => c.compensation_status === 'disputed').reduce((sum, c) => sum + c.amount, 0);

    setKpis({ totalReceived, cashPending, cashApproved, cashDisputed });
  }, [dateRange]);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  // Cash collections fetch function
  const fetchCashCollections = useCallback(async (from: number, to: number) => {
    const { data: companyId } = await supabase.rpc('get_user_company_id');
    if (!companyId) return { data: [], count: 0 };

    const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDate = format(dateRange.endDate, 'yyyy-MM-dd');

    let query = supabase
      .from('cash_collections')
      .select(`
        *,
        client:client_id(name),
        cleaner:cleaner_id(first_name, last_name)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .gte('service_date', startDate)
      .lte('service_date', endDate);

    if (selectedStatus !== 'all') {
      query = query.eq('compensation_status', selectedStatus);
    }
    if (debouncedSearch) {
      // Note: for complex search across relations, we'd need a view or RPC
    }

    query = query.order('service_date', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching cash collections:', error);
      return { data: [], count: 0 };
    }

    const mapped: CashCollection[] = (data || []).map((c: any) => ({
      ...c,
      client_name: c.client?.name || 'Unknown',
      cleaner_name: c.cleaner ? `${c.cleaner.first_name || ''} ${c.cleaner.last_name || ''}`.trim() : 'Unknown',
    }));

    return { data: mapped, count: count || 0 };
  }, [dateRange, selectedStatus, debouncedSearch]);

  // Receipts fetch function
  const fetchReceipts = useCallback(async (from: number, to: number) => {
    const { data: companyId } = await supabase.rpc('get_user_company_id');
    if (!companyId) return { data: [], count: 0 };

    const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDate = format(dateRange.endDate, 'yyyy-MM-dd');

    let query = supabase
      .from('payment_receipts')
      .select(`
        *,
        client:client_id(name),
        cleaner:cleaner_id(first_name, last_name)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .gte('service_date', startDate)
      .lte('service_date', endDate);

    if (debouncedSearch) {
      query = query.ilike('receipt_number', `%${debouncedSearch}%`);
    }

    query = query.order('service_date', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching receipts:', error);
      return { data: [], count: 0 };
    }

    const mapped: PaymentReceipt[] = (data || []).map((r: any) => ({
      ...r,
      client_name: r.client?.name || 'Unknown',
      cleaner_name: r.cleaner ? `${r.cleaner.first_name || ''} ${r.cleaner.last_name || ''}`.trim() : 'N/A',
    }));

    return { data: mapped, count: count || 0 };
  }, [dateRange, debouncedSearch]);

  // Invoices fetch function
  const fetchInvoices = useCallback(async (from: number, to: number) => {
    const { data: companyId } = await supabase.rpc('get_user_company_id');
    if (!companyId) return { data: [], count: 0 };

    const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
    const endDate = format(dateRange.endDate, 'yyyy-MM-dd');

    let query = supabase
      .from('invoices')
      .select(`
        *,
        client:client_id(name),
        cleaner:cleaner_id(first_name, last_name)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59');

    if (selectedStatus !== 'all') {
      query = query.eq('status', selectedStatus);
    }
    if (debouncedSearch) {
      query = query.ilike('invoice_number', `%${debouncedSearch}%`);
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) {
      console.error('Error fetching invoices:', error);
      return { data: [], count: 0 };
    }

    const mapped: Invoice[] = (data || []).map((i: any) => ({
      ...i,
      client_name: i.client?.name || 'Unknown',
      cleaner_name: i.cleaner ? `${i.cleaner.first_name || ''} ${i.cleaner.last_name || ''}`.trim() : 'N/A',
    }));

    return { data: mapped, count: count || 0 };
  }, [dateRange, selectedStatus, debouncedSearch]);

  // Pagination hooks
  const cashPagination = useServerPagination<CashCollection>(fetchCashCollections, { pageSize: 25 });
  const receiptsPagination = useServerPagination<PaymentReceipt>(fetchReceipts, { pageSize: 25 });
  const invoicesPagination = useServerPagination<Invoice>(fetchInvoices, { pageSize: 25 });

  // Refresh when filters change
  useEffect(() => {
    cashPagination.refresh();
    receiptsPagination.refresh();
    invoicesPagination.refresh();
    fetchKpis();
  }, [dateRange, selectedStatus, debouncedSearch]);

  // Handle approval/dispute
  const handleApproveCash = async (collectionId: string) => {
    try {
      const collection = cashPagination.data.find(c => c.id === collectionId);
      
      const { error } = await supabase
        .from('cash_collections')
        .update({
          compensation_status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', collectionId);

      if (error) throw error;

      logActivity('cash_approved', 'Cash collection approved', collectionId);
      toast.success('Cash collection approved');
      
      if (collection) {
        const { notifyCashApproved } = await import('@/hooks/useNotifications');
        await notifyCashApproved(
          collection.cleaner_id,
          collection.amount,
          collection.client_name || 'Client',
          collectionId
        );
      }
      
      cashPagination.refresh();
      fetchKpis();
    } catch (error) {
      console.error('Error approving cash collection:', error);
      toast.error('Failed to approve');
    }
  };

  const handleDisputeCash = async (collectionId: string, reason: string) => {
    try {
      const collection = cashPagination.data.find(c => c.id === collectionId);
      
      const { error } = await supabase
        .from('cash_collections')
        .update({
          compensation_status: 'disputed',
          disputed_by: user?.id,
          disputed_at: new Date().toISOString(),
          dispute_reason: reason,
        })
        .eq('id', collectionId);

      if (error) throw error;

      logActivity('cash_disputed', `Cash collection disputed: ${reason}`, collectionId);
      toast.success('Cash collection marked as disputed');
      
      if (collection) {
        const { notifyCashDisputed } = await import('@/hooks/useNotifications');
        await notifyCashDisputed(
          collection.cleaner_id,
          collection.amount,
          collection.client_name || 'Client',
          reason,
          collectionId
        );
      }
      
      setShowApprovalModal(false);
      setSelectedCashCollection(null);
      cashPagination.refresh();
      fetchKpis();
    } catch (error) {
      console.error('Error disputing cash collection:', error);
      toast.error('Failed to dispute');
    }
  };

  // Cash columns
  const cashColumns: Column<CashCollection>[] = [
    {
      key: 'service_date',
      header: 'Date',
      render: (row) => format(new Date(row.service_date), 'MMM d, yyyy'),
    },
    { key: 'client_name', header: 'Client' },
    { key: 'cleaner_name', header: 'Cleaner' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold">${row.amount.toFixed(2)}</span>,
    },
    {
      key: 'cash_handling',
      header: 'Handling',
      render: (row) => (
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          row.cash_handling === 'delivered_to_office' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        )}>
          {row.cash_handling === 'delivered_to_office' ? 'Delivered' : 'Kept'}
        </span>
      ),
    },
    {
      key: 'compensation_status',
      header: 'Status',
      render: (row) => {
        const config = statusConfig[row.compensation_status];
        return <StatusBadge status={config?.variant || 'pending'} label={config?.label || row.compensation_status} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-1">
          {row.compensation_status === 'pending' && (
            <>
              <Button size="sm" variant="ghost" onClick={() => handleApproveCash(row.id)} className="h-7 text-success">
                <Check className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedCashCollection(row); setShowApprovalModal(true); }} className="h-7 text-destructive">
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" className="h-7">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Receipt columns
  const receiptColumns: Column<PaymentReceipt>[] = [
    {
      key: 'service_date',
      header: 'Date',
      render: (row) => format(new Date(row.service_date), 'MMM d, yyyy'),
    },
    { key: 'receipt_number', header: 'Receipt #' },
    { key: 'client_name', header: 'Client' },
    { key: 'cleaner_name', header: 'Cleaner' },
    {
      key: 'amount',
      header: 'Amount',
      render: (row) => <span className="font-semibold">${row.amount.toFixed(2)}</span>,
    },
    {
      key: 'payment_method',
      header: 'Method',
      render: (row) => (
        <span className="capitalize">{row.payment_method.replace('_', ' ')}</span>
      ),
    },
  ];

  // Invoice columns
  const invoiceColumns: Column<Invoice>[] = [
    {
      key: 'created_at',
      header: 'Date',
      render: (row) => format(new Date(row.created_at), 'MMM d, yyyy'),
    },
    { key: 'invoice_number', header: 'Invoice #' },
    { key: 'client_name', header: 'Client' },
    {
      key: 'total',
      header: 'Amount',
      render: (row) => <span className="font-semibold">${row.total.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const config = statusConfig[row.status];
        return <StatusBadge status={config?.variant || 'pending'} label={config?.label || row.status} />;
      },
    },
  ];

  const refreshAll = () => {
    cashPagination.refresh();
    receiptsPagination.refresh();
    invoicesPagination.refresh();
    fetchKpis();
  };

  // CSV Export
  const exportToCSV = () => {
    let data: any[] = [];
    let filename = '';

    if (activeTab === 'cash') {
      data = cashPagination.data;
      filename = 'cash-collections';
    } else if (activeTab === 'receipts') {
      data = receiptsPagination.data;
      filename = 'payment-receipts';
    } else {
      data = invoicesPagination.data;
      filename = 'invoices';
    }

    const headers = Object.keys(data[0] || {}).filter(k => !k.includes('_id') && k !== 'id');
    const rows = data.map(row => headers.map(h => row[h as keyof typeof row] ?? ''));
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const isLoading = cashPagination.isLoading && receiptsPagination.isLoading && invoicesPagination.isLoading;

  if (isLoading && cashPagination.data.length === 0) {
    return (
      <div className="p-2 lg:p-3 space-y-2">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Period Selector + Actions */}
      <div className="flex items-center justify-between gap-2">
        <PeriodSelector
          value={dateRange}
          onChange={setDateRange}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-2xl font-bold">${kpis.totalReceived.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Pending</p>
                <p className="text-2xl font-bold">${kpis.cashPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Approved</p>
                <p className="text-2xl font-bold">${kpis.cashApproved.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Disputed</p>
                <p className="text-2xl font-bold">${kpis.cashDisputed.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          placeholder="Search..."
          value={search}
          onChange={setSearch}
          className="w-full sm:max-w-xs"
        />
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">⏳ Pending</SelectItem>
            <SelectItem value="disputed">⚠️ Disputed</SelectItem>
            <SelectItem value="approved">✓ Approved</SelectItem>
            <SelectItem value="settled">✓ Settled</SelectItem>
            <SelectItem value="paid">✓ Paid</SelectItem>
            <SelectItem value="sent">✓ Sent</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs with Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cash" className="gap-2">
            <Banknote className="h-4 w-4" />
            Cash Collections
          </TabsTrigger>
          <TabsTrigger value="receipts" className="gap-2">
            <Receipt className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cash" className="mt-4">
          <PaginatedDataTable
            columns={cashColumns}
            data={cashPagination.data}
            pagination={cashPagination.pagination}
            onPageChange={cashPagination.setPage}
            onPageSizeChange={cashPagination.setPageSize}
            isLoading={cashPagination.isLoading}
            emptyMessage="No cash collections found."
          />
        </TabsContent>

        <TabsContent value="receipts" className="mt-4">
          <PaginatedDataTable
            columns={receiptColumns}
            data={receiptsPagination.data}
            pagination={receiptsPagination.pagination}
            onPageChange={receiptsPagination.setPage}
            onPageSizeChange={receiptsPagination.setPageSize}
            isLoading={receiptsPagination.isLoading}
            emptyMessage="No receipts found."
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <PaginatedDataTable
            columns={invoiceColumns}
            data={invoicesPagination.data}
            pagination={invoicesPagination.pagination}
            onPageChange={invoicesPagination.setPage}
            onPageSizeChange={invoicesPagination.setPageSize}
            isLoading={invoicesPagination.isLoading}
            emptyMessage="No invoices found."
          />
        </TabsContent>
      </Tabs>

      {/* Cash Approval Modal */}
      {selectedCashCollection && (
        <CashApprovalModal
          open={showApprovalModal}
          onOpenChange={setShowApprovalModal}
          cashCollection={selectedCashCollection}
          onApprove={() => handleApproveCash(selectedCashCollection.id)}
          onDispute={(reason) => handleDisputeCash(selectedCashCollection.id, reason)}
        />
      )}
    </div>
  );
};

export default PaymentsCollections;
