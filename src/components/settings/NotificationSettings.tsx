import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useNotifications, NotificationPreferences } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { toast } from 'sonner';

export const NotificationSettings = () => {
  const { t } = useLanguage();
  const { isCleaner, isAdminOrManager } = useRoleAccess();
  const { preferences, updatePreferences } = useNotifications();
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({
    notify_new_jobs: true,
    notify_job_changes: true,
    notify_job_cancellations: true,
    notify_visits: true,
    notify_off_requests: true,
    notify_off_request_status: true,
    notify_invoices: true,
    notify_payroll: true,
    notify_system: true
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        notify_new_jobs: preferences.notify_new_jobs,
        notify_job_changes: preferences.notify_job_changes,
        notify_job_cancellations: preferences.notify_job_cancellations,
        notify_visits: preferences.notify_visits,
        notify_off_requests: preferences.notify_off_requests,
        notify_off_request_status: preferences.notify_off_request_status,
        notify_invoices: preferences.notify_invoices,
        notify_payroll: preferences.notify_payroll,
        notify_system: preferences.notify_system
      });
    }
  }, [preferences]);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences(localPrefs);
      setHasChanges(false);
      toast.success(t.notifications?.preferencesSaved || 'Notification preferences saved');
    } catch (error) {
      toast.error(t.notifications?.preferencesError || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const settingGroups = [
    {
      title: t.notifications?.jobNotifications || 'Job Notifications',
      description: t.notifications?.jobNotificationsDesc || 'Notifications about scheduled jobs',
      settings: [
        { key: 'notify_new_jobs', label: t.notifications?.newJobs || 'New jobs scheduled for you' },
        { key: 'notify_job_changes', label: t.notifications?.jobChanges || 'Changes to your scheduled jobs' },
        { key: 'notify_job_cancellations', label: t.notifications?.jobCancellations || 'Job cancellations' }
      ]
    },
    {
      title: t.notifications?.visitNotifications || 'Visit Notifications',
      description: t.notifications?.visitNotificationsDesc || 'Notifications about scheduled visits',
      settings: [
        { key: 'notify_visits', label: t.notifications?.visits || 'New visits scheduled for you' }
      ]
    },
    {
      title: t.notifications?.offRequestNotifications || 'Field Request Notifications',
      description: t.notifications?.offRequestNotificationsDesc || 'Notifications about field requests',
      settings: isAdminOrManager ? [
        { key: 'notify_off_requests', label: t.notifications?.offRequests || 'New field requests from employees' },
        { key: 'notify_off_request_status', label: t.notifications?.offRequestStatus || 'Field request status updates' }
      ] : [
        { key: 'notify_off_request_status', label: t.notifications?.offRequestStatus || 'Field request approvals/rejections' }
      ]
    },
    ...(isAdminOrManager ? [{
      title: t.notifications?.financialNotifications || 'Financial Notifications',
      description: t.notifications?.financialNotificationsDesc || 'Notifications about invoices, payments and cash handling',
      settings: [
        { key: 'notify_invoices', label: t.notifications?.invoices || 'Invoice updates and payments' },
        { key: 'notify_cash_requests', label: 'Cash approval requests from cleaners' }
      ]
    }] : [{
      title: 'Cash Payment Notifications',
      description: 'Notifications about your cash payments',
      settings: [
        { key: 'notify_cash_status', label: 'Cash approval and dispute updates' }
      ]
    }]),
    {
      title: t.notifications?.payrollNotifications || 'Payroll Notifications',
      description: t.notifications?.payrollNotificationsDesc || 'Notifications about payroll and paystubs',
      settings: isCleaner ? [
        { key: 'notify_payroll', label: t.notifications?.paystubAvailable || 'Paystub available' }
      ] : [
        { key: 'notify_payroll', label: t.notifications?.payrollGenerated || 'Payroll period generated' }
      ]
    },
    {
      title: t.notifications?.systemNotifications || 'System Notifications',
      description: t.notifications?.systemNotificationsDesc || 'General system announcements',
      settings: [
        { key: 'notify_system', label: t.notifications?.systemAnnouncements || 'Company announcements and broadcasts' }
      ]
    }
  ];

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              {t.notifications?.preferences || 'Notification Preferences'}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {t.notifications?.preferencesDesc || 'Choose which notifications you want to receive'}
            </CardDescription>
          </div>
          {hasChanges && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              {t.common?.save || 'Save'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {settingGroups.map((group, index) => (
            <div key={index} className="p-3 rounded-lg border border-border/40 bg-muted/20">
              <div className="mb-3">
                <p className="text-xs font-semibold text-foreground">{group.title}</p>
                <p className="text-[10px] text-muted-foreground">{group.description}</p>
              </div>
              <div className="space-y-2.5">
                {group.settings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between gap-2">
                    <Label htmlFor={setting.key} className="text-xs cursor-pointer leading-tight flex-1">
                      {setting.label}
                    </Label>
                    <Switch
                      id={setting.key}
                      checked={localPrefs[setting.key as keyof NotificationPreferences] as boolean}
                      onCheckedChange={(checked) => handleToggle(setting.key as keyof NotificationPreferences, checked)}
                      className="scale-90"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon - Compact */}
        <div className="mt-4 p-3 rounded-lg border border-dashed border-border/50 flex items-center gap-3">
          <BellOff className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-medium">{t.notifications?.futureFeatures || 'Coming Soon'}</p>
            <p className="text-[10px] text-muted-foreground">
              {t.notifications?.futureDescription || 'Email and push notifications will be available in a future update.'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
