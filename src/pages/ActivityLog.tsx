import { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Activity, User, Users, FileText, Calendar as CalendarIcon, DollarSign, Settings, LogIn, LogOut, CalendarOff, ShieldAlert, Search, Filter, X } from 'lucide-react';
import { useActivityStore, ActivityType, ActivityLog as ActivityLogType } from '@/stores/activityStore';
import { format, formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

const activityIcons: Record<ActivityType, { icon: typeof Activity; color: string }> = {
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
  job_completed: { icon: CalendarIcon, color: 'text-primary' },
  job_cancelled: { icon: CalendarIcon, color: 'text-warning' },
  visit_completed: { icon: CalendarIcon, color: 'text-info' },
  invoice_created: { icon: DollarSign, color: 'text-success' },
  invoice_sent: { icon: DollarSign, color: 'text-info' },
  invoice_paid: { icon: DollarSign, color: 'text-primary' },
  invoice_cancelled: { icon: DollarSign, color: 'text-destructive' },
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
  settings_updated: { icon: Settings, color: 'text-info' },
  login: { icon: LogIn, color: 'text-success' },
  logout: { icon: LogOut, color: 'text-muted-foreground' },
  absence_requested: { icon: CalendarOff, color: 'text-warning' },
  absence_approved: { icon: CalendarOff, color: 'text-success' },
  absence_rejected: { icon: CalendarOff, color: 'text-destructive' },
};

const typeToLabelKey: Record<ActivityType, string> = {
  user_created: 'userCreated',
  user_updated: 'userUpdated',
  user_deleted: 'userDeleted',
  client_created: 'clientCreated',
  client_updated: 'clientUpdated',
  client_deleted: 'clientDeleted',
  client_inactivated: 'clientInactivated',
  contract_created: 'contractCreated',
  contract_updated: 'contractUpdated',
  contract_deleted: 'contractDeleted',
  job_created: 'jobCreated',
  job_updated: 'jobUpdated',
  job_completed: 'jobCompleted',
  job_cancelled: 'jobCancelled',
  visit_completed: 'visitCompleted',
  invoice_created: 'invoiceCreated',
  invoice_sent: 'invoiceSent',
  invoice_paid: 'invoicePaid',
  invoice_cancelled: 'invoiceCancelled',
  payment_registered: 'paymentRegistered',
  payment_confirmed: 'paymentConfirmed',
  payment_rejected: 'paymentRejected',
  estimate_created: 'estimateCreated',
  estimate_updated: 'estimateUpdated',
  estimate_deleted: 'estimateDeleted',
  estimate_sent: 'estimateSent',
  payroll_created: 'payrollCreated',
  payroll_approved: 'payrollApproved',
  payroll_paid: 'payrollPaid',
  payroll_reprocessed: 'payrollReprocessed',
  settings_updated: 'settingsUpdated',
  login: 'login',
  logout: 'logout',
  absence_requested: 'absenceRequested',
  absence_approved: 'absenceApproved',
  absence_rejected: 'absenceRejected',
};

const ITEMS_PER_PAGE = 20;

const ActivityLog = () => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const { logs } = useActivityStore();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Role-based access control - only admin and manager can view
  if (!hasRole(['admin', 'manager'])) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
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
    const users = new Set(logs.map(log => log.userName));
    return Array.from(users).sort();
  }, [logs]);

  // Get unique action types
  const actionTypes = Object.keys(activityIcons) as ActivityType[];

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesDescription = log.description.toLowerCase().includes(query);
        const matchesUser = log.userName.toLowerCase().includes(query);
        const matchesType = log.type.toLowerCase().includes(query);
        if (!matchesDescription && !matchesUser && !matchesType) return false;
      }

      // User filter
      if (selectedUser !== 'all' && log.userName !== selectedUser) return false;

      // Type filter
      if (selectedType !== 'all' && log.type !== selectedType) return false;

      // Date range filter
      if (dateRange.from || dateRange.to) {
        const logDate = new Date(log.timestamp);
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

  const getTypeLabel = (type: ActivityType): string => {
    const key = typeToLabelKey[type] as keyof typeof t.activityLog.types;
    return t.activityLog.types[key] || type;
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedUser('all');
    setSelectedType('all');
    setDateRange({ from: undefined, to: undefined });
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedUser !== 'all' || selectedType !== 'all' || dateRange.from || dateRange.to;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader title={t.activityLog.title} description={t.activityLog.description} />
      
      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or action..."
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
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
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
                const config = activityIcons[log.type];
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center bg-muted shrink-0", config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{log.description}</p>
                        <Badge variant="outline" className="shrink-0 text-xs">{getTypeLabel(log.type)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span>{log.userName}</span>
                        <span>•</span>
                        <span title={format(new Date(log.timestamp), 'PPpp')}>
                          {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </span>
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
