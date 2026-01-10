import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart3, 
  Banknote, 
  Info,
  Loader2,
  Save,
  Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface PreferencesTabProps {
  companyId: string | null | undefined;
}

interface Preferences {
  includeVisitsInReports: boolean;
  enableCashKeptByEmployee: boolean;
  autoSendCashReceipt: boolean;
}

const PreferencesTab = ({ companyId }: PreferencesTabProps) => {
  const [preferences, setPreferences] = useState<Preferences>({
    includeVisitsInReports: false,
    enableCashKeptByEmployee: true,
    autoSendCashReceipt: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPreferences, setInitialPreferences] = useState<Preferences | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('company_estimate_config')
        .select('include_visits_in_reports, enable_cash_kept_by_employee, auto_send_cash_receipt')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        setIsLoading(false);
        return;
      }

      const prefs: Preferences = {
        includeVisitsInReports: data?.include_visits_in_reports ?? false,
        enableCashKeptByEmployee: data?.enable_cash_kept_by_employee ?? true,
        autoSendCashReceipt: data?.auto_send_cash_receipt ?? false,
      };
      
      setPreferences(prefs);
      setInitialPreferences(prefs);
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (initialPreferences) {
      const changed = 
        preferences.includeVisitsInReports !== initialPreferences.includeVisitsInReports ||
        preferences.enableCashKeptByEmployee !== initialPreferences.enableCashKeptByEmployee ||
        preferences.autoSendCashReceipt !== initialPreferences.autoSendCashReceipt;
      setHasChanges(changed);
    }
  }, [preferences, initialPreferences]);

  const handleSave = async () => {
    if (!companyId) return;

    setIsSaving(true);
    try {
      // First try to update
      const { error: updateError, count } = await supabase
        .from('company_estimate_config')
        .update({
          include_visits_in_reports: preferences.includeVisitsInReports,
          enable_cash_kept_by_employee: preferences.enableCashKeptByEmployee,
          auto_send_cash_receipt: preferences.autoSendCashReceipt,
        })
        .eq('company_id', companyId);

      if (updateError) {
        // If update fails, try insert
        const { error: insertError } = await supabase
          .from('company_estimate_config')
          .insert({
            company_id: companyId,
            include_visits_in_reports: preferences.includeVisitsInReports,
            enable_cash_kept_by_employee: preferences.enableCashKeptByEmployee,
            auto_send_cash_receipt: preferences.autoSendCashReceipt,
          });

        if (insertError) throw insertError;
      }

      setInitialPreferences(preferences);
      setHasChanges(false);
      toast({
        title: 'Success',
        description: 'Preferences saved successfully',
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast({
        title: 'Error',
        description: 'Failed to save preferences',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <TabsContent value="preferences" className="space-y-4 mt-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="preferences" className="space-y-4 mt-4">
      <Alert className="border-info/30 bg-info/5">
        <Info className="h-4 w-4 text-info" />
        <AlertDescription className="text-xs">
          Configure operational preferences for this company. These settings affect how reports are generated and which features are available to employees.
        </AlertDescription>
      </Alert>

      {/* Report Settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Report Settings
          </CardTitle>
          <CardDescription className="text-xs">
            Control what data is included in operational reports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex-1 pr-4">
              <Label htmlFor="include-visits" className="text-sm font-medium cursor-pointer">
                Include prospecting visits in reports
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, prospecting visits (with $0 revenue) will appear in Work & Time Tracking reports. 
                Disable this to show only jobs with actual revenue, which is more useful for accounting purposes.
              </p>
            </div>
            <Switch
              id="include-visits"
              checked={preferences.includeVisitsInReports}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, includeVisitsInReports: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Cash Handling Settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            Cash Handling
          </CardTitle>
          <CardDescription className="text-xs">
            Configure how cash payments are handled by employees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex-1 pr-4">
              <Label htmlFor="cash-kept" className="text-sm font-medium cursor-pointer">
                Allow employees to keep cash from services
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, staff can choose to keep cash payments (deducted from their next payroll). 
                This enables the full cash approval workflow with admin review. When disabled, all cash must be delivered to the office.
              </p>
              {preferences.enableCashKeptByEmployee && (
                <div className="mt-2 p-2 bg-warning/10 rounded border border-warning/20">
                  <p className="text-[10px] text-warning">
                    <strong>Note:</strong> Cash kept by employees requires explicit admin approval before being deducted from payroll.
                  </p>
                </div>
              )}
            </div>
            <Switch
              id="cash-kept"
              checked={preferences.enableCashKeptByEmployee}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, enableCashKeptByEmployee: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Receipt Settings
          </CardTitle>
          <CardDescription className="text-xs">
            Configure how payment receipts are generated and sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
            <div className="flex-1 pr-4">
              <Label htmlFor="auto-send-receipt" className="text-sm font-medium cursor-pointer">
                Auto-send cash receipts to clients
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                When enabled, payment receipts will be automatically emailed to clients after a cash payment is recorded. 
                When disabled, receipts can still be sent manually from the Receipts page.
              </p>
            </div>
            <Switch
              id="auto-send-receipt"
              checked={preferences.autoSendCashReceipt}
              onCheckedChange={(checked) => 
                setPreferences(prev => ({ ...prev, autoSendCashReceipt: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving || !hasChanges}
          className="gap-2"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </TabsContent>
  );
};

export default PreferencesTab;
