import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, Check, CheckCheck, Filter, Search, ExternalLink, AlertTriangle, Info, AlertCircle, Send, Users } from 'lucide-react';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNotifications, Notification, NotificationType, NotificationSeverity, notifyBroadcast } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { format, formatDistanceToNow, subDays, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const getSeverityIcon = (severity: NotificationSeverity) => {
  switch (severity) {
    case 'critical':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    default:
      return <Info className="h-5 w-5 text-primary" />;
  }
};

const getTypeColor = (type: NotificationType): string => {
  switch (type) {
    case 'job':
      return 'bg-primary/10 text-primary';
    case 'visit':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'off_request':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'invoice':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'payroll':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'system':
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getDeepLink = (notification: Notification): string | null => {
  const metadata = notification.metadata as Record<string, unknown>;
  
  switch (notification.type) {
    case 'job':
      if (metadata.job_id) return `/schedule?jobId=${metadata.job_id}`;
      return '/schedule';
    case 'visit':
      if (metadata.visit_id) return `/visit-history?visitId=${metadata.visit_id}`;
      return '/visit-history';
    case 'off_request':
      if (metadata.off_request_id) return `/off-requests?requestId=${metadata.off_request_id}`;
      return '/off-requests';
    case 'invoice':
      if (metadata.invoice_id) return `/invoices?invoiceId=${metadata.invoice_id}`;
      return '/invoices';
    case 'payroll':
      if (metadata.period_id) return `/payroll?periodId=${metadata.period_id}`;
      return '/payroll';
    default:
      return null;
  }
};

export default function Notifications() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, isAdminOrManager } = useRoleAccess();
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refetch } = useNotifications();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'cleaner' | 'manager'>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [userFilter, setUserFilter] = useState<string>('all');

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('first_name');

      if (error) throw error;
      setUsers(data?.map(u => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unknown' })) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!notification.title.toLowerCase().includes(query) && 
          !notification.message.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Status filter
    if (statusFilter === 'unread' && notification.is_read) return false;
    if (statusFilter === 'read' && !notification.is_read) return false;

    // Type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    // Date filter
    if (dateFilter !== 'all') {
      const createdAt = new Date(notification.created_at);
      const now = new Date();
      
      if (dateFilter === 'today' && createdAt < subDays(now, 1)) return false;
      if (dateFilter === 'week' && createdAt < subDays(now, 7)) return false;
      if (dateFilter === 'month' && createdAt < subMonths(now, 1)) return false;
    }

    // User filter (admin only)
    if (userFilter !== 'all' && notification.recipient_user_id !== userFilter) return false;

    return true;
  });

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    const deepLink = getDeepLink(notification);
    if (deepLink) {
      navigate(deepLink);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error(t.notifications?.fillAllFields || 'Please fill in all fields');
      return;
    }

    setSendingBroadcast(true);
    try {
      const success = await notifyBroadcast(
        broadcastTitle,
        broadcastMessage,
        broadcastTarget === 'all' ? undefined : broadcastTarget
      );

      if (success) {
        toast.success(t.notifications?.broadcastSent || 'Broadcast notification sent');
        setShowBroadcastModal(false);
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastTarget('all');
        refetch();
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      toast.error(t.notifications?.broadcastError || 'Failed to send broadcast');
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.notifications?.title || 'Notifications'}
        description={t.notifications?.description || 'Manage your notifications and alerts'}
        icon={Bell}
        actions={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                {t.notifications?.markAllRead || 'Mark all read'}
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setShowBroadcastModal(true)}>
                <Send className="h-4 w-4 mr-2" />
                {t.notifications?.sendBroadcast || 'Send Broadcast'}
              </Button>
            )}
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.common?.search || 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t.notifications?.status || 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common?.all || 'All'}</SelectItem>
                <SelectItem value="unread">{t.notifications?.unread || 'Unread'}</SelectItem>
                <SelectItem value="read">{t.notifications?.read || 'Read'}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t.notifications?.type || 'Type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common?.all || 'All'}</SelectItem>
                <SelectItem value="job">Job</SelectItem>
                <SelectItem value="visit">Visit</SelectItem>
                <SelectItem value="off_request">Off Request</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="payroll">Payroll</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t.notifications?.period || 'Period'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common?.all || 'All time'}</SelectItem>
                <SelectItem value="today">{t.common?.today || 'Today'}</SelectItem>
                <SelectItem value="week">{t.notifications?.lastWeek || 'Last 7 days'}</SelectItem>
                <SelectItem value="month">{t.notifications?.lastMonth || 'Last 30 days'}</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.notifications?.recipient || 'Recipient'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.common?.all || 'All users'}</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.notifications?.total || 'Total'}</p>
                <p className="text-2xl font-bold">{notifications.length}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.notifications?.unread || 'Unread'}</p>
                <p className="text-2xl font-bold text-primary">{unreadCount}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t.notifications?.read || 'Read'}</p>
                <p className="text-2xl font-bold">{notifications.length - unreadCount}</p>
              </div>
              <Check className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t.notifications?.list || 'Notifications'}</span>
            <Badge variant="secondary">{filteredNotifications.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t.notifications?.noNotifications || 'No notifications'}</p>
              <p className="text-sm">{t.notifications?.noNotificationsDesc || 'You\'re all caught up!'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg my-1",
                    !notification.is_read && "bg-primary/5 border-l-4 border-l-primary"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getSeverityIcon(notification.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", getTypeColor(notification.type))}>
                          {notification.type.replace('_', ' ')}
                        </Badge>
                        {notification.role_target && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {notification.role_target}
                          </Badge>
                        )}
                        {!notification.is_read && (
                          <Badge className="bg-primary text-primary-foreground text-xs">
                            {t.notifications?.new || 'New'}
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{format(new Date(notification.created_at), 'PPp')}</span>
                        <span>({formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      {getDeepLink(notification) && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Broadcast Modal */}
      <Dialog open={showBroadcastModal} onOpenChange={setShowBroadcastModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.notifications?.sendBroadcast || 'Send Broadcast Notification'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.notifications?.target || 'Target Audience'}</Label>
              <Select value={broadcastTarget} onValueChange={(v) => setBroadcastTarget(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.notifications?.allUsers || 'All Users'}</SelectItem>
                  <SelectItem value="cleaner">{t.notifications?.allCleaners || 'All Cleaners'}</SelectItem>
                  <SelectItem value="manager">{t.notifications?.allManagers || 'All Managers'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.notifications?.notificationTitle || 'Title'}</Label>
              <Input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder={t.notifications?.titlePlaceholder || 'Enter notification title'}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.notifications?.message || 'Message'}</Label>
              <Textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder={t.notifications?.messagePlaceholder || 'Enter notification message'}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBroadcastModal(false)}>
              {t.common?.cancel || 'Cancel'}
            </Button>
            <Button onClick={handleSendBroadcast} disabled={sendingBroadcast}>
              {sendingBroadcast ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t.notifications?.send || 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
