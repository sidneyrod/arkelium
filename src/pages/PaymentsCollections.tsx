import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import StatusBadge from '@/components/ui/status-badge';
import PeriodSelector from '@/components/ui/period-selector';
import { 
  DollarSign, 
  Banknote, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Download, 
  Search,
  RefreshCw,
  Receipt,
  FileText,
  Eye,
  Check,
  X,
  Filter
} from 'lucide-react';
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
  // Joined fields
  client_name?: string;
  cleaner_name?: string;
  job?: {
    scheduled_date: string;
    duration_minutes: number;
    job_type: string;
  };
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

type UnifiedTransaction = {
  id: string;
  type: 'cash' | 'receipt' | 'invoice';
  reference: string;
  client_name: string;
  cleaner_name: string;
  amount: number;
  date: string;
  payment_method: string;
  status: string;
  original: CashCollection | PaymentReceipt | Invoice;
};

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
  const [isLoading, setIsLoading] = useState(true);
  const [cashCollections, setCashCollections] = useState<CashCollection[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCleaner, setSelectedCleaner] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState({
    startDate: startOfMonth(subMonths(new Date(), 1)),
    endDate: endOfMonth(new Date()),
  });
  
  // Filter options
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  
  // Modal state
  const [selectedCashCollection, setSelectedCashCollection] = useState<CashCollection | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      if (!companyId) return;

      const startDate = format(dateRange.startDate, 'yyyy-MM-dd');
      const endDate = format(dateRange.endDate, 'yyyy-MM-dd');

      // Fetch cash collections
      const { data: cashData, error: cashError } = await supabase
        .from('cash_collections')
        .select(`
          *,
          client:client_id(name),
          cleaner:cleaner_id(first_name, last_name),
          job:job_id(scheduled_date, duration_minutes, job_type)
        `)
        .eq('company_id', companyId)
        .gte('service_date', startDate)
        .lte('service_date', endDate)
        .order('service_date', { ascending: false });

      if (cashError) console.error('Error fetching cash collections:', cashError);
      
      const mappedCash: CashCollection[] = (cashData || []).map((c: any) => ({
        ...c,
        client_name: c.client?.name || 'Unknown',
        cleaner_name: c.cleaner ? `${c.cleaner.first_name || ''} ${c.cleaner.last_name || ''}`.trim() : 'Unknown',
        job: c.job,
      }));
      setCashCollections(mappedCash);

      // Fetch receipts
      const { data: receiptData, error: receiptError } = await supabase
        .from('payment_receipts')
        .select(`
          *,
          client:client_id(name),
          cleaner:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .gte('service_date', startDate)
        .lte('service_date', endDate)
        .order('service_date', { ascending: false });

      if (receiptError) console.error('Error fetching receipts:', receiptError);
      
      const mappedReceipts: PaymentReceipt[] = (receiptData || []).map((r: any) => ({
        ...r,
        client_name: r.client?.name || 'Unknown',
        cleaner_name: r.cleaner ? `${r.cleaner.first_name || ''} ${r.cleaner.last_name || ''}`.trim() : 'N/A',
      }));
      setReceipts(mappedReceipts);

      // Fetch invoices
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          client:client_id(name),
          cleaner:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (invoiceError) console.error('Error fetching invoices:', invoiceError);
      
      const mappedInvoices: Invoice[] = (invoiceData || []).map((i: any) => ({
        ...i,
        client_name: i.client?.name || 'Unknown',
        cleaner_name: i.cleaner ? `${i.cleaner.first_name || ''} ${i.cleaner.last_name || ''}`.trim() : 'N/A',
      }));
      setInvoices(mappedInvoices);

      // Extract unique cleaners and clients for filters
      const uniqueCleaners = new Map<string, string>();
      const uniqueClients = new Map<string, string>();

      mappedCash.forEach(c => {
        if (c.cleaner_id && c.cleaner_name) uniqueCleaners.set(c.cleaner_id, c.cleaner_name);
        if (c.client_id && c.client_name) uniqueClients.set(c.client_id, c.client_name);
      });
      mappedReceipts.forEach(r => {
        if (r.cleaner_id && r.cleaner_name) uniqueCleaners.set(r.cleaner_id, r.cleaner_name);
        if (r.client_id && r.client_name) uniqueClients.set(r.client_id, r.client_name);
      });
      mappedInvoices.forEach(i => {
        if (i.cleaner_id && i.cleaner_name) uniqueCleaners.set(i.cleaner_id, i.cleaner_name);
        if (i.client_id && i.client_name) uniqueClients.set(i.client_id, i.client_name);
      });

      setCleaners(Array.from(uniqueCleaners, ([id, name]) => ({ id, name })));
      setClients(Array.from(uniqueClients, ([id, name]) => ({ id, name })));

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unified transactions for "All" tab
  const unifiedTransactions = useMemo((): UnifiedTransaction[] => {
    const transactions: UnifiedTransaction[] = [];

    // Add cash collections
    cashCollections.forEach(c => {
      transactions.push({
        id: c.id,
        type: 'cash',
        reference: `CASH-${c.id.slice(0, 8).toUpperCase()}`,
        client_name: c.client_name || 'Unknown',
        cleaner_name: c.cleaner_name || 'Unknown',
        amount: c.amount,
        date: c.service_date,
        payment_method: 'cash',
        status: c.compensation_status,
        original: c,
      });
    });

    // Add receipts
    receipts.forEach(r => {
      transactions.push({
        id: r.id,
        type: 'receipt',
        reference: r.receipt_number,
        client_name: r.client_name || 'Unknown',
        cleaner_name: r.cleaner_name || 'N/A',
        amount: r.amount,
        date: r.service_date,
        payment_method: r.payment_method,
        status: 'paid',
        original: r,
      });
    });

    // Add invoices
    invoices.forEach(i => {
      transactions.push({
        id: i.id,
        type: 'invoice',
        reference: i.invoice_number,
        client_name: i.client_name || 'Unknown',
        cleaner_name: i.cleaner_name || 'N/A',
        amount: i.total,
        date: i.service_date || i.created_at.split('T')[0],
        payment_method: 'invoice',
        status: i.status,
        original: i,
      });
    });

    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashCollections, receipts, invoices]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter(t => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!t.reference.toLowerCase().includes(query) && 
            !t.client_name.toLowerCase().includes(query) &&
            !t.cleaner_name.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
      return true;
    });
  }, [unifiedTransactions, searchQuery, selectedStatus]);

  // Filtered cash collections for approval tab
  const pendingCashCollections = useMemo(() => {
    return cashCollections.filter(c => c.compensation_status === 'pending');
  }, [cashCollections]);

  const disputedCashCollections = useMemo(() => {
    return cashCollections.filter(c => c.compensation_status === 'disputed');
  }, [cashCollections]);

  // KPIs
  const kpis = useMemo(() => {
    const totalReceived = receipts.reduce((sum, r) => sum + r.amount, 0) +
      cashCollections.filter(c => c.cash_handling === 'delivered_to_office').reduce((sum, c) => sum + c.amount, 0);
    
    const cashPending = cashCollections
      .filter(c => c.compensation_status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const cashApproved = cashCollections
      .filter(c => c.compensation_status === 'approved')
      .reduce((sum, c) => sum + c.amount, 0);
    
    const cashDisputed = cashCollections
      .filter(c => c.compensation_status === 'disputed')
      .reduce((sum, c) => sum + c.amount, 0);

    return { totalReceived, cashPending, cashApproved, cashDisputed };
  }, [cashCollections, receipts]);

  // Handle approval/dispute
  const handleApproveCash = async (collectionId: string) => {
    try {
      // Find the collection for notification
      const collection = cashCollections.find(c => c.id === collectionId);
      
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
      
      // Notify cleaner of approval
      if (collection) {
        const { notifyCashApproved } = await import('@/hooks/useNotifications');
        await notifyCashApproved(
          collection.cleaner_id,
          collection.amount,
          collection.client_name || 'Client',
          collectionId
        );
      }
      
      fetchData();
    } catch (error) {
      console.error('Error approving cash collection:', error);
      toast.error('Failed to approve');
    }
  };

  const handleDisputeCash = async (collectionId: string, reason: string) => {
    try {
      // Find the collection for notification
      const collection = cashCollections.find(c => c.id === collectionId);
      
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
      
      // Notify cleaner of dispute
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
      fetchData();
    } catch (error) {
      console.error('Error disputing cash collection:', error);
      toast.error('Failed to dispute');
    }
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Reference', 'Client', 'Cleaner', 'Amount', 'Payment Method', 'Status'];
    const rows = filteredTransactions.map(t => [
      t.date,
      t.type.toUpperCase(),
      t.reference,
      t.client_name,
      t.cleaner_name,
      t.amount.toFixed(2),
      t.payment_method,
      t.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  if (isLoading) {
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Period Selector */}
      <PeriodSelector
        value={dateRange}
        onChange={setDateRange}
      />

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
                <p className="text-2xl font-bold">${kpis.totalReceived.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Pending Approval</p>
                <p className="text-2xl font-bold">${kpis.cashPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Approved</p>
                <p className="text-2xl font-bold">${kpis.cashApproved.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cash Disputed</p>
                <p className="text-2xl font-bold">${kpis.cashDisputed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="cash">
            Cash Collections
            {cashCollections.length > 0 && (
              <Badge variant="secondary" className="ml-2">{cashCollections.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval
            {pendingCashCollections.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingCashCollections.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="disputed">
            Disputed
            {disputedCashCollections.length > 0 && (
              <Badge variant="outline" className="ml-2">{disputedCashCollections.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Transactions Tab */}
        <TabsContent value="all" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by reference, client, or cleaner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Transactions Table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Reference</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Client</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Cleaner</th>
                      <th className="text-right p-4 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Method</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={`${t.type}-${t.id}`} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-4">{t.date}</td>
                          <td className="p-4">
                            <Badge variant="outline" className={cn(
                              t.type === 'cash' && 'border-warning text-warning',
                              t.type === 'receipt' && 'border-success text-success',
                              t.type === 'invoice' && 'border-primary text-primary',
                            )}>
                              {t.type === 'cash' && <Banknote className="h-3 w-3 mr-1" />}
                              {t.type === 'receipt' && <Receipt className="h-3 w-3 mr-1" />}
                              {t.type === 'invoice' && <FileText className="h-3 w-3 mr-1" />}
                              {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                            </Badge>
                          </td>
                          <td className="p-4 font-mono text-sm">{t.reference}</td>
                          <td className="p-4">{t.client_name}</td>
                          <td className="p-4">{t.cleaner_name}</td>
                          <td className="p-4 text-right font-semibold">${t.amount.toFixed(2)}</td>
                          <td className="p-4 capitalize">{t.payment_method}</td>
                          <td className="p-4">
                            <StatusBadge 
                              status={statusConfig[t.status]?.variant || 'pending'} 
                              label={statusConfig[t.status]?.label || t.status} 
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Collections Tab */}
        <TabsContent value="cash" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Banknote className="h-5 w-5 text-warning" />
                All Cash Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cashCollections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No cash collections in this period
                </div>
              ) : (
                <div className="space-y-3">
                  {cashCollections.map((c) => (
                    <div 
                      key={c.id} 
                      className={cn(
                        "flex items-center justify-between p-4 rounded-lg border",
                        c.compensation_status === 'pending' && 'border-warning/30 bg-warning/5',
                        c.compensation_status === 'approved' && 'border-primary/30 bg-primary/5',
                        c.compensation_status === 'disputed' && 'border-destructive/30 bg-destructive/5',
                        c.compensation_status === 'settled' && 'border-success/30 bg-success/5',
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          c.compensation_status === 'pending' && 'bg-warning/20',
                          c.compensation_status === 'approved' && 'bg-primary/20',
                          c.compensation_status === 'disputed' && 'bg-destructive/20',
                          c.compensation_status === 'settled' && 'bg-success/20',
                        )}>
                          <Banknote className={cn(
                            "h-5 w-5",
                            c.compensation_status === 'pending' && 'text-warning',
                            c.compensation_status === 'approved' && 'text-primary',
                            c.compensation_status === 'disputed' && 'text-destructive',
                            c.compensation_status === 'settled' && 'text-success',
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{c.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {c.cleaner_name} • {c.service_date}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.cash_handling === 'kept_by_cleaner' 
                              ? '💰 Kept by cleaner' 
                              : '📤 Delivered to office'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">${c.amount.toFixed(2)}</p>
                          <StatusBadge 
                            status={statusConfig[c.compensation_status]?.variant || 'pending'} 
                            label={statusConfig[c.compensation_status]?.label || c.compensation_status} 
                          />
                        </div>
                        {c.compensation_status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleApproveCash(c.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedCashCollection(c);
                                setShowApprovalModal(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Approval Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card className="border-border/50 border-l-4 border-l-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Cash Collections Pending Approval
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Review each cash collection and approve for payroll deduction or dispute if there's an issue.
              </p>
            </CardHeader>
            <CardContent>
              {pendingCashCollections.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">All cash collections have been reviewed</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingCashCollections.map((c) => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-warning/30 bg-warning/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-warning/20 flex items-center justify-center">
                          <Banknote className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">{c.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Cleaner: {c.cleaner_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Service Date: {c.service_date}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {c.cash_handling === 'kept_by_cleaner' 
                              ? '💰 Cleaner kept the cash (will be deducted from payroll)' 
                              : '📤 Cleaner will deliver cash to office'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-xl">${c.amount.toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs border-warning text-warning">
                            <Clock className="h-3 w-3 mr-1" />
                            Awaiting Review
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => handleApproveCash(c.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              setSelectedCashCollection(c);
                              setShowApprovalModal(true);
                            }}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Dispute
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputed Tab */}
        <TabsContent value="disputed" className="space-y-4">
          <Card className="border-border/50 border-l-4 border-l-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <X className="h-5 w-5 text-destructive" />
                Disputed Cash Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {disputedCashCollections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No disputed cash collections
                </div>
              ) : (
                <div className="space-y-3">
                  {disputedCashCollections.map((c) => (
                    <div 
                      key={c.id} 
                      className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                        </div>
                        <div>
                          <p className="font-medium">{c.client_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Cleaner: {c.cleaner_name} • {c.service_date}
                          </p>
                          {c.dispute_reason && (
                            <p className="text-sm text-destructive mt-1">
                              Reason: {c.dispute_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">${c.amount.toFixed(2)}</p>
                          <StatusBadge status="inactive" label="Disputed" />
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApproveCash(c.id)}
                        >
                          Resolve & Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Cash Approval Modal */}
      {selectedCashCollection && (
        <CashApprovalModal
          open={showApprovalModal}
          onOpenChange={(open) => {
            setShowApprovalModal(open);
            if (!open) setSelectedCashCollection(null);
          }}
          cashCollection={selectedCashCollection}
          onApprove={() => {
            handleApproveCash(selectedCashCollection.id);
            setShowApprovalModal(false);
            setSelectedCashCollection(null);
          }}
          onDispute={(reason) => handleDisputeCash(selectedCashCollection.id, reason)}
        />
      )}
    </div>
  );
};

export default PaymentsCollections;
