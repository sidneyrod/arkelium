import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
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
      title: t.notifications?.offRequestNotifications || 'Off Request Notifications',
      description: t.notifications?.offRequestNotificationsDesc || 'Notifications about time off requests',
      settings: isAdminOrManager ? [
        { key: 'notify_off_requests', label: t.notifications?.offRequests || 'New off requests from employees' },
        { key: 'notify_off_request_status', label: t.notifications?.offRequestStatus || 'Off request status updates' }
      ] : [
        { key: 'notify_off_request_status', label: t.notifications?.offRequestStatus || 'Off request approvals/rejections' }
      ]
    },
    ...(isAdminOrManager ? [{
      title: t.notifications?.financialNotifications || 'Financial Notifications',
      description: t.notifications?.financialNotificationsDesc || 'Notifications about invoices and payments',
      settings: [
        { key: 'notify_invoices', label: t.notifications?.invoices || 'Invoice updates and payments' }
      ]
    }] : []),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.notifications?.preferences || 'Notification Preferences'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t.notifications?.preferencesDesc || 'Choose which notifications you want to receive'}
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : null}
            {t.common?.save || 'Save Changes'}
          </Button>
        )}
      </div>

      {settingGroups.map((group, index) => (
        <Card key={index}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.settings.map((setting) => (
              <div key={setting.key} className="flex items-center justify-between">
                <Label htmlFor={setting.key} className="flex-1 cursor-pointer">
                  {setting.label}
                </Label>
                <Switch
                  id={setting.key}
                  checked={localPrefs[setting.key as keyof NotificationPreferences] as boolean}
                  onCheckedChange={(checked) => handleToggle(setting.key as keyof NotificationPreferences, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <BellOff className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">{t.notifications?.futureFeatures || 'Coming Soon'}</p>
              <p className="text-sm text-muted-foreground">
                {t.notifications?.futureDescription || 'Email and push notifications will be available in a future update.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
