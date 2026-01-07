import { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Activity, User, Users, FileText, Calendar as CalendarIcon, DollarSign, Settings, LogIn, LogOut, CalendarOff, ShieldAlert, Search, Filter, X, Loader2, Banknote } from 'lucide-react';
import { format, formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

// Activity types for the system
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
  performer: {
    first_name: string | null;
    last_name: string | null;
  } | null;
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

const ITEMS_PER_PAGE = 20;

const ActivityLog = () => {
  const { t } = useLanguage();
  const { hasRole, user } = useAuth();
  
  // Activity logs from Supabase
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch activity logs from Supabase
  useEffect(() => {
    const fetchLogs = async () => {
      if (!user?.profile?.company_id) return;

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('activity_logs')
          .select(`
            id,
            action,
            entity_type,
            entity_id,
            created_at,
            details,
            user_id,
            performed_by_user_id,
            profiles!activity_logs_performed_by_user_id_fkey (first_name, last_name)
          `)
          .eq('company_id', user.profile.company_id)
          .order('created_at', { ascending: false })
          .limit(500);

        if (error) {
          console.error('Error fetching activity logs:', error);
          return;
        }

        // Transform data to match expected interface
        const transformedData = (data || []).map((log: any) => ({
          ...log,
          performer: log.profiles || null
        })) as unknown as ActivityLogEntry[];

        setLogs(transformedData);
      } catch (err) {
        console.error('Error in fetchLogs:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [user?.profile?.company_id]);

  // Role-based access control - only admin and manager can view
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

  // Get unique users from logs
  const uniqueUsers = useMemo(() => {
    const users = new Map<string, string>();
    logs.forEach(log => {
      if (log.performer) {
        const name = `${log.performer.first_name || ''} ${log.performer.last_name || ''}`.trim();
        if (name && log.user_id) {
          users.set(log.user_id, name);
        }
      }
    });
    return Array.from(users.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  // Get unique action types from logs
  const actionTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.action));
    return Array.from(types).sort();
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const description = log.details?.description?.toLowerCase() || '';
        const entityName = log.details?.entityName?.toLowerCase() || '';
        const userName = log.performer ? `${log.performer.first_name || ''} ${log.performer.last_name || ''}`.toLowerCase() : '';
        const action = log.action.toLowerCase();
        if (!description.includes(query) && !entityName.includes(query) && !userName.includes(query) && !action.includes(query)) {
          return false;
        }
      }

      // User filter
      if (selectedUser !== 'all' && log.user_id !== selectedUser) return false;

      // Type filter
      if (selectedType !== 'all' && log.action !== selectedType) return false;

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const logDate = new Date(log.created_at);
        if (dateRange.from && dateRange.to) {
          if (!isWithinInterval(logDate, { 
            start: startOfDay(dateRange.from), 
            end: endOfDay(dateRange.to) 
          })) return false;
        } else if (dateRange.from) {
          if (logDate < startOfDay(dateRange.from)) return false;
        } else if (dateRange.to) {
          if (logDate > endOfDay(dateRange.to)) return false;
        }
      }

      return true;
    });
  }, [logs, searchQuery, selectedUser, selectedType, dateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getTypeLabel = (action: string): string => {
    // Convert snake_case to Title Case
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
    if (log.performer) {
      return `${log.performer.first_name || ''} ${log.performer.last_name || ''}`.trim() || 'Unknown User';
    }
    return 'System';
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedUser('all');
    setSelectedType('all');
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedUser !== 'all' || selectedType !== 'all' || dateRange.from || dateRange.to;

  if (isLoading) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-9"
              />
            </div>

            {/* User Filter */}
            <Select value={selectedUser} onValueChange={(v) => { setSelectedUser(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full lg:w-[180px] h-9">
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setCurrentPage(1); }}>
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 w-full lg:w-auto">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <span>{format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}</span>
                    ) : (
                      <span>From {format(dateRange.from, 'MMM d')}</span>
                    )
                  ) : (
                    <span>Date Range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => { 
                    setDateRange({ from: range?.from, to: range?.to }); 
                    setCurrentPage(1); 
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

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

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {paginatedLogs.length} of {filteredLogs.length} results
      </div>
      
      {/* Activity List */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t.activityLog.recentActivity}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {paginatedLogs.map((log) => {
                const config = activityIcons[log.action] || { icon: Activity, color: 'text-muted-foreground' };
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-muted shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{getDescription(log)}</p>
                        <Badge variant="outline" className="shrink-0 text-xs">{getTypeLabel(log.action)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium">{getPerformerName(log)}</span>
                        <span>•</span>
                        <span title={format(new Date(log.created_at), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                        {log.entity_type && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{log.entity_type}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {paginatedLogs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t.activityLog.noActivity}</p>
              )}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
