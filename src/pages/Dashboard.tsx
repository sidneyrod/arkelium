import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import StatCard from '@/components/ui/stat-card';
import AlertCard from '@/components/ui/alert-card';
import JobCard from '@/components/ui/job-card';
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

const weeklyJobsData = [
  { name: 'Mon', jobs: 0 },
  { name: 'Tue', jobs: 0 },
  { name: 'Wed', jobs: 0 },
  { name: 'Thu', jobs: 0 },
  { name: 'Fri', jobs: 0 },
  { name: 'Sat', jobs: 0 },
  { name: 'Sun', jobs: 0 },
];

const revenueData = [
  { name: 'Jan', revenue: 0 },
  { name: 'Feb', revenue: 0 },
  { name: 'Mar', revenue: 0 },
  { name: 'Apr', revenue: 0 },
  { name: 'May', revenue: 0 },
  { name: 'Jun', revenue: 0 },
];

const recentJobs: { client: string; address: string; time: string; employee: string; status: 'completed' | 'in-progress' | 'scheduled'; hasPhotos?: boolean }[] = [];

const Dashboard = () => {
  const { t } = useLanguage();
  const { user } = useAuth();

  const userName = user?.profile?.first_name || 'User';

  return (
    <div className="container px-6 lg:px-10 py-8 space-y-8">
      {/* Welcome Section */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.welcome}, {userName}</h1>
        <p className="text-muted-foreground">{t.dashboard.subtitle}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard 
          title={t.dashboard.todayJobs} 
          value="12" 
          icon={Briefcase}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard 
          title={t.dashboard.activeEmployees} 
          value="8" 
          icon={Users}
        />
        <StatCard 
          title={t.dashboard.activeClients} 
          value="142" 
          icon={UserCircle}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard 
          title={t.dashboard.monthlyRevenue} 
          value="$42,580" 
          icon={DollarSign}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard 
          title={t.dashboard.pendingPayments} 
          value="$8,240" 
          icon={CreditCard}
        />
        <StatCard 
          title={t.dashboard.upcomingSchedule} 
          value="28" 
          icon={Calendar}
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
            <button className="text-sm text-primary hover:underline">
              {t.dashboard.viewAll}
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentJobs.map((job, index) => (
              <JobCard key={index} {...job} />
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{t.dashboard.alerts}</h2>
          <div className="space-y-3">
            <AlertCard 
              type="delayed" 
              title={t.dashboard.delayedJobs} 
              count={3} 
            />
            <AlertCard 
              type="churn" 
              title={t.dashboard.churnRisk} 
              count={2} 
            />
            <AlertCard 
              type="invoice" 
              title={t.dashboard.pendingInvoices} 
              count={7} 
            />
            <AlertCard 
              type="conflict" 
              title={t.dashboard.scheduleConflicts} 
              count={1} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
