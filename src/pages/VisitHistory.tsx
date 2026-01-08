import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { PaginatedDataTable, Column } from '@/components/ui/paginated-data-table';
import { useServerPagination } from '@/hooks/useServerPagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Calendar, 
  MapPin, 
  User,
  Clock,
  Eye,
  X,
  Filter,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import VisitDetailModal from '@/components/visits/VisitDetailModal';

export interface Visit {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  address: string;
  city?: string;
  locationId?: string;
  date: string;
  time: string;
  duration: string;
  employeeId: string;
  employeeName: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  visitType?: string;
  visitPurpose?: string;
  visitRoute?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  completedAt?: string;
}

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

const statusConfig = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
  'no-show': { color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', label: 'No Show' },
};

const VisitHistory = () => {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(['admin']);
  const isAdminOrManager = hasRole(['admin', 'manager']);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filter options (populated from initial query)
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);

  const companyId = user?.profile?.company_id;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch filter options once
  useEffect(() => {
    const fetchFilterOptions = async () => {
      if (!companyId) return;

      // Fetch clients
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name');
      
      if (clientsData) setClients(clientsData);

      // Fetch employees (cleaners)
      const { data: employeesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .eq('role', 'cleaner');
      
      if (employeesData) {
        setEmployees(employeesData.map(e => ({
          id: e.id,
          name: `${e.first_name || ''} ${e.last_name || ''}`.trim() || 'Unknown'
        })));
      }
    };

    fetchFilterOptions();
  }, [companyId]);

  // Server-side pagination fetch function
  const fetchVisits = useCallback(async (from: number, to: number): Promise<{ data: Visit[]; count: number }> => {
    if (!companyId) return { data: [], count: 0 };

    let query = supabase
      .from('jobs')
      .select('id, client_id, cleaner_id, location_id, scheduled_date, start_time, duration_minutes, status, job_type, visit_purpose, visit_route, notes, created_at, completed_at, clients(id, name, email, phone), client_locations(id, address, city)', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('job_type', 'visit');
        visit_purpose,
        visit_route,
        notes,
        created_at,
        completed_at,
        clients(id, name, email, phone),
        profiles:cleaner_id(id, first_name, last_name),
        client_locations(id, address, city)
      `, { count: 'exact' })
      .eq('company_id', companyId)
      .eq('job_type', 'visit');

    // Role-based filter
    if (!isAdminOrManager) {
      query = query.eq('cleaner_id', user?.id);
    }

    // Period filter
    const today = new Date();
    if (periodFilter === 'today') {
      const todayStr = format(today, 'yyyy-MM-dd');
      query = query.eq('scheduled_date', todayStr);
    } else if (periodFilter === 'week') {
      const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      query = query.gte('scheduled_date', weekStart).lte('scheduled_date', weekEnd);
    } else if (periodFilter === 'month') {
      const monthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(today), 'yyyy-MM-dd');
      query = query.gte('scheduled_date', monthStart).lte('scheduled_date', monthEnd);
    }

    // Client filter
    if (clientFilter !== 'all') {
      query = query.eq('client_id', clientFilter);
    }

    // Employee filter
    if (employeeFilter !== 'all') {
      query = query.eq('cleaner_id', employeeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    query = query
      .order('scheduled_date', { ascending: false })
      .range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching visits:', error);
      return { data: [], count: 0 };
    }

    let mappedVisits: Visit[] = (data || []).map((visit: any) => ({
      id: visit.id,
      clientId: visit.client_id,
      clientName: visit.clients?.name || 'Unknown',
      clientEmail: visit.clients?.email,
      clientPhone: visit.clients?.phone,
      address: visit.client_locations?.address || 'No address',
      city: visit.client_locations?.city,
      locationId: visit.location_id,
      date: visit.scheduled_date,
      time: visit.start_time?.slice(0, 5) || '09:00',
      duration: visit.duration_minutes ? `${visit.duration_minutes / 60}h` : '1h',
      employeeId: visit.cleaner_id || '',
      employeeName: visit.profiles 
        ? `${visit.profiles.first_name || ''} ${visit.profiles.last_name || ''}`.trim() || 'Unassigned'
        : 'Unassigned',
      status: visit.status as Visit['status'],
      visitType: 'Business Visit',
      visitPurpose: visit.visit_purpose,
      visitRoute: visit.visit_route,
      notes: visit.notes,
      createdAt: visit.created_at,
      completedAt: visit.completed_at,
    }));

    // Client-side search filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      mappedVisits = mappedVisits.filter(v => 
        v.clientName.toLowerCase().includes(q) ||
        v.employeeName.toLowerCase().includes(q) ||
        v.address.toLowerCase().includes(q) ||
        (v.visitPurpose && v.visitPurpose.toLowerCase().includes(q))
      );
    }

    return { data: mappedVisits, count: count || 0 };
  }, [companyId, user?.id, isAdminOrManager, periodFilter, clientFilter, employeeFilter, statusFilter, debouncedSearch]);

  const {
    data: visits,
    isLoading,
    pagination,
    setPage,
    setPageSize,
  } = useServerPagination<Visit>(fetchVisits, { pageSize: 25 });

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowDetailModal(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPeriodFilter('all');
    setClientFilter('all');
    setEmployeeFilter('all');
    setStatusFilter('all');
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return format(date, 'MMM dd, yyyy');
  };

  const columns: Column<Visit>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (visit) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{formatDate(visit.date)}</span>
        </div>
      ),
    },
    {
      key: 'time',
      header: 'Time',
      render: (visit) => (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{formatTime(visit.time)}</span>
        </div>
      ),
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (visit) => <span className="text-sm font-medium">{visit.clientName}</span>,
    },
    {
      key: 'address',
      header: 'Address',
      render: (visit) => (
        <div className="flex items-center gap-2 max-w-[200px]">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate" title={visit.address}>
            {visit.address}
            {visit.city && `, ${visit.city}`}
          </span>
        </div>
      ),
    },
    {
      key: 'employeeName',
      header: 'Employee',
      render: (visit) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{visit.employeeName}</span>
        </div>
      ),
    },
    {
      key: 'visitPurpose',
      header: 'Purpose',
      render: (visit) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px] block" title={visit.visitPurpose}>
          {visit.visitPurpose || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (visit) => (
        <Badge 
          variant="outline"
          className={cn(
            "capitalize",
            statusConfig[visit.status]?.bgColor,
            statusConfig[visit.status]?.color
          )}
        >
          {statusConfig[visit.status]?.label || visit.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (visit) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => { e.stopPropagation(); handleViewDetails(visit); }}
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-2 p-2 lg:p-3">
      <div className="pt-3">
        <PageHeader 
          title="Visit History"
          description="Track, manage and convert all business visits"
        />
      </div>

      {/* Search and Filters */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, employee, address or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
              <SelectTrigger className="w-[150px] h-10">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>

            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger className="w-[170px] h-10">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="no-show">No Show</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="h-10 px-4"
            >
              <X className="h-4 w-4 mr-1.5" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visits Table */}
      <PaginatedDataTable
        columns={columns}
        data={visits}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        emptyMessage="No visits found"
      />

      {/* View-Only Modal */}
      {selectedVisit && (
        <VisitDetailModal
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          visit={selectedVisit}
          isAdmin={isAdmin}
          isAdminOrManager={isAdminOrManager}
        />
      )}
    </div>
  );
};

export default VisitHistory;
