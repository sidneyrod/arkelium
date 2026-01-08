import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  Briefcase,
  TrendingUp,
  CalendarDays,
  Timer,
  Building2,
  Info
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, differenceInMinutes } from 'date-fns';

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

interface WorkSummary {
  totalHoursDaily: number;
  totalHoursWeekly: number;
  totalHoursBiweekly: number;
  totalHoursMonthly: number;
  jobsCompleted: number;
}

const CleanerPayroll = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<JobDetail[]>([]);
  const [summary, setSummary] = useState<WorkSummary>({
    totalHoursDaily: 0,
    totalHoursWeekly: 0,
    totalHoursBiweekly: 0,
    totalHoursMonthly: 0,
    jobsCompleted: 0,
  });

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
        jobsCompleted: completedJobs.length,
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching work summary data:', error);
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
      <div className="p-2 lg:p-3 space-y-2">
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
    <div className="p-2 lg:p-3 space-y-2">
      <PageHeader 
        title={t.payroll.myWorkSummary}
        description={t.payroll.myWorkSummaryDescription}
      />

      {/* Disclaimer Alert */}
      <Alert className="border-info/30 bg-info/5">
        <Info className="h-4 w-4 text-info" />
        <AlertDescription className="text-sm text-muted-foreground">
          {t.payroll.workSummaryDisclaimer}
        </AlertDescription>
      </Alert>

      {/* Hours Summary Cards */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
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

      {/* Completed Jobs This Month */}
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
                      
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-primary">
                            {formatHours(hours)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CleanerPayroll;
