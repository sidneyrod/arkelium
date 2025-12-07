import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { DollarSign, Clock, Calendar, FileText, Download, CheckCircle, Settings, Building2, MapPin, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePayrollStore, PayrollPeriod, EmployeePayrollEntry, provincialOvertimeRules, provinceNames, CanadianProvince, PayPeriodType } from '@/stores/payrollStore';
import { logActivity } from '@/stores/activityStore';
import { useCompanyStore } from '@/stores/companyStore';
import { generatePayrollReportPdf, openPdfPreview, exportToCsv } from '@/utils/pdfGenerator';

const statusColors: Record<string, { label: string; variant: 'active' | 'pending' | 'completed' | 'inactive' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  'in-progress': { label: 'In Progress', variant: 'active' },
  approved: { label: 'Approved', variant: 'completed' },
  paid: { label: 'Paid', variant: 'completed' },
};

const Payroll = () => {
  const { t } = useLanguage();
  const { periods, defaultPayPeriod, defaultProvince, companySettings, setDefaultPayPeriod, setDefaultProvince, updateCompanySettings, approvePeriod, markAsPaid } = usePayrollStore();
  const { profile, branding } = useCompanyStore();
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');

  const currentPeriod = periods.find(p => p.status === 'pending' || p.status === 'in-progress');

  const handleApprove = (periodId: string) => {
    approvePeriod(periodId);
    logActivity('payroll_approved', 'Payroll period approved', periodId);
    toast.success(t.payroll.payrollApproved);
  };

  const handleMarkPaid = (periodId: string) => {
    markAsPaid(periodId);
    logActivity('payroll_paid', 'Payroll marked as paid', periodId);
    toast.success('Payroll marked as paid');
  };

  const handleExportPdf = (period: PayrollPeriod) => {
    const pdfHtml = generatePayrollReportPdf({
      periodStart: period.startDate,
      periodEnd: period.endDate,
      province: provinceNames[period.province],
      employees: period.entries.map(e => ({
        name: e.employeeName,
        regularHours: e.regularHours,
        overtimeHours: e.overtimeHours,
        grossPay: e.grossPay,
        netPay: e.netPay,
      })),
      totals: { hours: period.totalHours, gross: period.totalGross, net: period.totalNet },
    }, profile, branding);
    openPdfPreview(pdfHtml, `Payroll-${period.startDate}`);
  };

  const handleExportCsv = (period: PayrollPeriod) => {
    exportToCsv(period.entries.map(e => ({
      Employee: e.employeeName, Role: e.role, 'Regular Hours': e.regularHours,
      'Overtime Hours': e.overtimeHours, 'Gross Pay': e.grossPay, 'Net Pay': e.netPay,
    })), `payroll-${period.startDate}`);
    toast.success('CSV exported successfully');
  };

  const periodColumns: Column<PayrollPeriod>[] = [
    { key: 'period', header: t.payroll.period, render: (p) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">{p.startDate} - {p.endDate}</p>
          <p className="text-xs text-muted-foreground">{p.entries.length} employees</p>
        </div>
      </div>
    )},
    { key: 'totalAmount', header: 'Total', render: (p) => <span className="font-semibold">${p.totalNet.toLocaleString()}</span> },
    { key: 'province', header: 'Province', render: (p) => <Badge variant="outline">{p.province}</Badge> },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge status={statusColors[p.status].variant} label={statusColors[p.status].label} /> },
  ];

  const employeeColumns: Column<EmployeePayrollEntry>[] = [
    { key: 'name', header: t.payroll.employee, render: (emp) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{emp.employeeName.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
        <div><span className="font-medium">{emp.employeeName}</span><p className="text-xs text-muted-foreground capitalize">{emp.role}</p></div>
      </div>
    )},
    { key: 'regularHours', header: t.payroll.regularHours, render: (emp) => <span>{emp.regularHours}h</span> },
    { key: 'overtime', header: t.payroll.overtime, render: (emp) => <span className={cn(emp.overtimeHours > 0 && "text-warning font-medium")}>{emp.overtimeHours}h</span> },
    { key: 'bonus', header: t.payroll.bonus, render: (emp) => <span className={cn(emp.bonus > 0 && "text-success font-medium")}>${emp.bonus}</span> },
    { key: 'deductions', header: t.payroll.deductions, render: (emp) => <span className="text-muted-foreground">-${emp.deductions}</span> },
    { key: 'netPay', header: t.payroll.netPay, render: (emp) => <span className="font-semibold text-primary">${emp.netPay.toLocaleString()}</span> },
  ];

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader title={t.payroll.title} description="Manage employee payroll and compensation">
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowSettings(true)}><Settings className="h-4 w-4" />Settings</Button>
          <Button variant="outline" className="gap-2" onClick={() => currentPeriod && handleExportCsv(currentPeriod)}><Download className="h-4 w-4" />{t.payroll.exportCsv}</Button>
        </div>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="h-6 w-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Current Period Total</p><p className="text-2xl font-bold">${currentPeriod?.totalNet.toLocaleString() || 0}</p></div></div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-info/10 flex items-center justify-center"><Clock className="h-6 w-6 text-info" /></div><div><p className="text-sm text-muted-foreground">Total Hours</p><p className="text-2xl font-bold">{currentPeriod?.totalHours || 0}h</p></div></div></CardContent></Card>
        <Card className="border-border/50"><CardContent className="pt-6"><div className="flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center"><CheckCircle className="h-6 w-6 text-success" /></div><div><p className="text-sm text-muted-foreground">Jobs Completed</p><p className="text-2xl font-bold">{currentPeriod?.entries.reduce((sum, e) => sum + e.jobsCompleted, 0) || 0}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList><TabsTrigger value="current">Current Period</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
        <TabsContent value="current" className="space-y-6">
          {currentPeriod ? (
            <Card className="border-border/50 border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />{currentPeriod.startDate} - {currentPeriod.endDate}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{currentPeriod.province} - OT after {provincialOvertimeRules[currentPeriod.province].weeklyThreshold}h/week</Badge>
                    <StatusBadge status={statusColors[currentPeriod.status].variant} label={statusColors[currentPeriod.status].label} />
                    {currentPeriod.status === 'pending' && <Button size="sm" onClick={() => handleApprove(currentPeriod.id)}>{t.payroll.approvePayroll}</Button>}
                    {currentPeriod.status === 'approved' && <Button size="sm" onClick={() => handleMarkPaid(currentPeriod.id)}>{t.payroll.paid}</Button>}
                  </div>
                </div>
              </CardHeader>
              <CardContent><DataTable columns={employeeColumns} data={currentPeriod.entries} emptyMessage={t.common.noData} /></CardContent>
            </Card>
          ) : <p className="text-center text-muted-foreground py-8">{t.common.noData}</p>}
        </TabsContent>
        <TabsContent value="history"><DataTable columns={periodColumns} data={periods.filter(p => p.status === 'paid')} onRowClick={setSelectedPeriod} emptyMessage={t.common.noData} /></TabsContent>
      </Tabs>

      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-3"><Calendar className="h-5 w-5 text-primary" />{selectedPeriod?.startDate} - {selectedPeriod?.endDate}</DialogTitle></DialogHeader>
          {selectedPeriod && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div><p className="text-sm text-muted-foreground">{t.payroll.totalAmount}</p><p className="text-2xl font-bold">${selectedPeriod.totalNet.toLocaleString()}</p></div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2" onClick={() => handleExportPdf(selectedPeriod)}><FileText className="h-4 w-4" />{t.payroll.exportPdf}</Button>
                  <Button variant="outline" className="gap-2" onClick={() => handleExportCsv(selectedPeriod)}><Download className="h-4 w-4" />{t.payroll.exportCsv}</Button>
                </div>
              </div>
              <DataTable columns={employeeColumns} data={selectedPeriod.entries} emptyMessage={t.common.noData} />
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                      <p className="text-xs text-muted-foreground">
                        {new Date().getFullYear()} rate (configure annually)
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        {new Date().getFullYear()} rate (1.4x employee rate)
                      </p>
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
