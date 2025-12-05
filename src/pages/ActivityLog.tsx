import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, User, Users, FileText, Calendar, DollarSign, Settings, LogIn, LogOut, CalendarOff, ShieldAlert } from 'lucide-react';
import { useActivityStore, ActivityType } from '@/stores/activityStore';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const activityIcons: Record<ActivityType, { icon: typeof Activity; color: string }> = {
  user_created: { icon: Users, color: 'text-success' },
  user_updated: { icon: Users, color: 'text-info' },
  user_deleted: { icon: Users, color: 'text-destructive' },
  client_created: { icon: User, color: 'text-success' },
  client_updated: { icon: User, color: 'text-info' },
  client_deleted: { icon: User, color: 'text-destructive' },
  contract_created: { icon: FileText, color: 'text-success' },
  contract_updated: { icon: FileText, color: 'text-info' },
  contract_deleted: { icon: FileText, color: 'text-destructive' },
  job_created: { icon: Calendar, color: 'text-success' },
  job_updated: { icon: Calendar, color: 'text-info' },
  job_completed: { icon: Calendar, color: 'text-primary' },
  job_cancelled: { icon: Calendar, color: 'text-warning' },
  estimate_created: { icon: DollarSign, color: 'text-success' },
  estimate_updated: { icon: DollarSign, color: 'text-info' },
  estimate_deleted: { icon: DollarSign, color: 'text-destructive' },
  estimate_sent: { icon: DollarSign, color: 'text-primary' },
  payroll_created: { icon: DollarSign, color: 'text-success' },
  payroll_approved: { icon: DollarSign, color: 'text-primary' },
  payroll_paid: { icon: DollarSign, color: 'text-success' },
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
  contract_created: 'contractCreated',
  contract_updated: 'contractUpdated',
  contract_deleted: 'contractDeleted',
  job_created: 'jobCreated',
  job_updated: 'jobUpdated',
  job_completed: 'jobCompleted',
  job_cancelled: 'jobCancelled',
  estimate_created: 'estimateCreated',
  estimate_updated: 'estimateUpdated',
  estimate_deleted: 'estimateDeleted',
  estimate_sent: 'estimateSent',
  payroll_created: 'payrollCreated',
  payroll_approved: 'payrollApproved',
  payroll_paid: 'payrollPaid',
  settings_updated: 'settingsUpdated',
  login: 'login',
  logout: 'logout',
  absence_requested: 'absenceRequested',
  absence_approved: 'absenceApproved',
  absence_rejected: 'absenceRejected',
};

const ActivityLog = () => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const { logs } = useActivityStore();

  // Role-based access control - only admin and manager can view
  if (!hasRole(['admin', 'manager'])) {
    return (
      <div className="container px-4 py-8 lg:px-8">
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

  const getTypeLabel = (type: ActivityType): string => {
    const key = typeToLabelKey[type] as keyof typeof t.activityLog.types;
    return t.activityLog.types[key] || type;
  };

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader title={t.activityLog.title} description={t.activityLog.description} />
      
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            {t.activityLog.recentActivity}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {logs.map((log) => {
                const config = activityIcons[log.type];
                const Icon = config.icon;
                return (
                  <div key={log.id} className="flex items-start gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center bg-muted", config.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{log.description}</p>
                        <Badge variant="outline" className="shrink-0">{getTypeLabel(log.type)}</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
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
              {logs.length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t.activityLog.noActivity}</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;
