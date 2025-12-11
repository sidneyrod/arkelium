import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Clock, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Briefcase,
  TrendingUp,
  FileText,
  Download,
  CalendarDays,
  Timer,
  Building2
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface JobDetail {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  status: string;
  client: {
    name: string;
  } | null;
  location: {
    address: string;
    city: string | null;
  } | null;
}

interface PayrollSummary {
  totalHoursDaily: number;
  totalHoursWeekly: number;
  totalHoursBiweekly: number;
  totalHoursMonthly: number;
  totalEarningsMonthly: number;
  jobsCompleted: number;
}

interface PayrollEntry {
  id: string;
  period_id: string;
  regular_hours: number;
  overtime_hours: number;
  gross_pay: number;
  net_pay: number;
  cpp_deduction: number;
  ei_deduction: number;
  tax_deduction: number;
  period: {
    start_date: string;
    end_date: string;
    period_name: string;
    status: string;
    pay_date: string | null;
  } | null;
}

const CleanerPayroll = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<PayrollSummary>({
    totalHoursDaily: 0,
    totalHoursWeekly: 0,
    totalHoursBiweekly: 0,
    totalHoursMonthly: 0,
    totalEarningsMonthly: 0,
    jobsCompleted: 0,
  });
  const [hourlyRate, setHourlyRate] = useState<number>(0);

  const calculateHoursFromJob = (job: JobDetail): number => {
    if (job.duration_minutes) {
      return job.duration_minutes / 60;
    }
    if (job.start_time && job.end_time) {
      const today = new Date().toISOString().split('T')[0];
      const start = new Date(`${today}T${job.start_time}`);
      const end = new Date(`${today}T${job.end_time}`);
      return differenceInMinutes(end, start) / 60;
    }
    return 0;
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');
      
      // Bi-weekly calculation (last 14 days)
      const biweeklyStart = format(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      // Fetch user's hourly rate
      const { data: profileData } = await supabase
        .from('profiles')
        .select('hourly_rate')
        .eq('id', user.id)
        .single();
      
      const rate = profileData?.hourly_rate || 0;
      setHourlyRate(rate);

      // Fetch completed jobs for this month
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          scheduled_date,
          start_time,
          end_time,
          duration_minutes,
          status,
          client:clients(name),
          location:client_locations(address, city)
        `)
        .eq('company_id', companyId)
        .eq('cleaner_id', user.id)
        .eq('status', 'completed')
        .gte('scheduled_date', monthStart)
        .lte('scheduled_date', monthEnd)
        .order('scheduled_date', { ascending: false });

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
      }

      const completedJobs = (jobsData || []) as unknown as JobDetail[];
      setJobs(completedJobs);

      // Calculate hours for different periods
      let dailyHours = 0;
      let weeklyHours = 0;
      let biweeklyHours = 0;
      let monthlyHours = 0;

      completedJobs.forEach(job => {
        const hours = calculateHoursFromJob(job);
        monthlyHours += hours;

        if (job.scheduled_date === today) {
          dailyHours += hours;
        }
        if (job.scheduled_date >= weekStart && job.scheduled_date <= weekEnd) {
          weeklyHours += hours;
        }
        if (job.scheduled_date >= biweeklyStart) {
          biweeklyHours += hours;
        }
      });

      setSummary({
        totalHoursDaily: dailyHours,
        totalHoursWeekly: weeklyHours,
        totalHoursBiweekly: biweeklyHours,
        totalHoursMonthly: monthlyHours,
        totalEarningsMonthly: monthlyHours * rate,
        jobsCompleted: completedJobs.length,
      });

      // Fetch payroll entries for this cleaner
      const { data: entriesData, error: entriesError } = await supabase
        .from('payroll_entries')
        .select(`
          id,
          period_id,
          regular_hours,
          overtime_hours,
          gross_pay,
          net_pay,
          cpp_deduction,
          ei_deduction,
          tax_deduction,
          period:payroll_periods(start_date, end_date, period_name, status, pay_date)
        `)
        .eq('company_id', companyId)
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (entriesError) {
        console.error('Error fetching payroll entries:', entriesError);
      }

      setPayrollEntries((entriesData || []) as unknown as PayrollEntry[]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching cleaner payroll data:', error);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (isLoading) {
    return (
      <div className="container px-4 py-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 lg:px-8 space-y-6">
      <PageHeader 
        title={t.payroll.myPayroll}
        description={t.payroll.myPayrollDescription}
      />

      {/* Hours Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Timer className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.today}
                </p>
                <p className="text-2xl font-bold">{formatHours(summary.totalHoursDaily)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.thisWeek}
                </p>
                <p className="text-2xl font-bold">{formatHours(summary.totalHoursWeekly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.biweekly}
                </p>
                <p className="text-2xl font-bold">{formatHours(summary.totalHoursBiweekly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.thisMonth}
                </p>
                <p className="text-2xl font-bold">{formatHours(summary.totalHoursMonthly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/50 border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.hourlyRate}
                </p>
                <p className="text-2xl font-bold">${hourlyRate.toFixed(2)}/h</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 border-l-4 border-l-success">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.monthlyEarnings}
                </p>
                <p className="text-2xl font-bold">${summary.totalEarningsMonthly.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 border-l-4 border-l-info">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t.payroll.servicesCompleted}
                </p>
                <p className="text-2xl font-bold">{summary.jobsCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">
            {t.payroll.jobDetails}
          </TabsTrigger>
          <TabsTrigger value="history">
            {t.payroll.payrollHistory}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Briefcase className="h-4 w-4" />
                {t.payroll.completedServicesThisMonth}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.payroll.noServicesThisMonth}
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((job) => {
                    const hours = calculateHoursFromJob(job);
                    const earnings = hours * hourlyRate;
                    
                    return (
                      <div 
                        key={job.id} 
                        className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {format(parseISO(job.scheduled_date), 'dd/MM/yyyy')}
                              </span>
                              {job.start_time && job.end_time && (
                                <span className="text-sm text-muted-foreground">
                                  {job.start_time.slice(0, 5)} - {job.end_time.slice(0, 5)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{job.client?.name || 'Unknown Client'}</span>
                            </div>
                            
                            {job.location && (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                  {job.location.address}
                                  {job.location.city && `, ${job.location.city}`}
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right space-y-1">
                            <div className="flex items-center gap-2 justify-end">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-primary">
                                {formatHours(hours)}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              ${earnings.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t.payroll.payrollHistory}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payrollEntries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.payroll.noPayrollHistory}
                </div>
              ) : (
                <div className="space-y-3">
                  {payrollEntries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {entry.period?.period_name || 'Unknown Period'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.period?.start_date} - {entry.period?.end_date}
                          </p>
                          <div className="flex items-center gap-3 text-sm">
                            <span>
                              {t.payroll.regular}: {entry.regular_hours}h
                            </span>
                            {entry.overtime_hours > 0 && (
                              <span className="text-warning">
                                {t.payroll.overtime}: {entry.overtime_hours}h
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1">
                          <Badge 
                            variant="outline"
                            className={cn(
                              entry.period?.status === 'paid' && "bg-success/10 text-success border-success/20",
                              entry.period?.status === 'approved' && "bg-primary/10 text-primary border-primary/20",
                              entry.period?.status === 'pending' && "bg-warning/10 text-warning border-warning/20"
                            )}
                          >
                            {entry.period?.status === 'paid' 
                              ? t.payroll.paid
                              : entry.period?.status === 'approved'
                                ? t.payroll.approved
                                : t.payroll.pending
                            }
                          </Badge>
                          <div className="flex flex-col items-end">
                            <span className="text-sm text-muted-foreground">
                              {t.payroll.grossPay}: ${entry.gross_pay.toFixed(2)}
                            </span>
                            <span className="font-semibold text-primary text-lg">
                              ${entry.net_pay.toFixed(2)}
                            </span>
                          </div>
                          {entry.period?.pay_date && (
                            <p className="text-xs text-muted-foreground">
                              {t.payroll.payDate}: {entry.period.pay_date}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CleanerPayroll;
