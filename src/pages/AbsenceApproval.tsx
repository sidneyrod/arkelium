import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarOff, 
  Check, 
  X, 
  Clock, 
  User,
  Calendar,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface AbsenceRequest {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const statusConfig = {
  pending: { 
    color: 'text-warning', 
    bgColor: 'bg-warning/10 border-warning/20', 
    label: 'Pending',
    icon: Clock 
  },
  approved: { 
    color: 'text-success', 
    bgColor: 'bg-success/10 border-success/20', 
    label: 'Approved',
    icon: Check 
  },
  rejected: { 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10 border-destructive/20', 
    label: 'Rejected',
    icon: X 
  },
};

const AbsenceApproval = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [requests, setRequests] = useState<AbsenceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

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
      
      const { data, error } = await supabase
        .from('absence_requests')
        .select(`
          id,
          cleaner_id,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          profiles:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching absence requests:', error);
        setIsLoading(false);
        return;
      }
      
      const mappedRequests: AbsenceRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        cleaner_id: req.cleaner_id,
        cleaner_name: req.profiles 
          ? `${req.profiles.first_name || ''} ${req.profiles.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        start_date: req.start_date,
        end_date: req.end_date,
        reason: req.reason || '',
        status: req.status,
        created_at: req.created_at,
      }));
      
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
        toast.error('Failed to approve request');
        return;
      }
      
      toast.success('Absence request approved');
      await fetchRequests();
    } catch (error) {
      console.error('Error in handleApprove:', error);
      toast.error('Failed to approve request');
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
        toast.error('Failed to reject request');
        return;
      }
      
      toast.success('Absence request rejected');
      await fetchRequests();
    } catch (error) {
      console.error('Error in handleReject:', error);
      toast.error('Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'all') return true;
    return req.status === activeTab;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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
        title="Absence Approvals"
        description="Review and manage employee absence requests"
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
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
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'approved').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <X className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{requests.filter(r => r.status === 'rejected').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="gap-2">
            <Check className="h-4 w-4" />
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <X className="h-4 w-4" />
            Rejected
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <CalendarOff className="h-4 w-4" />
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredRequests.length > 0 ? (
            <div className="space-y-3">
              {filteredRequests.map((request) => {
                const config = statusConfig[request.status];
                const StatusIcon = config.icon;
                const days = differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1;
                
                return (
                  <Card key={request.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium">{request.cleaner_name}</p>
                              <p className="text-xs text-muted-foreground">
                                Requested {format(new Date(request.created_at), 'MMM d, yyyy')}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {days} {days === 1 ? 'day' : 'days'}
                            </Badge>
                          </div>
                          
                          {request.reason && (
                            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                              {request.reason}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={cn("border", config.bgColor, config.color)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                          
                          {request.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-destructive hover:text-destructive"
                                onClick={() => handleReject(request.id)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1.5"
                                onClick={() => handleApprove(request.id)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Approve
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
            <Card className="border-border/50">
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {activeTab === 'pending' 
                    ? 'No pending absence requests' 
                    : `No ${activeTab} requests found`}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AbsenceApproval;
