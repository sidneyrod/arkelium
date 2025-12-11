import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CalendarOff, 
  Check, 
  X, 
  Clock, 
  User,
  Calendar,
  Loader2,
  AlertCircle,
  Palmtree,
  UserX,
  CalendarDays,
  ArrowRight,
  Stethoscope,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays, isPast, isFuture, startOfMonth, endOfMonth } from 'date-fns';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { notifyOffRequestApproved, notifyOffRequestRejected } from '@/hooks/useNotifications';

interface OffRequest {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  request_type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
}

const statusConfig = {
  pending: { 
    color: 'text-warning', 
    bgColor: 'bg-warning/10 border-warning/20', 
    label: 'Pending',
    labelPt: 'Pendente',
    icon: Clock 
  },
  approved: { 
    color: 'text-success', 
    bgColor: 'bg-success/10 border-success/20', 
    label: 'Approved',
    labelPt: 'Aprovado',
    icon: Check 
  },
  rejected: { 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/20', 
    label: 'Rejected',
    labelPt: 'Rejeitado',
    icon: X 
  },
};

const requestTypeConfig = {
  time_off: { 
    label: 'Day Off', 
    labelPt: 'Folga',
    icon: Clock, 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  vacation: { 
    label: 'Vacation', 
    labelPt: 'Férias',
    icon: Palmtree, 
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
  },
  personal: { 
    label: 'Personal', 
    labelPt: 'Pessoal',
    icon: UserX, 
    color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' 
  },
  medical: {
    label: 'Medical',
    labelPt: 'Médico',
    icon: Stethoscope,
    color: 'bg-red-500/10 text-red-500 border-red-500/20'
  },
};

const OffRequests = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { isAdminOrManager, isAdmin } = useRoleAccess();
  const isEnglish = language === 'en';
  
  const [requests, setRequests] = useState<OffRequest[]>([]);
  const [cleaners, setCleaners] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCleaner, setSelectedCleaner] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const fetchRequests = useCallback(async () => {
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        setIsLoading(false);
        return;
      }
      
      // Fetch all requests
      const { data, error } = await supabase
        .from('absence_requests')
        .select(`
          id,
          cleaner_id,
          start_date,
          end_date,
          reason,
          request_type,
          status,
          created_at,
          approved_at,
          approved_by,
          profiles:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching off requests:', error);
        setIsLoading(false);
        return;
      }
      
      const mappedRequests: OffRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        cleaner_id: req.cleaner_id,
        cleaner_name: req.profiles 
          ? `${req.profiles.first_name || ''} ${req.profiles.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        start_date: req.start_date,
        end_date: req.end_date,
        reason: req.reason || '',
        request_type: req.request_type || 'time_off',
        status: req.status,
        created_at: req.created_at,
        approved_at: req.approved_at,
        approved_by: req.approved_by,
      }));
      
      // Build unique cleaner list
      const uniqueCleaners = Array.from(new Map(
        mappedRequests.map(r => [r.cleaner_id, { id: r.cleaner_id, name: r.cleaner_name }])
      ).values());
      setCleaners(uniqueCleaners);
      
      setRequests(mappedRequests);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchRequests:', error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error approving request:', error);
        toast.error(isEnglish ? 'Failed to approve request' : 'Falha ao aprovar solicitação');
        return;
      }
      
      // Log the action
      const request = requests.find(r => r.id === id);
      if (request && user?.profile?.company_id) {
        await supabase.from('activity_logs').insert({
          action: 'off_request_approved',
          entity_type: 'absence_request',
          entity_id: id,
          company_id: user.profile.company_id,
          user_id: user.id,
          details: {
            cleaner_name: request.cleaner_name,
            start_date: request.start_date,
            end_date: request.end_date,
            request_type: request.request_type,
          },
        });
      }
      
      // Notify the cleaner about approval
      await notifyOffRequestApproved(
        request?.cleaner_id || '',
        request?.start_date || '',
        request?.end_date || '',
        id
      );
      
      toast.success(isEnglish 
        ? 'Off request approved. Cleaner is now blocked from schedule.' 
        : 'Solicitação aprovada. Cleaner bloqueado da agenda.');
      await fetchRequests();
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error(isEnglish ? 'Failed to approve request' : 'Falha ao aprovar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from('absence_requests')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          approved_by: user?.id,
        })
        .eq('id', id);
      
      if (error) {
        console.error('Error rejecting request:', error);
        toast.error(isEnglish ? 'Failed to reject request' : 'Falha ao rejeitar solicitação');
        return;
      }
      
      // Log the action
      const request = requests.find(r => r.id === id);
      if (request && user?.profile?.company_id) {
        await supabase.from('activity_logs').insert({
          action: 'off_request_rejected',
          entity_type: 'absence_request',
          entity_id: id,
          company_id: user.profile.company_id,
          user_id: user.id,
          details: {
            cleaner_name: request.cleaner_name,
            start_date: request.start_date,
            end_date: request.end_date,
            request_type: request.request_type,
          },
        });
      }
      
      // Notify the cleaner about rejection
      await notifyOffRequestRejected(
        request?.cleaner_id || '',
        request?.start_date || '',
        request?.end_date || '',
        'Request was rejected by admin',
        id
      );
      
      toast.success(isEnglish ? 'Off request rejected' : 'Solicitação rejeitada');
      await fetchRequests();
    } catch (error) {
      console.error('Error in handleReject:', error);
      toast.error(isEnglish ? 'Failed to reject request' : 'Falha ao rejeitar solicitação');
    } finally {
      setProcessingId(null);
    }
  };

  // Apply filters
  const filteredRequests = requests.filter(req => {
    // Tab filter
    if (activeTab === 'active') {
      if (!(req.status === 'approved' && !isPast(new Date(req.end_date)))) return false;
    } else if (activeTab !== 'all') {
      if (req.status !== activeTab) return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!req.cleaner_name.toLowerCase().includes(query) && 
          !req.reason?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    // Cleaner filter
    if (selectedCleaner !== 'all' && req.cleaner_id !== selectedCleaner) {
      return false;
    }
    
    // Type filter
    if (selectedType !== 'all' && req.request_type !== selectedType) {
      return false;
    }
    
    return true;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const activeBlocksCount = requests.filter(r => 
    r.status === 'approved' && !isPast(new Date(r.end_date))
  ).length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title={isEnglish ? "Off Requests" : "Solicitações de Folga"}
        description={isEnglish 
          ? "Review and manage employee off requests" 
          : "Gerencie solicitações de folga dos funcionários"}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all" 
              onClick={() => setActiveTab('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isEnglish ? 'Pending' : 'Pendentes'}
                </p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setActiveTab('active')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarOff className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isEnglish ? 'Active Blocks' : 'Bloqueios Ativos'}
                </p>
                <p className="text-2xl font-bold">{activeBlocksCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setActiveTab('approved')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isEnglish ? 'Approved' : 'Aprovados'}
                </p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
              onClick={() => setActiveTab('rejected')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isEnglish ? 'Rejected' : 'Rejeitados'}
                </p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isEnglish ? "Search by name or reason..." : "Buscar por nome ou motivo..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder={isEnglish ? "All Cleaners" : "Todos os Cleaners"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEnglish ? "All Cleaners" : "Todos os Cleaners"}</SelectItem>
                {cleaners.map(cleaner => (
                  <SelectItem key={cleaner.id} value={cleaner.id}>{cleaner.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={isEnglish ? "All Types" : "Todos os Tipos"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isEnglish ? "All Types" : "Todos os Tipos"}</SelectItem>
                {Object.entries(requestTypeConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{isEnglish ? config.label : config.labelPt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{isEnglish ? 'Pending' : 'Pendentes'}</span>
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <CalendarOff className="h-4 w-4" />
            <span className="hidden sm:inline">{isEnglish ? 'Active' : 'Ativos'}</span>
            {activeBlocksCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {activeBlocksCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">{isEnglish ? 'Approved' : 'Aprovados'}</span>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{isEnglish ? 'Rejected' : 'Rejeitados'}</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">{isEnglish ? 'All' : 'Todos'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const statusConf = statusConfig[request.status];
                const StatusIcon = statusConf.icon;
                const typeConf = requestTypeConfig[request.request_type as keyof typeof requestTypeConfig] || requestTypeConfig.time_off;
                const TypeIcon = typeConf.icon;
                // Parse dates at local noon to avoid timezone issues
                const parseLocalDate = (dateStr: string) => {
                  const [year, month, day] = dateStr.split('-').map(Number);
                  return new Date(year, month - 1, day, 12, 0, 0);
                };
                const startDate = parseLocalDate(request.start_date);
                const endDate = parseLocalDate(request.end_date);
                const days = differenceInDays(endDate, startDate) + 1;
                const isCurrentlyBlocked = request.status === 'approved' && 
                  !isPast(endDate) &&
                  !isFuture(startDate);
                const isFullMonth = days >= 28 && days <= 31;
                
                return (
                  <Card key={request.id} className={cn(
                    "border-border/50 transition-all",
                    isCurrentlyBlocked && "ring-2 ring-primary/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* Header with name and type */}
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{request.cleaner_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {isEnglish ? 'Requested' : 'Solicitado em'} {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}
                              </p>
                            </div>
                            <Badge className={cn("border", typeConf.color)}>
                              <TypeIcon className="h-3 w-3 mr-1" />
                              {isEnglish ? typeConf.label : typeConf.labelPt}
                            </Badge>
                            {isFullMonth && (
                              <Badge variant="destructive">
                                {isEnglish ? 'Full Month' : 'Mês Inteiro'}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Date Range */}
                          <div className="flex items-center gap-2 text-sm bg-muted/50 p-3 rounded-lg">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(startDate, 'dd/MM/yyyy')}
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {format(endDate, 'dd/MM/yyyy')}
                            </span>
                            <Badge variant="outline" className="ml-auto">
                              {days} {isEnglish ? (days === 1 ? 'day' : 'days') : (days === 1 ? 'dia' : 'dias')}
                            </Badge>
                            {isCurrentlyBlocked && (
                              <Badge className="bg-primary text-primary-foreground">
                                {isEnglish ? 'ACTIVE NOW' : 'ATIVO AGORA'}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Reason if exists */}
                          {request.reason && (
                            <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
                              "{request.reason}"
                            </p>
                          )}
                          
                          {/* Return date for approved */}
                          {request.status === 'approved' && isFuture(endDate) && (
                            <p className="text-xs text-muted-foreground">
                              {isEnglish ? 'Returns to schedule:' : 'Retorna à agenda:'} {' '}
                              <span className="font-medium text-foreground">
                                {format(new Date(endDate.getTime() + 86400000), 'dd/MM/yyyy')}
                              </span>
                            </p>
                          )}
                        </div>
                        
                        {/* Status and Actions */}
                        <div className="flex flex-col items-end gap-3">
                          <Badge className={cn("border", statusConf.bgColor, statusConf.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {isEnglish ? statusConf.label : statusConf.labelPt}
                          </Badge>
                          
                          {request.status === 'pending' && isAdmin && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-destructive hover:text-destructive"
                                onClick={() => handleReject(request.id)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                                {isEnglish ? 'Reject' : 'Rejeitar'}
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleApprove(request.id)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                                {isEnglish ? 'Approve' : 'Aprovar'}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg border-dashed">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {isEnglish ? 'No requests found' : 'Nenhuma solicitação encontrada'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'pending' 
                  ? (isEnglish ? 'No pending requests to review' : 'Nenhuma solicitação pendente para revisar')
                  : (isEnglish ? 'Try adjusting your filters' : 'Tente ajustar seus filtros')}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OffRequests;
