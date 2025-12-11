import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { notifyOffRequestCreated } from '@/hooks/useNotifications';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarOff, 
  Check, 
  X, 
  Clock, 
  Plus,
  Calendar,
  Loader2,
  AlertCircle,
  Palmtree,
  UserX,
  CalendarDays,
  ArrowRight,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays, isPast, isFuture } from 'date-fns';
import OffRequestModal from '@/components/modals/OffRequestModal';

interface MyOffRequest {
  id: string;
  start_date: string;
  end_date: string;
  reason: string;
  request_type: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_at?: string;
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

const CleanerOffRequests = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isEnglish = language === 'en';
  
  const [requests, setRequests] = useState<MyOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchMyRequests = useCallback(async () => {
    if (!user?.id) return;
    
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
      
      // Only fetch requests for the current user (cleaner)
      const { data, error } = await supabase
        .from('absence_requests')
        .select('id, start_date, end_date, reason, request_type, status, created_at, approved_at')
        .eq('company_id', companyId)
        .eq('cleaner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching my off requests:', error);
        setIsLoading(false);
        return;
      }
      
      const mappedRequests: MyOffRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        start_date: req.start_date,
        end_date: req.end_date,
        reason: req.reason || '',
        request_type: req.request_type || 'time_off',
        status: req.status as 'pending' | 'approved' | 'rejected',
        created_at: req.created_at,
        approved_at: req.approved_at,
      }));
      
      setRequests(mappedRequests);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchMyRequests:', error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  const handleSubmitRequest = async (request: {
    startDate: string;
    endDate: string;
    reason: string;
    requestType: string;
  }) => {
    if (!user?.id || !user?.profile?.company_id) {
      toast.error('User not authenticated');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('absence_requests')
        .insert({
          cleaner_id: user.id,
          company_id: user.profile.company_id,
          start_date: request.startDate,
          end_date: request.endDate,
          reason: request.reason,
          request_type: request.requestType,
          status: 'pending',
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('Error creating off request:', error);
        toast.error(isEnglish ? 'Failed to create request' : 'Falha ao criar solicitação');
        return;
      }
      
      // Notify admin about the new off request
      const cleanerName = user.profile.first_name 
        ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
        : user.profile.email || 'Employee';
      
      await notifyOffRequestCreated(
        cleanerName,
        request.startDate,
        request.endDate,
        data.id
      );
      
      toast.success(isEnglish 
        ? 'Request submitted successfully! Waiting for admin approval.' 
        : 'Solicitação enviada com sucesso! Aguardando aprovação do administrador.');
      await fetchMyRequests();
    } catch (error) {
      console.error('Error in handleSubmitRequest:', error);
      toast.error(isEnglish ? 'Failed to create request' : 'Falha ao criar solicitação');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const activeBlocksCount = requests.filter(r => 
    r.status === 'approved' && !isPast(new Date(r.end_date))
  ).length;

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-4 lg:px-8 space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader 
          title={isEnglish ? "My Off Requests" : "Minhas Solicitações de Folga"}
          description={isEnglish 
            ? "Request and track your time off" 
            : "Solicite e acompanhe suas folgas"}
        />
        <Button onClick={() => setShowModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {isEnglish ? 'New Request' : 'Nova Solicitação'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
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
        <Card className="border-border/50">
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
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isEnglish ? 'Total Approved' : 'Total Aprovados'}
                </p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {isEnglish ? 'My Requests' : 'Minhas Solicitações'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {isEnglish ? 'No requests yet' : 'Nenhuma solicitação ainda'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isEnglish 
                  ? 'Click "New Request" to create your first off request' 
                  : 'Clique em "Nova Solicitação" para criar sua primeira solicitação de folga'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => {
                const statusConf = statusConfig[request.status];
                const StatusIcon = statusConf.icon;
                const typeConf = requestTypeConfig[request.request_type as keyof typeof requestTypeConfig] || requestTypeConfig.time_off;
                const TypeIcon = typeConf.icon;
                const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;
                const isCurrentlyActive = request.status === 'approved' && 
                  !isPast(new Date(request.end_date)) &&
                  !isFuture(new Date(request.start_date));
                
                return (
                  <div key={request.id} className={cn(
                    "p-4 rounded-lg border transition-all",
                    isCurrentlyActive && "ring-2 ring-primary/50 bg-primary/5"
                  )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Type and Status */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("border", typeConf.color)}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {isEnglish ? typeConf.label : typeConf.labelPt}
                          </Badge>
                          <Badge className={cn("border", statusConf.bgColor, statusConf.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {isEnglish ? statusConf.label : statusConf.labelPt}
                          </Badge>
                          {isCurrentlyActive && (
                            <Badge className="bg-primary text-primary-foreground">
                              {isEnglish ? 'ACTIVE NOW' : 'ATIVO AGORA'}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Date Range */}
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(request.start_date), 'dd/MM/yyyy')}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(new Date(request.end_date), 'dd/MM/yyyy')}
                          </span>
                          <Badge variant="outline">
                            {days} {isEnglish ? (days === 1 ? 'day' : 'days') : (days === 1 ? 'dia' : 'dias')}
                          </Badge>
                        </div>
                        
                        {/* Reason if exists */}
                        {request.reason && (
                          <p className="text-sm text-muted-foreground">
                            {request.reason}
                          </p>
                        )}
                        
                        {/* Created date */}
                        <p className="text-xs text-muted-foreground">
                          {isEnglish ? 'Requested on' : 'Solicitado em'}: {format(new Date(request.created_at), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Off Request Modal */}
      <OffRequestModal
        open={showModal}
        onOpenChange={setShowModal}
        onSubmit={handleSubmitRequest}
        employeeName={user?.profile?.first_name 
          ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
          : undefined}
      />
    </div>
  );
};

export default CleanerOffRequests;
