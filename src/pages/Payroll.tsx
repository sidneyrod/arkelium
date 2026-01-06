import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Clock, Calendar, FileText, Download, CheckCircle, Settings, Building2, MapPin, Percent, Play, RefreshCw, Banknote, AlertTriangle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePayrollStore, provincialOvertimeRules, provinceNames, CanadianProvince, PayPeriodType } from '@/stores/payrollStore';
import { usePayroll, PayrollPeriod, PayrollEntry } from '@/hooks/usePayroll';
import { PayrollNotification } from '@/components/payroll/PayrollNotification';
import { GeneratePayrollDialog } from '@/components/payroll/GeneratePayrollDialog';
import { logActivity } from '@/stores/activityStore';
import { useCompanyStore } from '@/stores/companyStore';
import { generatePayrollReportPdf, openPdfPreview, exportToCsv } from '@/utils/pdfGenerator';

interface CashPayment {
  id: string;
  cleaner_id: string;
  cleaner_name: string;
  client_name: string;
  job_id: string;
  service_date: string;
  amount: number;
  cash_handling: 'kept_by_cleaner' | 'delivered_to_office';
  compensation_status: string;
  notes: string | null;
}

const statusColors: Record<string, { label: string; variant: 'active' | 'pending' | 'completed' | 'inactive' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  'in-progress': { label: 'In Progress', variant: 'active' },
  approved: { label: 'Approved', variant: 'completed' },
  paid: { label: 'Paid', variant: 'completed' },
};

const Payroll = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { companySettings, setDefaultPayPeriod, setDefaultProvince, updateCompanySettings } = usePayrollStore();
  const { profile, branding } = useCompanyStore();
  
  // Use the new Supabase-integrated hook
  const {
    periods,
    currentPeriod,
    entries,
    employees,
    isLoading,
    isGenerating,
    fetchPeriods,
    generatePayrollPeriod,
    approvePeriod,
    markAsPaid,
    checkPeriodNotifications,
  } = usePayroll();

  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [notification, setNotification] = useState<{ periodEnded: boolean; daysOverdue: number } | null>(null);
  
  // Cash payments state
  const [cashPayments, setCashPayments] = useState<CashPayment[]>([]);
  const [loadingCashPayments, setLoadingCashPayments] = useState(false);

  // Fetch cash payments from cash_collections (approved only, for payroll compensation)
  const fetchCashPayments = useCallback(async () => {
    try {
      setLoadingCashPayments(true);
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        setLoadingCashPayments(false);
        return;
      }
      
      // Fetch from cash_collections: only approved items with kept_by_cleaner
      const { data, error } = await supabase
        .from('cash_collections')
        .select(`
          id,
          cleaner_id,
          client_id,
          job_id,
          service_date,
          amount,
          cash_handling,
          compensation_status,
          notes,
          cleaner:cleaner_id(first_name, last_name),
          client:client_id(name)
        `)
        .eq('company_id', companyId)
        .eq('cash_handling', 'kept_by_cleaner')
        .eq('compensation_status', 'approved')
        .is('payroll_period_id', null) // Not yet settled
        .order('service_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching cash payments:', error);
        setLoadingCashPayments(false);
        return;
      }
      
      const mapped: CashPayment[] = (data || []).map((p: any) => ({
        id: p.id,
        cleaner_id: p.cleaner_id,
        cleaner_name: p.cleaner 
          ? `${p.cleaner.first_name || ''} ${p.cleaner.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        client_name: p.client?.name || 'Unknown',
        job_id: p.job_id,
        service_date: p.service_date,
        amount: p.amount,
        cash_handling: p.cash_handling,
        compensation_status: p.compensation_status,
        notes: p.notes,
      }));
      
      setCashPayments(mapped);
      setLoadingCashPayments(false);
    } catch (error) {
      console.error('Error in fetchCashPayments:', error);
      setLoadingCashPayments(false);
    }
  }, [user]);

  // Settle cash payment (mark as settled and link to payroll period)
  const handleSettleCashPayment = async (paymentId: string, periodId?: string) => {
    try {
      const payment = cashPayments.find(p => p.id === paymentId);
      if (!payment) return;
      
      const { error } = await supabase
        .from('cash_collections')
        .update({
          compensation_status: 'settled',
          payroll_period_id: periodId || currentPeriod?.id || null,
        })
        .eq('id', paymentId);
      
      if (error) {
        console.error('Error settling cash payment:', error);
        toast.error('Failed to settle payment');
        return;
      }
      
      // Log activity
      logActivity(
        'cash_settled', 
        `Cash payment settled for ${payment.cleaner_name} - $${payment.amount.toFixed(2)}`, 
        paymentId
      );
      
      // Notify cleaner
      await notifyCleanerOfCashSettlement(payment.cleaner_id, payment.amount);
      
      toast.success(`Cash payment of $${payment.amount.toFixed(2)} marked as settled`);
      
      fetchCashPayments();
    } catch (error) {
      console.error('Error in handleSettleCashPayment:', error);
      toast.error('Failed to process payment');
    }
  };

  // Notify cleaner of cash settlement
  const notifyCleanerOfCashSettlement = async (cleanerId: string, amount: number) => {
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      if (!companyId) return;
      
      await supabase.from('notifications').insert({
        company_id: companyId,
        recipient_user_id: cleanerId,
        role_target: null,
        title: 'Cash Payment Settled',
        message: `Your cash payment of $${amount.toFixed(2)} has been deducted from your payroll`,
        type: 'payroll',
        severity: 'info',
        metadata: { amount }
      } as any);
    } catch (error) {
      console.error('Error notifying cleaner:', error);
    }
  };

  useEffect(() => {
    fetchCashPayments();
  }, [fetchCashPayments]);

  // Check for notifications
  useEffect(() => {
    const checkNotifications = async () => {
      const notif = await checkPeriodNotifications();
      setNotification(notif);
    };
    checkNotifications();
  }, [currentPeriod, checkPeriodNotifications]);

  const handleApprove = async (periodId: string) => {
    await approvePeriod(periodId);
    logActivity('payroll_approved', 'Payroll period approved', periodId);
  };

  const handleMarkPaid = async (periodId: string) => {
    await markAsPaid(periodId);
    logActivity('payroll_paid', 'Payroll marked as paid', periodId);
  };

  const handleGeneratePayroll = async (startDate: string, endDate: string) => {
    const period = await generatePayrollPeriod(startDate, endDate);
    if (period) {
      logActivity('payroll_created', 'Payroll period generated', period.id);
    }
  };

  const handleExportPdf = (period: PayrollPeriod) => {
    // Map entries to the expected format
    const mappedEntries = entries.map(e => ({
      name: e.employee ? `${e.employee.first_name} ${e.employee.last_name}` : 'Unknown',
      regularHours: e.regular_hours,
      overtimeHours: e.overtime_hours,
      grossPay: e.gross_pay,
      netPay: e.net_pay,
    }));

    const pdfHtml = generatePayrollReportPdf({
      periodStart: period.start_date,
      periodEnd: period.end_date,
      province: companySettings.primaryProvince ? provinceNames[companySettings.primaryProvince] : 'Ontario',
      employees: mappedEntries,
      totals: { hours: period.total_hours, gross: period.total_gross, net: period.total_net },
    }, profile, branding);
    openPdfPreview(pdfHtml, `Payroll-${period.start_date}`);
  };

  const handleExportCsv = (period: PayrollPeriod) => {
    const csvData = entries.map(e => ({
      Employee: e.employee ? `${e.employee.first_name} ${e.employee.last_name}` : 'Unknown',
      'Regular Hours': e.regular_hours,
      'Overtime Hours': e.overtime_hours,
      'Gross Pay': e.gross_pay,
      'Net Pay': e.net_pay,
    }));
    exportToCsv(csvData, `payroll-${period.start_date}`);
    toast.success('CSV exported successfully');
  };

  const periodColumns: Column<PayrollPeriod>[] = [
    { key: 'period', header: t.payroll.period, render: (p) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{p.start_date} - {p.end_date}</p>
          <p className="text-xs text-muted-foreground">{p.period_name}</p>
        </div>
      </div>
    )},
    { key: 'totalAmount', header: 'Total', render: (p) => <span className="font-semibold">${p.total_net?.toLocaleString() || 0}</span> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={statusColors[p.status]?.variant || 'pending'} label={statusColors[p.status]?.label || p.status} /> },
  ];

  const employeeColumns: Column<PayrollEntry>[] = [
    { key: 'name', header: t.payroll.employee, render: (emp) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {emp.employee ? `${emp.employee.first_name?.[0] || ''}${emp.employee.last_name?.[0] || ''}` : '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <span className="font-medium">
            {emp.employee ? `${emp.employee.first_name} ${emp.employee.last_name}` : 'Unknown'}
          </span>
          <p className="text-xs text-muted-foreground capitalize">{emp.employee?.employment_type || 'Employee'}</p>
        </div>
      </div>
    )},
    { key: 'regularHours', header: t.payroll.regularHours, render: (emp) => <span>{emp.regular_hours}h</span> },
    { key: 'overtime', header: t.payroll.overtime, render: (emp) => <span className={cn(emp.overtime_hours > 0 && "text-warning font-medium")}>{emp.overtime_hours}h</span> },
    { key: 'grossPay', header: 'Gross Pay', render: (emp) => <span>${emp.gross_pay?.toLocaleString() || 0}</span> },
    { key: 'deductions', header: t.payroll.deductions, render: (emp) => <span className="text-muted-foreground">-${(emp.cpp_deduction + emp.ei_deduction + emp.tax_deduction + emp.other_deductions).toFixed(2)}</span> },
    { key: 'netPay', header: t.payroll.netPay, render: (emp) => <span className="font-semibold text-primary">${emp.net_pay?.toLocaleString() || 0}</span> },
  ];

  if (isLoading) {
    return (
      <div className="container px-4 py-8 lg:px-8 space-y-8">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader title={t.payroll.title} description="Manage employee payroll and compensation">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => fetchPeriods()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button className="gap-2" onClick={() => setShowGenerateDialog(true)}>
            <Play className="h-4 w-4" />
            Generate Payroll
          </Button>
        </div>
      </PageHeader>

      {/* Notification for period end */}
      {notification?.periodEnded && currentPeriod && (
        <PayrollNotification
          periodEnded={notification.periodEnded}
          daysOverdue={notification.daysOverdue}
          periodName={currentPeriod.period_name}
          status={currentPeriod.status}
          onGenerateClick={() => setShowGenerateDialog(true)}
          onApproveClick={() => handleApprove(currentPeriod.id)}
          isGenerating={isGenerating}
        />
      )}

      {!currentPeriod && periods.length === 0 && (
        <PayrollNotification
          periodEnded={false}
          daysOverdue={0}
          periodName=""
          status="not_created"
          onGenerateClick={() => setShowGenerateDialog(true)}
          onApproveClick={() => {}}
          isGenerating={isGenerating}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Period Total</p>
                <p className="text-2xl font-bold">${currentPeriod?.total_net?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{currentPeriod?.total_hours || 0}h</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{entries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current">Current Period</TabsTrigger>
          <TabsTrigger value="cash">Cash Payments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="current" className="space-y-6">
          {currentPeriod ? (
            <Card className="border-border/50 border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    {currentPeriod.start_date} - {currentPeriod.end_date}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <StatusBadge 
                      status={statusColors[currentPeriod.status]?.variant || 'pending'} 
                      label={statusColors[currentPeriod.status]?.label || currentPeriod.status} 
                    />
                    {currentPeriod.status === 'pending' && (
                      <Button size="sm" onClick={() => handleApprove(currentPeriod.id)}>
                        {t.payroll.approvePayroll}
                      </Button>
                    )}
                    {currentPeriod.status === 'approved' && (
                      <Button size="sm" onClick={() => handleMarkPaid(currentPeriod.id)}>
                        {t.payroll.paid}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable columns={employeeColumns} data={entries} emptyMessage={t.common.noData} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No active payroll period</p>
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Play className="h-4 w-4 mr-2" />
                  Generate Payroll Period
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Cash Payments Tab - Shows APPROVED items ready for payroll settlement */}
        <TabsContent value="cash" className="space-y-6">
          <Card className="border-border/50 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" />
                  Approved Cash Payments for Payroll Deduction
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchCashPayments}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                These cash payments have been approved and are ready to be deducted from the cleaner's payroll. Click "Settle" to mark them as compensated.
              </p>
            </CardHeader>
            <CardContent>
              {loadingCashPayments ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : cashPayments.length > 0 ? (
                <div className="space-y-3">
                  {cashPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 rounded-lg border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                          <Banknote className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{payment.cleaner_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Client: {payment.client_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Service Date: {payment.service_date}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            💰 Cash kept by cleaner - ready for payroll deduction
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-lg">${payment.amount.toFixed(2)}</p>
                          <Badge variant="outline" className="text-xs border-primary text-primary">
                            <Check className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        </div>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="gap-1.5"
                          onClick={() => handleSettleCashPayment(payment.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Settle
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
                  <p className="text-muted-foreground">No approved cash payments pending settlement</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Approve cash collections in Payments & Collections first
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <DataTable 
            columns={periodColumns} 
            data={periods.filter(p => p.status === 'paid' || p.status === 'approved')} 
            onRowClick={setSelectedPeriod} 
            emptyMessage={t.common.noData}
          />
        </TabsContent>
      </Tabs>

      {/* Period Detail Dialog */}
      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              {selectedPeriod?.start_date} - {selectedPeriod?.end_date}
            </DialogTitle>
          </DialogHeader>
          {selectedPeriod && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">{t.payroll.totalAmount}</p>
                  <p className="text-2xl font-bold">${selectedPeriod.total_net?.toLocaleString() || 0}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => handleExportPdf(selectedPeriod)}>
                    <FileText className="h-4 w-4" />{t.payroll.exportPdf}
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => handleExportCsv(selectedPeriod)}>
                    <Download className="h-4 w-4" />{t.payroll.exportCsv}
                  </Button>
                </div>
              </div>
              <DataTable columns={employeeColumns} data={entries} emptyMessage={t.common.noData} />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Generate Payroll Dialog */}
      <GeneratePayrollDialog
        open={showGenerateDialog}
        onOpenChange={setShowGenerateDialog}
        onGenerate={handleGeneratePayroll}
        isGenerating={isGenerating}
        employeeCount={employees.length}
      />

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Payroll Settings
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={settingsTab} onValueChange={setSettingsTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="provinces" className="gap-2">
                <MapPin className="h-4 w-4" />
                Provinces
              </TabsTrigger>
              <TabsTrigger value="contributions" className="gap-2">
                <Percent className="h-4 w-4" />
                Contributions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 mt-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Pay Frequency</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.payroll.payPeriod}</Label>
                    <Select 
                      value={companySettings.payFrequency} 
                      onValueChange={(v: PayPeriodType) => {
                        updateCompanySettings({ payFrequency: v });
                        setDefaultPayPeriod(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">{t.payroll.weeklyPay}</SelectItem>
                        <SelectItem value="biweekly">{t.payroll.biweeklyPay}</SelectItem>
                        <SelectItem value="semimonthly">{t.payroll.semiMonthlyPay}</SelectItem>
                        <SelectItem value="monthly">{t.payroll.monthlyPay}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This determines how often employees are paid
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Default Vacation Pay (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="10"
                      step="0.5"
                      value={companySettings.vacationPayDefault}
                      onChange={(e) => updateCompanySettings({ vacationPayDefault: parseFloat(e.target.value) || 4 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 4% required in most provinces
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div className="space-y-0.5">
                      <Label>Statutory Holiday Pay</Label>
                      <p className="text-sm text-muted-foreground">Enable automatic holiday pay calculations</p>
                    </div>
                    <Switch
                      checked={companySettings.statutoryHolidayPayEnabled}
                      onCheckedChange={(checked) => updateCompanySettings({ statutoryHolidayPayEnabled: checked })}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="provinces" className="space-y-4 mt-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Primary Province</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.payroll.selectProvince}</Label>
                    <Select 
                      value={companySettings.primaryProvince} 
                      onValueChange={(v: CanadianProvince) => {
                        updateCompanySettings({ primaryProvince: v });
                        setDefaultProvince(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(provinceNames).map(([code, name]) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Main province for tax calculations and labor laws
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Overtime Rules - {provinceNames[companySettings.primaryProvince]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Daily Threshold</p>
                      <p className="text-lg font-semibold">
                        {provincialOvertimeRules[companySettings.primaryProvince].dailyThreshold === 24 
                          ? 'No daily OT' 
                          : `${provincialOvertimeRules[companySettings.primaryProvince].dailyThreshold}h`}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Weekly Threshold</p>
                      <p className="text-lg font-semibold">{provincialOvertimeRules[companySettings.primaryProvince].weeklyThreshold}h</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                      <p className="text-xs text-muted-foreground">Overtime Multiplier</p>
                      <p className="text-lg font-semibold">{provincialOvertimeRules[companySettings.primaryProvince].overtimeMultiplier}x regular rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="contributions" className="space-y-4 mt-4">
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Tax Configuration ({companySettings.taxConfig?.year || new Date().getFullYear()})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>CPP Employer Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        step="0.01"
                        value={companySettings.taxConfig?.cppEmployerRate || 5.95}
                        onChange={(e) => updateCompanySettings({ 
                          taxConfig: { 
                            ...companySettings.taxConfig, 
                            cppEmployerRate: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EI Employer Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.01"
                        value={companySettings.taxConfig?.eiEmployerRate || 2.21}
                        onChange={(e) => updateCompanySettings({ 
                          taxConfig: { 
                            ...companySettings.taxConfig, 
                            eiEmployerRate: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>CPP Max Contribution ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={companySettings.taxConfig?.cppMaxContribution || 3867.50}
                        onChange={(e) => updateCompanySettings({ 
                          taxConfig: { 
                            ...companySettings.taxConfig, 
                            cppMaxContribution: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>EI Max Contribution ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={companySettings.taxConfig?.eiMaxContribution || 1049.12}
                        onChange={(e) => updateCompanySettings({ 
                          taxConfig: { 
                            ...companySettings.taxConfig, 
                            eiMaxContribution: parseFloat(e.target.value) || 0 
                          } 
                        })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-sm font-medium text-primary mb-2">Annual Tax Configuration</p>
                    <p className="text-xs text-muted-foreground">
                      Update these rates annually based on CRA guidelines. These rates apply to employer 
                      cost estimation. Each employee's province setting determines their specific tax treatment.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
