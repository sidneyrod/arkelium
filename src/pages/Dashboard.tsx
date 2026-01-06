import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/stat-card';
import AlertCard from '@/components/ui/alert-card';
import useRoleAccess from '@/hooks/useRoleAccess';
import { PeriodSelector, DateRange } from '@/components/ui/period-selector';
import { 
  Briefcase, 
  Users, 
  UserCircle, 
  DollarSign, 
  CreditCard, 
  Calendar,
  TrendingUp,
  BarChart3,
  Clock,
  CalendarCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';


interface DashboardStats {
  todayJobs: number;
  activeEmployees: number;
  activeClients: number;
  monthlyRevenue: number;
  pendingPayments: number;
  upcomingSchedule: number;
  // Cleaner-specific stats
  myTodayJobs: number;
  myWeekJobs: number;
  myCompletedJobs: number;
  myHoursThisWeek: number;
}

interface UpcomingJob {
  id: string;
  scheduled_date: string;
  start_time: string | null;
  client_name: string;
  address: string | null;
  status: string;
}

interface AlertStats {
  delayedJobs: number;
  pendingInvoices: number;
  scheduleConflicts: number;
  pendingOffRequests: number;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isCleaner, isAdminOrManager } = useRoleAccess();
  
  const [period, setPeriod] = useState<DateRange>({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  });
  
  const [stats, setStats] = useState<DashboardStats>({
    todayJobs: 0,
    activeEmployees: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    upcomingSchedule: 0,
    myTodayJobs: 0,
    myWeekJobs: 0,
    myCompletedJobs: 0,
    myHoursThisWeek: 0,
  });
  const [upcomingJobs, setUpcomingJobs] = useState<UpcomingJob[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({
    delayedJobs: 0,
    pendingInvoices: 0,
    scheduleConflicts: 0,
    pendingOffRequests: 0,
  });
  const [weeklyJobsData, setWeeklyJobsData] = useState([
    { name: 'Mon', jobs: 0 },
    { name: 'Tue', jobs: 0 },
    { name: 'Wed', jobs: 0 },
    { name: 'Thu', jobs: 0 },
    { name: 'Fri', jobs: 0 },
    { name: 'Sat', jobs: 0 },
    { name: 'Sun', jobs: 0 },
  ]);
  const [revenueData, setRevenueData] = useState([
    { name: 'Jan', revenue: 0 },
    { name: 'Feb', revenue: 0 },
    { name: 'Mar', revenue: 0 },
    { name: 'Apr', revenue: 0 },
    { name: 'May', revenue: 0 },
    { name: 'Jun', revenue: 0 },
  ]);

  const firstName = user?.profile?.first_name || '';
  const lastName = user?.profile?.last_name || '';
  const userName = firstName && lastName 
    ? `${firstName} ${lastName}` 
    : firstName || lastName || 'User';

  const fetchDashboardData = useCallback(async () => {
    if (!user?.profile?.company_id) return;

    const companyId = user.profile.company_id;
    const today = format(new Date(), 'yyyy-MM-dd');
    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    // Use selected period for revenue/payments filtering
    const periodStart = format(period.startDate, 'yyyy-MM-dd');
    const periodEnd = format(period.endDate, 'yyyy-MM-dd');

    try {
      // For cleaners: only fetch their own jobs
      if (isCleaner) {
        // Fetch cleaner's today jobs
        const { data: myTodayJobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('company_id', companyId)
          .eq('cleaner_id', user.id)
          .eq('scheduled_date', today);

        // Fetch cleaner's week jobs
        const { data: myWeekJobs } = await supabase
          .from('jobs')
          .select('id, duration_minutes, status')
          .eq('company_id', companyId)
          .eq('cleaner_id', user.id)
          .gte('scheduled_date', weekStart)
          .lte('scheduled_date', weekEnd);

        // Calculate hours worked this week (from completed jobs)
        const completedWeekJobs = myWeekJobs?.filter(j => j.status === 'completed') || [];
        const hoursThisWeek = completedWeekJobs.reduce((sum, job) => sum + (job.duration_minutes || 0), 0) / 60;

        // Fetch cleaner's upcoming jobs with details
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

        // Format upcoming jobs
        const formattedUpcoming: UpcomingJob[] = (myUpcomingJobsData || []).map((job: any) => ({
          id: job.id,
          scheduled_date: job.scheduled_date,
          start_time: job.start_time,
          client_name: job.clients?.name || 'Unknown',
          address: job.clients?.address || null,
          status: job.status,
        }));
        setUpcomingJobs(formattedUpcoming);

        setStats({
          todayJobs: myTodayJobs?.length || 0,
          activeEmployees: 0,
          activeClients: 0,
          monthlyRevenue: 0,
          pendingPayments: 0,
          upcomingSchedule: formattedUpcoming.length,
          myTodayJobs: myTodayJobs?.length || 0,
          myWeekJobs: myWeekJobs?.length || 0,
          myCompletedJobs: completedWeekJobs.length,
          myHoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
        });

        return;
      }

      // Admin/Manager: fetch all company data
      // Fetch today's jobs
      const { data: todayJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId)
        .eq('scheduled_date', today);

      // Fetch active employees (profiles with roles)
      const { data: employees } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', companyId);

      // Fetch active clients
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', companyId);

      // Fetch revenue from paid invoices using selected period
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', periodStart)
        .lte('paid_at', periodEnd);

      // Fetch pending payments
      const { data: pendingInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', companyId)
        .in('status', ['draft', 'sent']);

      // Fetch upcoming jobs
      const { data: upcomingJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId)
        .gte('scheduled_date', today)
        .eq('status', 'scheduled');

      // Fetch delayed jobs (scheduled in the past but not completed)
      const { data: delayedJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('company_id', companyId)
        .lt('scheduled_date', today)
        .eq('status', 'scheduled');

      // Fetch pending off requests
      const { data: pendingOffRequests } = await supabase
        .from('absence_requests')
        .select('id')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      // Calculate stats
      const monthlyRevenue = paidInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
      const pendingPayments = pendingInvoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

        setStats({
          todayJobs: todayJobs?.length || 0,
          activeEmployees: employees?.length || 0,
          activeClients: clients?.length || 0,
          monthlyRevenue,
          pendingPayments,
          upcomingSchedule: upcomingJobs?.length || 0,
          myTodayJobs: 0,
          myWeekJobs: 0,
          myCompletedJobs: 0,
          myHoursThisWeek: 0,
        });

      setAlertStats({
        delayedJobs: delayedJobs?.length || 0,
        pendingInvoices: pendingInvoices?.length || 0,
        scheduleConflicts: 0, // TODO: Implement conflict detection
        pendingOffRequests: pendingOffRequests?.length || 0,
      });

      // Fetch weekly jobs for chart
      const { data: weekJobs } = await supabase
        .from('jobs')
        .select('scheduled_date')
        .eq('company_id', companyId)
        .gte('scheduled_date', weekStart)
        .lte('scheduled_date', weekEnd);

      if (weekJobs) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const weeklyData = dayNames.map((name, index) => {
          const count = weekJobs.filter(job => {
            // Use safe date parsing to prevent timezone shift
            const jobDate = toSafeLocalDate(job.scheduled_date);
            return jobDate.getDay() === index;
          }).length;
          return { name, jobs: count };
        });
        // Reorder to start from Monday
        setWeeklyJobsData([...weeklyData.slice(1), weeklyData[0]]);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [user?.profile?.company_id, user?.id, isCleaner, period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigation handlers with smart filters
  const handleTodayJobsClick = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    navigate(`/schedule?view=day&date=${today}`);
  };

  const handleActiveEmployeesClick = () => {
    navigate('/users?filter=active&roles=cleaner,manager');
  };

  const handleActiveClientsClick = () => {
    navigate('/clients?status=active');
  };

  const handleMonthlyRevenueClick = () => {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    navigate(`/invoices?status=paid&from=${monthStart}&to=${monthEnd}`);
  };

  const handlePendingPaymentsClick = () => {
    navigate('/invoices?status=pending');
  };

  const handleUpcomingScheduleClick = () => {
    navigate('/schedule?view=week');
  };

  return (
    <div className="container px-4 lg:px-6 py-4 space-y-4">
      {/* Welcome Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight heading-primary">{t.dashboard.welcome}, {userName}</h1>
          <p className="text-sm label-secondary">{t.dashboard.subtitle}</p>
        </div>
        {isAdminOrManager && (
          <PeriodSelector value={period} onChange={setPeriod} />
        )}
      </div>

      {/* Stats Grid - Premium Cards with Color Variants */}
      {/* For cleaners: show only Today's Jobs and Upcoming Schedule */}
      {isCleaner ? (
        <div className="space-y-4">
          {/* Week Overview Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title={t.dashboard.todayJobs} 
              value={stats.todayJobs.toString()} 
              icon={Briefcase}
              variant="green"
              onClick={handleTodayJobsClick}
              tooltip="Click to view today's jobs"
            />
            <StatCard 
              title={t.dashboard.weekJobs || "Week Jobs"} 
              value={stats.myWeekJobs.toString()} 
              icon={CalendarCheck}
              variant="blue"
              onClick={handleUpcomingScheduleClick}
              tooltip="Total jobs scheduled this week"
            />
            <StatCard 
              title={t.dashboard.completedJobs || "Completed"} 
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
                <CardTitle className="text-base font-medium flex items-center gap-2 heading-secondary">
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
                          {/* Use safe date parsing to prevent timezone shift */}
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
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard 
            title={t.dashboard.todayJobs} 
            value={stats.todayJobs.toString()} 
            icon={Briefcase}
            variant="green"
            onClick={handleTodayJobsClick}
            tooltip="Click to view today's jobs in Schedule (Day view)"
          />
          <StatCard 
            title={t.dashboard.activeEmployees} 
            value={stats.activeEmployees.toString()} 
            icon={Users}
            variant="blue"
            onClick={handleActiveEmployeesClick}
            tooltip="Click to view active employees (Cleaners & Managers)"
          />
          <StatCard 
            title={t.dashboard.activeClients} 
            value={stats.activeClients.toString()} 
            icon={UserCircle}
            variant="purple"
            onClick={handleActiveClientsClick}
            tooltip="Click to view all active clients"
          />
          <StatCard 
            title={t.dashboard.monthlyRevenue}
            value={`$${stats.monthlyRevenue.toLocaleString()}`} 
            icon={DollarSign}
            variant="gold"
            onClick={handleMonthlyRevenueClick}
            tooltip="Click to view paid invoices for this month"
          />
          <StatCard 
            title={t.dashboard.pendingPayments} 
            value={`$${stats.pendingPayments.toLocaleString()}`} 
            icon={CreditCard}
            variant="orange"
            onClick={handlePendingPaymentsClick}
            tooltip="Click to view pending invoices"
          />
          <StatCard 
            title={t.dashboard.upcomingSchedule} 
            value={stats.upcomingSchedule.toString()} 
            icon={Calendar}
            variant="teal"
            onClick={handleUpcomingScheduleClick}
            tooltip="Click to view upcoming jobs in Schedule (Week view)"
          />
        </div>
      )}

      {/* Charts Row - Only for Admin/Manager */}
      {isAdminOrManager && (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* Jobs This Week */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 heading-secondary">
                <BarChart3 className="h-4 w-4 text-primary" />
                {t.dashboard.jobsThisWeek}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyJobsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="jobs" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Month */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2 heading-secondary">
                <TrendingUp className="h-4 w-4 text-primary" />
                {t.dashboard.revenueByMonth}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Section - Only for Admin/Manager */}
      {isAdminOrManager && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold heading-secondary">{t.dashboard.alerts}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AlertCard 
              type="delayed" 
              title={t.dashboard.delayedJobs} 
              count={alertStats.delayedJobs} 
            />
            <AlertCard 
              type="invoice" 
              title={t.dashboard.pendingInvoices} 
              count={alertStats.pendingInvoices} 
            />
            <AlertCard 
              type="conflict" 
              title="Pending Off Requests" 
              count={alertStats.pendingOffRequests} 
            />
            <AlertCard 
              type="churn" 
              title={t.dashboard.scheduleConflicts} 
              count={alertStats.scheduleConflicts} 
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;