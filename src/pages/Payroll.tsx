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
import { 
  DollarSign, 
  Clock, 
  Calendar, 
  FileText,
  Download,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayrollPeriod {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'processing' | 'closed';
  totalAmount: number;
  employeeCount: number;
}

interface EmployeePayroll {
  id: string;
  name: string;
  regularHours: number;
  overtime: number;
  bonus: number;
  deductions: number;
  netPay: number;
  jobsCompleted: number;
}

const mockPeriods: PayrollPeriod[] = [
  { id: '1', period: 'Dec 1-15, 2024', startDate: '2024-12-01', endDate: '2024-12-15', status: 'open', totalAmount: 12450, employeeCount: 8 },
  { id: '2', period: 'Nov 16-30, 2024', startDate: '2024-11-16', endDate: '2024-11-30', status: 'closed', totalAmount: 14280, employeeCount: 8 },
  { id: '3', period: 'Nov 1-15, 2024', startDate: '2024-11-01', endDate: '2024-11-15', status: 'closed', totalAmount: 13890, employeeCount: 7 },
];

const mockEmployeePayroll: EmployeePayroll[] = [
  { id: '1', name: 'Maria Garcia', regularHours: 80, overtime: 8, bonus: 150, deductions: 320, netPay: 2180, jobsCompleted: 24 },
  { id: '2', name: 'Ana Rodriguez', regularHours: 76, overtime: 4, bonus: 100, deductions: 290, netPay: 1960, jobsCompleted: 22 },
  { id: '3', name: 'John Davis', regularHours: 80, overtime: 12, bonus: 200, deductions: 380, netPay: 2540, jobsCompleted: 18 },
  { id: '4', name: 'Sophie Martin', regularHours: 60, overtime: 0, bonus: 0, deductions: 220, netPay: 1280, jobsCompleted: 15 },
  { id: '5', name: 'David Chen', regularHours: 80, overtime: 0, bonus: 0, deductions: 350, netPay: 2050, jobsCompleted: 0 },
];

const statusColors: Record<string, { label: string; variant: 'active' | 'pending' | 'completed' }> = {
  open: { label: 'Open', variant: 'active' },
  processing: { label: 'Processing', variant: 'pending' },
  closed: { label: 'Closed', variant: 'completed' },
};

const Payroll = () => {
  const { t } = useLanguage();
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);

  const periodColumns: Column<PayrollPeriod>[] = [
    {
      key: 'period',
      header: t.payroll.period,
      render: (period) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{period.period}</p>
            <p className="text-xs text-muted-foreground">{period.employeeCount} employees</p>
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      render: (period) => (
        <span className="font-semibold">${period.totalAmount.toLocaleString()}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (period) => (
        <StatusBadge 
          status={statusColors[period.status].variant} 
          label={statusColors[period.status].label}
        />
      ),
    },
  ];

  const employeeColumns: Column<EmployeePayroll>[] = [
    {
      key: 'name',
      header: t.payroll.employee,
      render: (emp) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {emp.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{emp.name}</span>
        </div>
      ),
    },
    {
      key: 'regularHours',
      header: t.payroll.regularHours,
      render: (emp) => <span>{emp.regularHours}h</span>,
    },
    {
      key: 'overtime',
      header: t.payroll.overtime,
      render: (emp) => (
        <span className={cn(emp.overtime > 0 && "text-warning font-medium")}>
          {emp.overtime}h
        </span>
      ),
    },
    {
      key: 'bonus',
      header: t.payroll.bonus,
      render: (emp) => (
        <span className={cn(emp.bonus > 0 && "text-success font-medium")}>
          ${emp.bonus}
        </span>
      ),
    },
    {
      key: 'deductions',
      header: t.payroll.deductions,
      render: (emp) => <span className="text-muted-foreground">-${emp.deductions}</span>,
    },
    {
      key: 'netPay',
      header: t.payroll.netPay,
      render: (emp) => <span className="font-semibold text-primary">${emp.netPay.toLocaleString()}</span>,
    },
  ];

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader 
        title={t.payroll.title}
        description="Manage employee payroll and compensation"
      >
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Period Total</p>
                <p className="text-2xl font-bold">${mockPeriods[0].totalAmount.toLocaleString()}</p>
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
                <p className="text-2xl font-bold">648h</p>
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
                <p className="text-sm text-muted-foreground">Jobs Completed</p>
                <p className="text-2xl font-bold">79</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Periods */}
      <Tabs defaultValue="current" className="space-y-6">
        <TabsList>
          <TabsTrigger value="current">Current Period</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          <Card className="border-border/50 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  {mockPeriods[0].period}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <StatusBadge status="active" label="Open" />
                  <Button size="sm">Process Payroll</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable 
                columns={employeeColumns}
                data={mockEmployeePayroll}
                emptyMessage={t.common.noData}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <DataTable 
            columns={periodColumns}
            data={mockPeriods.slice(1)}
            onRowClick={setSelectedPeriod}
            emptyMessage={t.common.noData}
          />
        </TabsContent>
      </Tabs>

      {/* Period Details Dialog */}
      <Dialog open={!!selectedPeriod} onOpenChange={() => setSelectedPeriod(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              {selectedPeriod?.period}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPeriod && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">{t.payroll.totalAmount}</p>
                  <p className="text-2xl font-bold">${selectedPeriod.totalAmount.toLocaleString()}</p>
                </div>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  View Report
                </Button>
              </div>

              <DataTable 
                columns={employeeColumns}
                data={mockEmployeePayroll}
                emptyMessage={t.common.noData}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Payroll;
