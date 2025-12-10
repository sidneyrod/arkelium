import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import StatCard from '@/components/ui/stat-card';
import AlertCard from '@/components/ui/alert-card';
import { 
  Briefcase, 
  Users, 
  UserCircle, 
  DollarSign, 
  CreditCard, 
  Calendar,
  TrendingUp,
  Clock,
  BarChart3
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
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface DashboardStats {
  todayJobs: number;
  activeEmployees: number;
  activeClients: number;
  monthlyRevenue: number;
  pendingPayments: number;
  upcomingSchedule: number;
}

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openTab } = useWorkspaceStore();
  
  const [stats, setStats] = useState<DashboardStats>({
    todayJobs: 0,
    activeEmployees: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    pendingPayments: 0,
    upcomingSchedule: 0,
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
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    try {
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

      // Fetch monthly revenue from paid invoices
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('total')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', monthStart)
        .lte('paid_at', monthEnd);

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
            const jobDay = new Date(job.scheduled_date).getDay();
            return jobDay === index;
          }).length;
          return { name, jobs: count };
        });
        // Reorder to start from Monday
        setWeeklyJobsData([...weeklyData.slice(1), weeklyData[0]]);
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  }, [user?.profile?.company_id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Navigation handlers with smart filters
  const handleTodayJobsClick = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    openTab(`/schedule?view=day&date=${today}`, 'Schedule', 'calendar');
    navigate(`/schedule?view=day&date=${today}`);
  };

  const handleActiveEmployeesClick = () => {
    openTab('/users?filter=active&roles=cleaner,manager', 'Users', 'users');
    navigate('/users?filter=active&roles=cleaner,manager');
  };

  const handleActiveClientsClick = () => {
    openTab('/clients?status=active', 'Clients', 'user-circle');
    navigate('/clients?status=active');
  };

  const handleMonthlyRevenueClick = () => {
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    openTab(`/invoices?status=paid&from=${monthStart}&to=${monthEnd}`, 'Invoices', 'file-text');
    navigate(`/invoices?status=paid&from=${monthStart}&to=${monthEnd}`);
  };

  const handlePendingPaymentsClick = () => {
    openTab('/invoices?status=pending', 'Invoices', 'file-text');
    navigate('/invoices?status=pending');
  };

  const handleUpcomingScheduleClick = () => {
    openTab('/schedule?view=week', 'Schedule', 'calendar');
    navigate('/schedule?view=week');
  };

  return (
    <div className="container px-6 lg:px-10 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.welcome}, {userName}</h1>
        <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>

      {/* Stats Grid - Interactive Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard 
          title={t.dashboard.todayJobs} 
          value={stats.todayJobs.toString()} 
          icon={Briefcase}
          onClick={handleTodayJobsClick}
          tooltip="Click to view today's jobs in Schedule (Day view)"
        />
        <StatCard 
          title={t.dashboard.activeEmployees} 
          value={stats.activeEmployees.toString()} 
          icon={Users}
          onClick={handleActiveEmployeesClick}
          tooltip="Click to view active employees (Cleaners & Managers)"
        />
        <StatCard 
          title={t.dashboard.activeClients} 
          value={stats.activeClients.toString()} 
          icon={UserCircle}
          onClick={handleActiveClientsClick}
          tooltip="Click to view all active clients"
        />
        <StatCard 
          title={t.dashboard.monthlyRevenue} 
          value={`$${stats.monthlyRevenue.toLocaleString()}`} 
          icon={DollarSign}
          onClick={handleMonthlyRevenueClick}
          tooltip="Click to view paid invoices for this month"
        />
        <StatCard 
          title={t.dashboard.pendingPayments} 
          value={`$${stats.pendingPayments.toLocaleString()}`} 
          icon={CreditCard}
          onClick={handlePendingPaymentsClick}
          tooltip="Click to view pending invoices"
        />
        <StatCard 
          title={t.dashboard.upcomingSchedule} 
          value={stats.upcomingSchedule.toString()} 
          icon={Calendar}
          onClick={handleUpcomingScheduleClick}
          tooltip="Click to view upcoming jobs in Schedule (Week view)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Jobs This Week */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
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
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
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

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Jobs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {t.dashboard.recentJobs}
            </h2>
          </div>
          <Card className="border-border/50">
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>{t.common.noData}</p>
              <p className="text-sm mt-1">Create jobs in Schedule to see them here</p>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t.dashboard.alerts}</h2>
          <div className="space-y-3">
            <AlertCard 
              type="delayed" 
              title={t.dashboard.delayedJobs} 
              count={0} 
            />
            <AlertCard 
              type="churn" 
              title={t.dashboard.churnRisk} 
              count={0} 
            />
            <AlertCard 
              type="invoice" 
              title={t.dashboard.pendingInvoices} 
              count={0} 
            />
            <AlertCard 
              type="conflict" 
              title={t.dashboard.scheduleConflicts} 
              count={0} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
