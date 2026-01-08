import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { PaginatedDataTable, Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerDialog } from '@/components/ui/date-picker-dialog';
import { Activity, User, Users, FileText, Calendar as CalendarIcon, DollarSign, Settings, LogIn, LogOut, CalendarOff, ShieldAlert, Search, X, Banknote } from 'lucide-react';
import { format, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type ActivityAction = 
  | 'user_created' | 'user_updated' | 'user_deleted'
  | 'client_created' | 'client_updated' | 'client_deleted' | 'client_inactivated'
  | 'contract_created' | 'contract_updated' | 'contract_deleted'
  | 'job_created' | 'job_updated' | 'job_started' | 'job_completed' | 'job_cancelled'
  | 'visit_completed'
  | 'invoice_created' | 'invoice_sent' | 'invoice_paid' | 'invoice_cancelled' | 'invoice_updated'
  | 'payment_registered' | 'payment_confirmed' | 'payment_rejected'
  | 'estimate_created' | 'estimate_updated' | 'estimate_deleted' | 'estimate_sent'
  | 'payroll_created' | 'payroll_approved' | 'payroll_paid' | 'payroll_reprocessed'
  | 'payroll_period_created' | 'payroll_period_updated'
  | 'settings_updated' | 'login' | 'logout'
  | 'absence_requested' | 'absence_approved' | 'absence_rejected'
  | 'company_created' | 'company_updated'
  | 'financial_transaction_created' | 'financial_transaction_updated'
  | 'financial_period_created' | 'financial_period_closed' | 'financial_period_reopened' | 'financial_period_updated'
  | 'cash_kept_by_cleaner' | 'cash_delivered_to_office' | 'cash_compensation_settled';

interface ActivityLogEntry {
  id: string;
  action: ActivityAction;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  details: {
    description?: string;
    entityName?: string;
    [key: string]: unknown;
  } | null;
  performer_first_name: string | null;
  performer_last_name: string | null;
  user_id: string | null;
}

const activityIcons: Record<string, { icon: typeof Activity; color: string }> = {
  user_created: { icon: Users, color: 'text-success' },
  user_updated: { icon: Users, color: 'text-info' },
  user_deleted: { icon: Users, color: 'text-destructive' },
  client_created: { icon: User, color: 'text-success' },
  client_updated: { icon: User, color: 'text-info' },
  client_deleted: { icon: User, color: 'text-destructive' },
  client_inactivated: { icon: User, color: 'text-warning' },
  contract_created: { icon: FileText, color: 'text-success' },
  contract_updated: { icon: FileText, color: 'text-info' },
  contract_deleted: { icon: FileText, color: 'text-destructive' },
  job_created: { icon: CalendarIcon, color: 'text-success' },
  job_updated: { icon: CalendarIcon, color: 'text-info' },
  job_started: { icon: CalendarIcon, color: 'text-warning' },
  job_completed: { icon: CalendarIcon, color: 'text-primary' },
  job_cancelled: { icon: CalendarIcon, color: 'text-warning' },
  visit_completed: { icon: CalendarIcon, color: 'text-info' },
  invoice_created: { icon: DollarSign, color: 'text-success' },
  invoice_sent: { icon: DollarSign, color: 'text-info' },
  invoice_paid: { icon: DollarSign, color: 'text-primary' },
  invoice_cancelled: { icon: DollarSign, color: 'text-destructive' },
  invoice_updated: { icon: DollarSign, color: 'text-info' },
  payment_registered: { icon: DollarSign, color: 'text-success' },
  payment_confirmed: { icon: DollarSign, color: 'text-primary' },
  payment_rejected: { icon: DollarSign, color: 'text-destructive' },
  estimate_created: { icon: DollarSign, color: 'text-success' },
  estimate_updated: { icon: DollarSign, color: 'text-info' },
  estimate_deleted: { icon: DollarSign, color: 'text-destructive' },
  estimate_sent: { icon: DollarSign, color: 'text-primary' },
  payroll_created: { icon: DollarSign, color: 'text-success' },
  payroll_approved: { icon: DollarSign, color: 'text-primary' },
  payroll_paid: { icon: DollarSign, color: 'text-success' },
  payroll_reprocessed: { icon: DollarSign, color: 'text-warning' },
  payroll_period_created: { icon: DollarSign, color: 'text-success' },
  payroll_period_updated: { icon: DollarSign, color: 'text-info' },
  settings_updated: { icon: Settings, color: 'text-info' },
  login: { icon: LogIn, color: 'text-success' },
  logout: { icon: LogOut, color: 'text-muted-foreground' },
  absence_requested: { icon: CalendarOff, color: 'text-warning' },
  absence_approved: { icon: CalendarOff, color: 'text-success' },
  absence_rejected: { icon: CalendarOff, color: 'text-destructive' },
  company_created: { icon: Settings, color: 'text-success' },
  company_updated: { icon: Settings, color: 'text-info' },
  financial_transaction_created: { icon: DollarSign, color: 'text-success' },
  financial_transaction_updated: { icon: DollarSign, color: 'text-info' },
  financial_period_created: { icon: DollarSign, color: 'text-success' },
  financial_period_closed: { icon: DollarSign, color: 'text-warning' },
  financial_period_reopened: { icon: DollarSign, color: 'text-info' },
  financial_period_updated: { icon: DollarSign, color: 'text-info' },
  cash_kept_by_cleaner: { icon: Banknote, color: 'text-warning' },
  cash_delivered_to_office: { icon: Banknote, color: 'text-success' },
  cash_compensation_settled: { icon: Banknote, color: 'text-primary' },
};

const ActivityLog = () => {
  const { t } = useLanguage();
  const { hasRole, user } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  const companyId = user?.profile?.company_id;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Server-side pagination fetch function
  const fetchLogs = useCallback(async (from: number, to: number): Promise<{ data: ActivityLogEntry[]; count: number }> => {
    if (!companyId) return { data: [], count: 0 };

    // First get logs with pagination
    let query = supabase
      .from('activity_logs')
      .select('id, action, entity_type, entity_id, created_at, details, user_id, performed_by_user_id', { count: 'exact' })
      .eq('company_id', companyId);

    // Filter by action type
    if (selectedType !== 'all') {
      query = query.eq('action', selectedType);
    }

    // Filter by date range
    if (dateRange.from) {
      query = query.gte('created_at', startOfDay(dateRange.from).toISOString());
    }
    if (dateRange.to) {
      query = query.lte('created_at', endOfDay(dateRange.to).toISOString());
    }

    query = query
      .order('created_at', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching activity logs:', error);
      return { data: [], count: 0 };
    }

    // Fetch performer names separately
    const performerIds = [...new Set((data || []).filter((log: any) => log.performed_by_user_id).map((log: any) => log.performed_by_user_id))];
    
    let performersMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
    
    if (performerIds.length > 0) {
      const { data: performers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', performerIds);
      
      if (performers) {
        performers.forEach((p: any) => {
          performersMap[p.id] = { first_name: p.first_name, last_name: p.last_name };
        });
      }
    }

    const transformedData = (data || []).map((log: any) => {
      const performer = log.performed_by_user_id ? performersMap[log.performed_by_user_id] : null;
      return {
        ...log,
        performer_first_name: performer?.first_name || null,
        performer_last_name: performer?.last_name || null,
      };
    }) as ActivityLogEntry[];

    // Client-side search filter (for description search)
    let filteredData = transformedData;
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filteredData = transformedData.filter(log => {
        const description = (log.details?.description || '').toLowerCase();
        const entityName = (log.details?.entityName || '').toLowerCase();
        const userName = `${log.performer_first_name || ''} ${log.performer_last_name || ''}`.toLowerCase();
        const action = log.action.toLowerCase();
        return description.includes(query) || entityName.includes(query) || userName.includes(query) || action.includes(query);
      });
    }

    return { data: filteredData, count: count || 0 };
  }, [companyId, selectedType, dateRange.from, dateRange.to, debouncedSearch]);

  const {
    data: logs,
    isLoading,
    pagination,
    setPage,
    setPageSize,
  } = useServerPagination<ActivityLogEntry>(fetchLogs, { pageSize: 25 });

  // Get unique action types for filter dropdown
  const actionTypes = useMemo(() => {
    return Object.keys(activityIcons).sort();
  }, []);

  if (!hasRole(['admin', 'manager'])) {
    return (
      <div className="p-2 lg:p-3">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{t.common.accessDenied}</h2>
            <p className="text-muted-foreground text-center">{t.common.noPermission}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTypeLabel = (action: string): string => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getDescription = (log: ActivityLogEntry): string => {
    if (log.details?.description) {
      return log.details.description;
    }
    const entityName = log.details?.entityName || log.entity_id?.slice(0, 8) || '';
    return `${getTypeLabel(log.action)}${entityName ? `: ${entityName}` : ''}`;
  };

  const getPerformerName = (log: ActivityLogEntry): string => {
    if (log.performer_first_name || log.performer_last_name) {
      return `${log.performer_first_name || ''} ${log.performer_last_name || ''}`.trim() || 'Unknown User';
    }
    return 'System';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setDateRange({ from: undefined, to: undefined });
  };

  const hasActiveFilters = searchQuery || selectedType !== 'all' || dateRange.from || dateRange.to;

  const columns: Column<ActivityLogEntry>[] = [
    {
      key: 'action',
      header: 'Activity',
      render: (log) => {
        const config = activityIcons[log.action] || { icon: Activity, color: 'text-muted-foreground' };
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-3">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-muted shrink-0", config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{getDescription(log)}</p>
              <p className="text-xs text-muted-foreground">{getPerformerName(log)}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'type',
      header: 'Type',
      render: (log) => (
        <Badge variant="outline" className="text-xs">{getTypeLabel(log.action)}</Badge>
      ),
    },
    {
      key: 'entity_type',
      header: 'Entity',
      render: (log) => (
        <span className="text-sm text-muted-foreground capitalize">{log.entity_type || '-'}</span>
      ),
    },
    {
      key: 'created_at',
      header: 'Time',
      render: (log) => (
        <span className="text-sm text-muted-foreground" title={format(new Date(log.created_at), 'PPpp')}>
          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <div className="p-2 lg:p-3 space-y-2">
      <PageHeader title={t.activityLog.title} description={t.activityLog.description} />
      
      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by description, user, or action..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full lg:w-[180px] h-9">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent className="bg-popover max-h-[300px]">
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map(type => (
                  <SelectItem key={type} value={type}>{getTypeLabel(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Range */}
            <div className="w-full lg:w-auto">
              <DatePickerDialog
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => { 
                  const r = range as { from?: Date; to?: Date } | undefined;
                  setDateRange({ from: r?.from, to: r?.to }); 
                }}
                placeholder="Date Range"
                className="h-9 w-full lg:w-auto"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-2">
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <PaginatedDataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyMessage={t.activityLog.noActivity}
      />
    </div>
  );
};

export default ActivityLog;
