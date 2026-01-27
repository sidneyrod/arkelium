import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Banknote, 
  Loader2,
  Save,
  Receipt,
  Search,
  X,
  FileText,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';

const settingsConfig = [
  {
    id: 'dashboard-settings',
    title: 'Dashboard Settings',
    keywords: ['dashboard', 'default', 'company', 'startup', 'home', 'initial'],
  },
  {
    id: 'invoice-settings',
    title: 'Invoice Settings',
    keywords: ['invoice', 'generate', 'automatic', 'manual', 'job', 'completion', 'billing', 'fatura'],
  },
  {
    id: 'report-settings',
    title: 'Report Settings',
    keywords: ['report', 'reports', 'prospecting', 'visits', 'revenue', 'accounting', 'work', 'time', 'tracking', 'data'],
  },
  {
    id: 'cash-handling',
    title: 'Cash Handling',
    keywords: ['cash', 'payment', 'payroll', 'employee', 'keep', 'approval', 'deducted', 'office', 'money'],
  },
  {
    id: 'receipt-settings',
    title: 'Receipt Settings',
    keywords: ['receipt', 'auto', 'generate', 'send', 'email', 'client', 'payment', 'automatic'],
  },
];
interface PreferencesTabProps {
  companyId: string | null | undefined;
}

interface Preferences {
  invoiceGenerationMode: 'automatic' | 'manual';
  includeVisitsInReports: boolean;
  enableCashKeptByEmployee: boolean;
  autoGenerateCashReceipt: boolean;
  autoSendCashReceipt: boolean;
}

const PreferencesTab = ({ companyId }: PreferencesTabProps) => {
  const { user } = useAuth();
  const { activeCompanies } = useAccessibleCompanies();
  
  const [preferences, setPreferences] = useState<Preferences>({
    invoiceGenerationMode: 'manual',
    includeVisitsInReports: false,
    enableCashKeptByEmployee: true,
    autoGenerateCashReceipt: true,
    autoSendCashReceipt: false,
  });
  const [defaultDashboardCompanyId, setDefaultDashboardCompanyId] = useState<string | null>(null);
  const [initialDefaultDashboardCompanyId, setInitialDefaultDashboardCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialPreferences, setInitialPreferences] = useState<Preferences | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchTerm.trim()) return settingsConfig;
    
    const term = searchTerm.toLowerCase();
    return settingsConfig.filter(section => 
      section.keywords.some(keyword => keyword.includes(term)) ||
      section.title.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  const fetchPreferences = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch company preferences
      const { data, error } = await supabase
        .from('company_estimate_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching preferences:', error);
        setIsLoading(false);
        return;
      }

      const prefs: Preferences = {
        invoiceGenerationMode: (data as any)?.invoice_generation_mode ?? 'manual',
        includeVisitsInReports: (data as any)?.include_visits_in_reports ?? false,
        enableCashKeptByEmployee: (data as any)?.enable_cash_kept_by_employee ?? true,
        autoGenerateCashReceipt: (data as any)?.auto_generate_cash_receipt ?? true,
        autoSendCashReceipt: (data as any)?.auto_send_cash_receipt ?? false,
      };
      
      setPreferences(prefs);
      setInitialPreferences(prefs);

      // Fetch user's default dashboard company preference
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('default_dashboard_company_id')
          .eq('id', user.id)
          .maybeSingle();
        
        const defaultId = profileData?.default_dashboard_company_id || null;
        setDefaultDashboardCompanyId(defaultId);
        setInitialDefaultDashboardCompanyId(defaultId);
      }
    } catch (err) {
      console.error('Error in fetchPreferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, user?.id]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  useEffect(() => {
    if (initialPreferences) {
      const companyPrefsChanged = 
        preferences.invoiceGenerationMode !== initialPreferences.invoiceGenerationMode ||
        preferences.includeVisitsInReports !== initialPreferences.includeVisitsInReports ||
        preferences.enableCashKeptByEmployee !== initialPreferences.enableCashKeptByEmployee ||
        preferences.autoGenerateCashReceipt !== initialPreferences.autoGenerateCashReceipt ||
        preferences.autoSendCashReceipt !== initialPreferences.autoSendCashReceipt;
      
      const dashboardPrefsChanged = defaultDashboardCompanyId !== initialDefaultDashboardCompanyId;
      
      setHasChanges(companyPrefsChanged || dashboardPrefsChanged);
    }
  }, [preferences, initialPreferences, defaultDashboardCompanyId, initialDefaultDashboardCompanyId]);

  const handleSave = async () => {
    if (!companyId) return;

    setIsSaving(true);
    try {
      // Save company preferences
      const { error: updateError } = await supabase
        .from('company_estimate_config')
        .update({
          invoice_generation_mode: preferences.invoiceGenerationMode,
          include_visits_in_reports: preferences.includeVisitsInReports,
          enable_cash_kept_by_employee: preferences.enableCashKeptByEmployee,
          auto_generate_cash_receipt: preferences.autoGenerateCashReceipt,
          auto_send_cash_receipt: preferences.autoSendCashReceipt,
        })
        .eq('company_id', companyId);

      if (updateError) {
        // If update fails, try insert
        const { error: insertError } = await supabase
          .from('company_estimate_config')
          .insert({
            company_id: companyId,
            invoice_generation_mode: preferences.invoiceGenerationMode,
            include_visits_in_reports: preferences.includeVisitsInReports,
            enable_cash_kept_by_employee: preferences.enableCashKeptByEmployee,
            auto_generate_cash_receipt: preferences.autoGenerateCashReceipt,
            auto_send_cash_receipt: preferences.autoSendCashReceipt,
          });

        if (insertError) throw insertError;
      }

      // Save user's default dashboard company preference
      if (user?.id && defaultDashboardCompanyId !== initialDefaultDashboardCompanyId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ default_dashboard_company_id: defaultDashboardCompanyId })
          .eq('id', user.id);

        if (profileError) {
          console.error('Error saving dashboard preference:', profileError);
        } else {
          setInitialDefaultDashboardCompanyId(defaultDashboardCompanyId);
        }
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
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* No Results Message */}
      {filteredSections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No settings found matching "{searchTerm}"</p>
        </div>
      )}

      {/* Dashboard Settings */}
      {filteredSections.some(s => s.id === 'dashboard-settings') && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              Dashboard Settings
            </CardTitle>
            <CardDescription className="text-xs">
              Configure your dashboard startup preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex-1 pr-4">
                <Label htmlFor="default-company" className="text-sm font-medium">
                  Default Dashboard Company
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Select which company data will be displayed when you open the Dashboard.
                </p>
              </div>
              <Select 
                value={defaultDashboardCompanyId || ''} 
                onValueChange={(value) => setDefaultDashboardCompanyId(value || null)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select company" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {activeCompanies.map(company => (
                    <SelectItem key={company.id} value={company.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {company.company_code}
                        </span>
                        <span>{company.trade_name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Settings */}
      {filteredSections.some(s => s.id === 'invoice-settings') && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Invoice Generation
            </CardTitle>
            <CardDescription className="text-xs">
              Choose how invoices are generated when jobs are completed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  preferences.invoiceGenerationMode === 'automatic' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-muted-foreground/50'
                }`}
                onClick={() => setPreferences(prev => ({ ...prev, invoiceGenerationMode: 'automatic' }))}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    preferences.invoiceGenerationMode === 'automatic' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Automatic</h4>
                    <p className="text-xs text-muted-foreground">Generate on job completion</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Invoice is automatically created when a job is marked as completed.
                </p>
              </div>
              
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  preferences.invoiceGenerationMode === 'manual' 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border/50 hover:border-muted-foreground/50'
                }`}
                onClick={() => setPreferences(prev => ({ ...prev, invoiceGenerationMode: 'manual' }))}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${
                    preferences.invoiceGenerationMode === 'manual' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Manual</h4>
                    <p className="text-xs text-muted-foreground">Review before generating</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Completed jobs appear in "Completed Services" for admin review.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Settings */}
      {filteredSections.some(s => s.id === 'report-settings') && (
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
      )}

      {/* Cash Handling Settings */}
      {filteredSections.some(s => s.id === 'cash-handling') && (
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
      )}

      {/* Receipt Settings */}
      {filteredSections.some(s => s.id === 'receipt-settings') && (
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
                <Label htmlFor="auto-generate-receipt" className="text-sm font-medium cursor-pointer">
                  Auto-generate cash receipts on job completion
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, payment receipts will be automatically generated when a cash payment is recorded. 
                  When disabled, receipts can be generated manually from the Receipts page.
                </p>
              </div>
              <Switch
                id="auto-generate-receipt"
                checked={preferences.autoGenerateCashReceipt}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, autoGenerateCashReceipt: checked }))
                }
              />
            </div>
            <div className="flex items-start justify-between p-4 rounded-lg border border-border/50 bg-muted/30">
              <div className="flex-1 pr-4">
                <Label htmlFor="auto-send-receipt" className="text-sm font-medium cursor-pointer">
                  Auto-send cash receipts to clients
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, payment receipts will be automatically emailed to clients after being generated. 
                  When disabled, receipts can still be sent manually from the Receipts page.
                </p>
                {!preferences.autoGenerateCashReceipt && (
                  <div className="mt-2 p-2 bg-muted/50 rounded border border-border/30">
                    <p className="text-[10px] text-muted-foreground">
                      <strong>Note:</strong> Auto-send only works when auto-generate is enabled.
                    </p>
                  </div>
                )}
              </div>
              <Switch
                id="auto-send-receipt"
                checked={preferences.autoSendCashReceipt}
                onCheckedChange={(checked) => 
                  setPreferences(prev => ({ ...prev, autoSendCashReceipt: checked }))
                }
                disabled={!preferences.autoGenerateCashReceipt}
              />
            </div>
          </CardContent>
        </Card>
      )}

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
