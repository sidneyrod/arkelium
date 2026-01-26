import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import useRoleAccess from '@/hooks/useRoleAccess';
import { PeriodSelector, DateRange, getDefaultDateRange } from '@/components/ui/period-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import KPICard from '@/components/dashboard/KPICard';
import RevenueTrendChart, { RevenuePoint } from '@/components/dashboard/RevenueTrendChart';
import OperationalDonut from '@/components/dashboard/OperationalDonut';
import AttentionCard from '@/components/dashboard/AttentionCard';
import StatCard from '@/components/ui/stat-card';
import {
  DollarSign,
  Clock,
  Briefcase,
  AlertTriangle,
  FileText,
  CalendarX,
  Calendar,
  CalendarCheck,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, parseISO, subMonths } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';

interface DashboardStats {
  revenueMTD: number;
  previousMonthRevenue: number;
  onTimePerformance: number;
  inProgressJobs: number;
  delayedJobs: number;
  criticalAlerts: number;
  pendingEvents: number;
  // Cleaner-specific stats
  myTodayJobs: number;
  myWeekJobs: number;
  myCompletedJobs: number;
  myHoursThisWeek: number;
}

interface OperationalData {
  completed: number;
  inProgress: number;
  delayed: number;
}

interface AlertStats {
  delayedJobs: number;
  pendingInvoicesAmount: number;
  scheduleConflicts: number;
}

interface UpcomingJob {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  client_name: string;
  address: string | null;
  status: string;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isCleaner, isAdminOrManager } = useRoleAccess();
  const { activeCompanyId } = useActiveCompanyStore();

  const [period, setPeriod] = useState<DateRange>(getDefaultDateRange());

  const [stats, setStats] = useState<DashboardStats>({
    revenueMTD: 0,
    previousMonthRevenue: 0,
    onTimePerformance: 0,
    inProgressJobs: 0,
    delayedJobs: 0,
    criticalAlerts: 0,
    pendingEvents: 0,
    myTodayJobs: 0,
    myWeekJobs: 0,
    myCompletedJobs: 0,
    myHoursThisWeek: 0,
  });

  const [operationalData, setOperationalData] = useState<OperationalData>({
    completed: 0,
    inProgress: 0,
    delayed: 0,
  });

  const [alertStats, setAlertStats] = useState<AlertStats>({
    delayedJobs: 0,
    pendingInvoicesAmount: 0,
    scheduleConflicts: 0,
  });

  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [sparklineData, setSparklineData] = useState<number[]>([]);
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!activeCompanyId) return;

    const companyId = activeCompanyId;
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    const periodStart = format(period.startDate, 'yyyy-MM-dd');
    const periodEnd = format(period.endDate, 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const prevMonthStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const prevMonthEnd = format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd');

    try {
      // For cleaners: only fetch their own jobs
      if (isCleaner && user) {
        const { data: myTodayJobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('company_id', companyId)
          .eq('cleaner_id', user.id)
          .eq('scheduled_date', today);

        const { data: myWeekJobs } = await supabase
          .from('jobs')
          .select('id, duration_minutes, status')
          .eq('company_id', companyId)
          .eq('cleaner_id', user.id)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd);

        const completedWeekJobs = myWeekJobs?.filter((j) => j.status === 'completed') || [];
        const hoursThisWeek = completedWeekJobs.reduce((sum, job) => sum + (job.duration_minutes || 0), 0) / 60;

        const { data: myUpcomingJobsData } = await supabase
          .from('jobs')
          .select(`
            id,
            scheduled_date,
            start_time,
            status,
            clients:client_id (name, address)
          `)
          .eq('company_id', companyId)
          .eq('cleaner_id', user.id)
          .gte('scheduled_date', today)
          .eq('status', 'scheduled')
          .order('scheduled_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        const formattedUpcoming: UpcomingJob[] = (myUpcomingJobsData || []).map((job: any) => ({
          id: job.id,
          scheduled_date: job.scheduled_date,
          start_time: job.start_time,
          client_name: job.clients?.name || 'Unknown',
          address: job.clients?.address || null,
          status: job.status,
        }));
        setUpcomingJobs(formattedUpcoming);

        setStats((prev) => ({
          ...prev,
          myTodayJobs: myTodayJobs?.length || 0,
          myWeekJobs: myWeekJobs?.length || 0,
          myCompletedJobs: completedWeekJobs.length,
          myHoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        }));

        return;
      }

      // Admin/Manager: fetch all company data
      // Revenue MTD
      const { data: paidInvoicesMTD } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', today);

      const revenueMTD = paidInvoicesMTD?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      // Previous month revenue for comparison
      const { data: prevMonthInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', prevMonthStart)
        .lte('paid_at', prevMonthEnd);

      const previousMonthRevenue = prevMonthInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      // Jobs status counts for operational distribution
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, status, scheduled_date')
        .eq('company_id', companyId)
        .gte('scheduled_date', periodStart)
        .lte('scheduled_date', periodEnd);

      const completedJobs = allJobs?.filter((j) => j.status === 'completed').length || 0;
      const inProgressJobs = allJobs?.filter((j) => j.status === 'in_progress').length || 0;
      const scheduledJobs = allJobs?.filter((j) => j.status === 'scheduled').length || 0;

      // Delayed jobs (scheduled in the past but not completed)
      const delayedJobs = allJobs?.filter(
        (j) => j.status === 'scheduled' && j.scheduled_date < today
      ).length || 0;

      // On-time performance calculation
      const totalCompleted = completedJobs;
      const onTimePerformance = totalCompleted > 0 ? Math.round(((totalCompleted - delayedJobs) / totalCompleted) * 100) : 0;

      // Critical alerts (pending off requests)
      const { data: pendingOffRequests } = await supabase
        .from('absence_requests')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      const criticalAlerts = pendingOffRequests?.length || 0;

      // Pending invoices amount
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', companyId)
        .in('status', ['draft', 'sent']);

      const pendingInvoicesAmount = pendingInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      setStats({
        revenueMTD,
        previousMonthRevenue,
        onTimePerformance: Math.min(100, Math.max(0, onTimePerformance)),
        inProgressJobs,
        delayedJobs,
        criticalAlerts,
        pendingEvents: criticalAlerts,
        myTodayJobs: 0,
        myWeekJobs: 0,
        myCompletedJobs: 0,
        myHoursThisWeek: 0,
      });

      setOperationalData({
        completed: completedJobs,
        inProgress: inProgressJobs + scheduledJobs,
        delayed: delayedJobs,
      });

      setAlertStats({
        delayedJobs,
        pendingInvoicesAmount,
        scheduleConflicts: 0,
      });

      // Generate revenue trend data (last 6 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      const revenuePoints: RevenuePoint[] = [];
      const sparklinePoints: number[] = [];

      for (let i = 5; i >= 0; i--) {
        const monthIndex = (currentMonth - i + 12) % 12;
        const year = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
        const monthStartDate = new Date(year, monthIndex, 1);
        const monthEndDate = new Date(year, monthIndex + 1, 0);

        const { data: monthInvoices } = await supabase
          .from('invoices')
          .select('total')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('paid_at', format(monthStartDate, 'yyyy-MM-dd'))
          .lte('paid_at', format(monthEndDate, 'yyyy-MM-dd'));

        const monthRevenue = monthInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
        const forecast = monthRevenue * (1 + Math.random() * 0.2 - 0.1); // Simulated forecast

        revenuePoints.push({
          month: monthNames[monthIndex],
          revenue: monthRevenue,
          forecast: Math.round(forecast),
        });

        sparklinePoints.push(monthRevenue);
      }

      setRevenueData(revenuePoints);
      setSparklineData(sparklinePoints);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [activeCompanyId, user?.id, isCleaner, period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigation handlers
  const handleRevenueClick = () => {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(new Date(), 'yyyy-MM-dd');
    navigate(`/invoices?status=paid&from=${monthStart}&to=${monthEnd}`);
  };

  const handleInProgressClick = () => {
    navigate('/schedule?filter=in_progress');
  };

  const handleDelayedJobsClick = () => {
    navigate('/schedule?filter=delayed');
  };

  const handlePendingInvoicesClick = () => {
    navigate('/invoices?status=pending');
  };

  const handleTodayJobsClick = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    navigate(`/schedule?view=day&date=${today}`);
  };

  const handleUpcomingScheduleClick = () => {
    navigate('/schedule?view=week');
  };

  // Calculate revenue trend percentage
  const revenueTrendPercent =
    stats.previousMonthRevenue > 0
      ? Math.round(((stats.revenueMTD - stats.previousMonthRevenue) / stats.previousMonthRevenue) * 100)
      : 0;

  // Cleaner Dashboard
  if (isCleaner) {
    return (
      <div className="p-4 space-y-4 bg-background min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        </div>

        {/* Week Overview Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t.dashboard.todayJobs}
            value={stats.myTodayJobs.toString()}
            icon={Briefcase}
            variant="green"
            onClick={handleTodayJobsClick}
            tooltip="Click to view today's jobs"
          />
          <StatCard
            title={t.dashboard.weekJobs || 'Week Jobs'}
            value={stats.myWeekJobs.toString()}
            icon={CalendarCheck}
            variant="blue"
            onClick={handleUpcomingScheduleClick}
            tooltip="Total jobs scheduled this week"
          />
          <StatCard
            title={t.dashboard.completedJobs || 'Completed'}
            value={stats.myCompletedJobs.toString()}
            icon={Briefcase}
            variant="purple"
            tooltip="Jobs completed this week"
          />
          <StatCard
            title={t.dashboard.hoursWorked}
            value={`${stats.myHoursThisWeek}h`}
            icon={Clock}
            variant="gold"
            tooltip="Hours worked this week"
          />
        </div>

        {/* Upcoming Jobs List */}
        {upcomingJobs.length > 0 && (
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {t.dashboard.upcomingSchedule}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navigate(`/schedule?view=day&date=${job.scheduled_date}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{job.client_name}</p>
                      {job.address && (
                        <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-sm font-medium">
                        {format(toSafeLocalDate(job.scheduled_date), 'EEE, MMM d')}
                      </p>
                      {job.start_time && (
                        <p className="text-xs text-muted-foreground">
                          {job.start_time.slice(0, 5)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUpcomingScheduleClick}
                className="w-full mt-4 text-sm text-primary hover:underline"
              >
                {t.dashboard.viewAll} →
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Admin/Manager Dashboard - Premium Enterprise Layout
  return (
    <div className="p-4 space-y-4 bg-[hsl(220_20%_98%)] min-h-screen">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* KPI Row - Exactly 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Revenue (MTD)"
          value={`$${stats.revenueMTD.toLocaleString()}`}
          trend={revenueTrendPercent !== 0 ? { value: revenueTrendPercent, isPositive: revenueTrendPercent > 0 } : undefined}
          sparklineData={sparklineData}
          onClick={handleRevenueClick}
        />
        <KPICard
          title="On-Time Performance"
          value={`${stats.onTimePerformance}%`}
          badge={
            stats.onTimePerformance >= 80
              ? { text: 'Good', variant: 'success' }
              : stats.onTimePerformance >= 60
              ? { text: 'Fair', variant: 'warning' }
              : { text: 'Low', variant: 'danger' }
          }
          subtitle={`Week span: ${format(startOfWeek(new Date()), 'd')}-${format(new Date(), 'd')}`}
          icon={Clock}
          iconColor="text-muted-foreground"
        />
        <KPICard
          title="In Progress"
          value={stats.inProgressJobs.toString()}
          warning={stats.delayedJobs > 0 ? { count: stats.delayedJobs, label: 'Delayed' } : undefined}
          icon={Briefcase}
          iconColor="text-warning"
          onClick={handleInProgressClick}
        />
        <KPICard
          title="Critical Alerts"
          value={stats.criticalAlerts.toString()}
          subtitle={`${stats.pendingEvents} Evt`}
          icon={AlertTriangle}
          iconColor={stats.criticalAlerts > 0 ? 'text-destructive' : 'text-muted-foreground'}
        />
      </div>

      {/* Charts Row - 70/30 Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <RevenueTrendChart data={revenueData} />
        <OperationalDonut data={operationalData} />
      </div>

      {/* Attention Required Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Attention Required
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AttentionCard
            icon={Clock}
            iconColor="text-warning"
            title="Delayed Jobs"
            value={alertStats.delayedJobs}
            ctaLabel="Review"
            ctaVariant="gold-outline"
            onClick={handleDelayedJobsClick}
          />
          <AttentionCard
            icon={FileText}
            iconColor="text-[#C9A84B]"
            title="Pending Invoices"
            value={`$${alertStats.pendingInvoicesAmount.toLocaleString()}`}
            ctaLabel="Bill Now"
            ctaVariant="gold"
            onClick={handlePendingInvoicesClick}
          />
          <AttentionCard
            icon={CalendarX}
            iconColor="text-destructive"
            title="Schedule Conflicts"
            value={alertStats.scheduleConflicts}
            ctaLabel="Resolve"
            ctaVariant="red-outline"
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
