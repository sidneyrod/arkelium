import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
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
  Pencil,
  FileText,
  FileSpreadsheet,
  Briefcase,
  ArrowRightLeft,
  X,
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import VisitDetailModal from '@/components/visits/VisitDetailModal';
import EditVisitModal from '@/components/visits/EditVisitModal';
import ConvertVisitModal from '@/components/visits/ConvertVisitModal';
import CancelVisitModal from '@/components/visits/CancelVisitModal';
import { logAuditEntry } from '@/hooks/useAuditLog';

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

type PeriodFilter = 'today' | 'week' | 'month' | 'custom' | 'all';
type OriginFilter = 'all' | 'admin' | 'cleaner' | 'referral' | 'lead';

const statusConfig = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
  'no-show': { color: 'text-destructive', bgColor: 'bg-destructive/10 border-destructive/20', label: 'No Show' },
};

const ITEMS_PER_PAGE = 10;

const VisitHistory = () => {
  const { t } = useLanguage();
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole(['admin']);
  const isAdminOrManager = hasRole(['admin', 'manager']);
  
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [purposeFilter, setPurposeFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState<OriginFilter>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modals
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [convertType, setConvertType] = useState<'job' | 'estimate' | 'contract'>('job');

  // Unique filter options
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string}[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);

  // Fetch visits from Supabase
  const fetchVisits = useCallback(async () => {
    try {
      setIsLoading(true);
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      // Build query for visits only
      let query = supabase
        .from('jobs')
        .select(`
          id,
          client_id,
          cleaner_id,
          location_id,
          scheduled_date,
          start_time,
          duration_minutes,
          status,
          job_type,
          visit_purpose,
          visit_route,
          notes,
          created_at,
          completed_at,
          clients(id, name, email, phone),
          profiles:cleaner_id(id, first_name, last_name),
          client_locations(id, address, city)
        `)
        .eq('company_id', companyId)
        .eq('job_type', 'visit')
        .order('scheduled_date', { ascending: false });

      // For cleaners, only show their assigned visits
      if (!isAdminOrManager) {
        query = query.eq('cleaner_id', user?.id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching visits:', error);
        toast.error('Failed to load visits');
        setIsLoading(false);
        return;
      }
      
      const mappedVisits: Visit[] = (data || []).map((visit: any) => ({
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
      
      setVisits(mappedVisits);
      
      // Extract unique filter options
      const uniqueClients = Array.from(new Map(
        mappedVisits.map(v => [v.clientId, { id: v.clientId, name: v.clientName }])
      ).values());
      const uniqueEmployees = Array.from(new Map(
        mappedVisits.filter(v => v.employeeId).map(v => [v.employeeId, { id: v.employeeId, name: v.employeeName }])
      ).values());
      const uniquePurposes = Array.from(new Set(
        mappedVisits.map(v => v.visitPurpose).filter(Boolean)
      )) as string[];
      
      setClients(uniqueClients);
      setEmployees(uniqueEmployees);
      setPurposes(uniquePurposes);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchVisits:', error);
      setIsLoading(false);
    }
  }, [user, isAdminOrManager]);

  useEffect(() => {
    if (user) {
      fetchVisits();
    }
  }, [user, fetchVisits]);

  // Apply filters
  useEffect(() => {
    let result = [...visits];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(v => 
        v.clientName.toLowerCase().includes(query) ||
        v.employeeName.toLowerCase().includes(query) ||
        v.address.toLowerCase().includes(query) ||
        (v.visitPurpose && v.visitPurpose.toLowerCase().includes(query)) ||
        v.status.toLowerCase().includes(query)
      );
    }
    
    // Period filter
    const today = new Date();
    if (periodFilter === 'today') {
      const todayStr = format(today, 'yyyy-MM-dd');
      result = result.filter(v => v.date === todayStr);
    } else if (periodFilter === 'week') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      result = result.filter(v => {
        const visitDate = parseISO(v.date);
        return isWithinInterval(visitDate, { start: weekStart, end: weekEnd });
      });
    } else if (periodFilter === 'month') {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      result = result.filter(v => {
        const visitDate = parseISO(v.date);
        return isWithinInterval(visitDate, { start: monthStart, end: monthEnd });
      });
    } else if (periodFilter === 'custom' && customStartDate && customEndDate) {
      result = result.filter(v => {
        const visitDate = parseISO(v.date);
        return isWithinInterval(visitDate, { 
          start: parseISO(customStartDate), 
          end: parseISO(customEndDate) 
        });
      });
    }
    
    // Client filter
    if (clientFilter !== 'all') {
      result = result.filter(v => v.clientId === clientFilter);
    }
    
    // Employee filter
    if (employeeFilter !== 'all') {
      result = result.filter(v => v.employeeId === employeeFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(v => v.status === statusFilter);
    }
    
    // Purpose filter
    if (purposeFilter !== 'all') {
      result = result.filter(v => v.visitPurpose === purposeFilter);
    }
    
    setFilteredVisits(result);
    setCurrentPage(1);
  }, [visits, searchQuery, periodFilter, customStartDate, customEndDate, clientFilter, employeeFilter, statusFilter, purposeFilter, originFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredVisits.length / ITEMS_PER_PAGE);
  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewDetails = (visit: Visit) => {
    setSelectedVisit(visit);
    setShowDetailModal(true);
  };

  const handleEdit = (visit: Visit) => {
    if (!isAdminOrManager && visit.employeeId !== user?.id) {
      toast.error('You can only edit your own visits');
      return;
    }
    setSelectedVisit(visit);
    setShowEditModal(true);
  };

  const handleConvert = (visit: Visit, type: 'job' | 'estimate' | 'contract') => {
    if (type === 'contract' && !isAdmin) {
      toast.error('Only administrators can convert visits to contracts');
      return;
    }
    setSelectedVisit(visit);
    setConvertType(type);
    setShowConvertModal(true);
  };

  const handleCancel = (visit: Visit) => {
    if (!isAdminOrManager && visit.employeeId !== user?.id) {
      toast.error('You can only cancel your own visits');
      return;
    }
    setSelectedVisit(visit);
    setShowCancelModal(true);
  };

  const handleGeneratePdf = async (visit: Visit) => {
    toast.info('Generating PDF...');
    // PDF generation logic would go here
    await logAuditEntry({
      action: 'job_updated',
      entityType: 'visit',
      entityId: visit.id,
      details: { description: 'PDF generated for visit' }
    }, user?.id, user?.profile?.company_id);
    toast.success('PDF generated successfully');
  };

  const refreshVisits = () => {
    fetchVisits();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setPeriodFilter('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setClientFilter('all');
    setEmployeeFilter('all');
    setStatusFilter('all');
    setPurposeFilter('all');
    setOriginFilter('all');
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

  return (
    <div className="space-y-8 p-2">
      {/* Header Section with more spacing */}
      <div className="pt-4">
        <PageHeader 
          title="Visit History"
          description="Track, manage and convert all business visits"
        />
      </div>

      {/* Search and Quick Filters */}
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Search & Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, employee, address, purpose or status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 text-sm"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Filter */}
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
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {periodFilter === 'custom' && (
              <>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-[150px] h-10"
                />
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-[150px] h-10"
                />
              </>
            )}

            {/* Client Filter */}
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

            {/* Employee Filter */}
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

            {/* Status Filter */}
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

            {/* Purpose Filter */}
            {purposes.length > 0 && (
              <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                <SelectTrigger className="w-[170px] h-10">
                  <SelectValue placeholder="Purpose" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purposes</SelectItem>
                  {purposes.map(purpose => (
                    <SelectItem key={purpose} value={purpose}>{purpose}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Clear Filters */}
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

      {/* Results Stats */}
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Showing {paginatedVisits.length} of {filteredVisits.length} visits
        </p>
      </div>

      {/* Visits Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Calendar className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No visits found</p>
              <p className="text-sm">Try adjusting your filters or search query</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Purpose</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {paginatedVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{formatDate(visit.date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatTime(visit.time)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium">{visit.clientName}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate" title={visit.address}>
                            {visit.address}
                            {visit.city && `, ${visit.city}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{visit.employeeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-muted-foreground truncate max-w-[150px] block" title={visit.visitPurpose}>
                          {visit.visitPurpose || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
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
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDetails(visit)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(isAdminOrManager || visit.employeeId === user?.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(visit)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleGeneratePdf(visit)}
                            title="Generate PDF"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          {isAdminOrManager && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleConvert(visit, 'job')}
                                title="Convert to Job"
                              >
                                <Briefcase className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleConvert(visit, 'estimate')}
                                title="Convert to Estimate"
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {visit.status === 'scheduled' && (isAdminOrManager || visit.employeeId === user?.id) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleCancel(visit)}
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
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
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modals */}
      {selectedVisit && (
        <>
          <VisitDetailModal
            open={showDetailModal}
            onOpenChange={setShowDetailModal}
            visit={selectedVisit}
            onEdit={() => {
              setShowDetailModal(false);
              setShowEditModal(true);
            }}
            onConvert={(type) => {
              setShowDetailModal(false);
              handleConvert(selectedVisit, type);
            }}
            onCancel={() => {
              setShowDetailModal(false);
              handleCancel(selectedVisit);
            }}
            onGeneratePdf={() => handleGeneratePdf(selectedVisit)}
            isAdmin={isAdmin}
            isAdminOrManager={isAdminOrManager}
          />
          <EditVisitModal
            open={showEditModal}
            onOpenChange={setShowEditModal}
            visit={selectedVisit}
            onSuccess={refreshVisits}
          />
          <ConvertVisitModal
            open={showConvertModal}
            onOpenChange={setShowConvertModal}
            visit={selectedVisit}
            convertType={convertType}
            onSuccess={refreshVisits}
          />
          <CancelVisitModal
            open={showCancelModal}
            onOpenChange={setShowCancelModal}
            visit={selectedVisit}
            onSuccess={refreshVisits}
          />
        </>
      )}
    </div>
  );
};

export default VisitHistory;
