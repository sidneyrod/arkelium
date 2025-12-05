import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Clock, Calendar, FileText, Download, CheckCircle, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { usePayrollStore, PayrollPeriod, EmployeePayrollEntry, provincialOvertimeRules, CanadianProvince } from '@/stores/payrollStore';
import { logActivity } from '@/stores/activityStore';
import { useCompanyStore } from '@/stores/companyStore';
import { generatePayrollReportPdf, openPdfPreview, exportToCsv } from '@/utils/pdfGenerator';

const statusColors: Record<string, { label: string; variant: 'active' | 'pending' | 'completed' | 'inactive' }> = {
  pending: { label: 'Pending', variant: 'pending' },
  'in-progress': { label: 'In Progress', variant: 'active' },
  approved: { label: 'Approved', variant: 'completed' },
  paid: { label: 'Paid', variant: 'completed' },
};

const provinceNames: Record<CanadianProvince, string> = {
  ON: 'Ontario', QC: 'Quebec', BC: 'British Columbia', AB: 'Alberta',
  MB: 'Manitoba', SK: 'Saskatchewan', NS: 'Nova Scotia', NB: 'New Brunswick',
  NL: 'Newfoundland', PE: 'Prince Edward Island', NT: 'Northwest Territories',
  YT: 'Yukon', NU: 'Nunavut',
};

const Payroll = () => {
  const { t } = useLanguage();
  const { periods, defaultPayPeriod, defaultProvince, setDefaultPayPeriod, setDefaultProvince, approvePeriod, markAsPaid } = usePayrollStore();
  const { profile, branding } = useCompanyStore();
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t.settings.companyPreferences}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>{t.payroll.payPeriod}</Label><Select value={defaultPayPeriod} onValueChange={(v: any) => setDefaultPayPeriod(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">{t.payroll.weeklyPay}</SelectItem><SelectItem value="biweekly">{t.payroll.biweeklyPay}</SelectItem><SelectItem value="semimonthly">{t.payroll.semiMonthlyPay}</SelectItem><SelectItem value="monthly">{t.payroll.monthlyPay}</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>{t.payroll.selectProvince}</Label><Select value={defaultProvince} onValueChange={(v: any) => setDefaultProvince(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(provinceNames).map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}</SelectContent></Select></div>
            <Card className="border-border/50 bg-muted/30"><CardContent className="pt-4"><p className="text-sm font-medium mb-2">{t.payroll.overtimeRules} - {provinceNames[defaultProvince]}</p><p className="text-xs text-muted-foreground">{t.payroll.overtimeThreshold}: {provincialOvertimeRules[defaultProvince].weeklyThreshold}h</p><p className="text-xs text-muted-foreground">{t.payroll.overtimeMultiplier}: {provincialOvertimeRules[defaultProvince].overtimeMultiplier}x</p></CardContent></Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
