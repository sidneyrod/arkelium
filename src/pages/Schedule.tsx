import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  CalendarPlus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  CheckCircle,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewType = 'day' | 'week' | 'month' | 'timeline';
type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

interface ScheduledJob {
  id: string;
  client: string;
  address: string;
  time: string;
  duration: string;
  employee: string;
  status: JobStatus;
  services: string[];
}

const mockJobs: ScheduledJob[] = [
  { id: '1', client: 'Sarah Mitchell', address: '245 Oak Street', time: '09:00', duration: '3h', employee: 'Maria G.', status: 'completed', services: ['Deep Clean'] },
  { id: '2', client: 'Thompson Corp', address: '890 Business Ave', time: '13:00', duration: '4h', employee: 'John D.', status: 'in-progress', services: ['Office Clean'] },
  { id: '3', client: 'Emily Chen', address: '112 Maple Drive', time: '14:00', duration: '2h', employee: 'Ana R.', status: 'scheduled', services: ['Standard Clean'] },
  { id: '4', client: 'Metro Office', address: '456 Tower Blvd', time: '16:00', duration: '3h', employee: 'David C.', status: 'scheduled', services: ['Daily Clean'] },
  { id: '5', client: 'Robert Johnson', address: '78 Pine Avenue', time: '10:00', duration: '2.5h', employee: 'Sophie M.', status: 'cancelled', services: ['Move-out Clean'] },
];

const statusConfig: Record<JobStatus, { color: string; bgColor: string; label: string }> = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  'in-progress': { color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', label: 'In Progress' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
};

const Schedule = () => {
  const { t } = useLanguage();
  const [view, setView] = useState<ViewType>('week');
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [currentDate] = useState(new Date());

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title={t.schedule.title}
        description="Manage your cleaning schedule and appointments"
        action={{
          label: t.schedule.addJob,
          icon: CalendarPlus,
          onClick: () => console.log('Add job'),
        }}
      />

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-4 py-2 rounded-lg bg-card border border-border/50">
            <span className="font-medium">December 2024</span>
          </div>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-2">
            {t.schedule.today}
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t.schedule.filterByEmployee} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              <SelectItem value="maria">Maria G.</SelectItem>
              <SelectItem value="john">John D.</SelectItem>
              <SelectItem value="ana">Ana R.</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-lg border border-border/50 p-1">
            <Button 
              variant={view === 'day' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('day')}
            >
              {t.schedule.day}
            </Button>
            <Button 
              variant={view === 'week' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('week')}
            >
              {t.schedule.week}
            </Button>
            <Button 
              variant={view === 'month' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('month')}
            >
              {t.schedule.month}
            </Button>
            <Button 
              variant={view === 'timeline' ? 'secondary' : 'ghost'} 
              size="sm"
              onClick={() => setView('timeline')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'week' && (
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-8 border-b border-border/50">
              <div className="p-3 text-center text-sm text-muted-foreground border-r border-border/50">
                <Clock className="h-4 w-4 mx-auto" />
              </div>
              {daysOfWeek.map((day, i) => (
                <div key={day} className={cn(
                  "p-3 text-center border-r border-border/50 last:border-r-0",
                  i === 0 && "bg-primary/5"
                )}>
                  <p className="text-sm font-medium">{day}</p>
                  <p className={cn(
                    "text-2xl font-semibold mt-1",
                    i === 0 && "text-primary"
                  )}>{2 + i}</p>
                </div>
              ))}
            </div>
            
            <div className="max-h-[500px] overflow-y-auto">
              {timeSlots.map((time) => (
                <div key={time} className="grid grid-cols-8 border-b border-border/30 last:border-b-0">
                  <div className="p-3 text-sm text-muted-foreground border-r border-border/50 bg-muted/30">
                    {time}
                  </div>
                  {daysOfWeek.map((day, dayIndex) => {
                    const job = mockJobs.find(j => j.time === time && dayIndex < 3);
                    return (
                      <div 
                        key={`${day}-${time}`} 
                        className="p-1 border-r border-border/30 last:border-r-0 min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer"
                      >
                        {job && dayIndex === 0 && (
                          <div 
                            className={cn(
                              "p-2 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-md",
                              statusConfig[job.status].bgColor
                            )}
                            onClick={() => setSelectedJob(job)}
                          >
                            <p className="font-medium truncate">{job.client}</p>
                            <p className="text-muted-foreground mt-0.5">{job.duration}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline View */}
      {view === 'timeline' && (
        <div className="space-y-3">
          {mockJobs.map((job) => {
            const config = statusConfig[job.status];
            return (
              <Card 
                key={job.id} 
                className={cn(
                  "border-l-4 cursor-pointer transition-all hover:shadow-md",
                  job.status === 'scheduled' && "border-l-info",
                  job.status === 'in-progress' && "border-l-warning",
                  job.status === 'completed' && "border-l-success",
                  job.status === 'cancelled' && "border-l-muted-foreground"
                )}
                onClick={() => setSelectedJob(job)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-semibold">{job.time}</p>
                        <p className="text-xs text-muted-foreground">{job.duration}</p>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div>
                        <p className="font-medium">{job.client}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {job.address}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        {job.employee}
                      </div>
                      <Badge className={cn("border", config.bgColor, config.color)}>
                        {config.label}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn("h-3 w-3 rounded-full", config.bgColor.split(' ')[0])} />
            <span className="text-muted-foreground">{config.label}</span>
          </div>
        ))}
      </div>

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.job.details}</DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6 mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedJob.client}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedJob.address}
                  </p>
                </div>
                <Badge className={cn("border", statusConfig[selectedJob.status].bgColor, statusConfig[selectedJob.status].color)}>
                  {statusConfig[selectedJob.status].label}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="font-medium">{selectedJob.time} ({selectedJob.duration})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="font-medium">{selectedJob.employee}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Services
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedJob.services.map((service, i) => (
                    <Badge key={i} variant="secondary">{service}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  {t.job.photos}
                </h4>
                <div className="flex gap-3">
                  <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {t.job.before}
                  </div>
                  <div className="h-24 w-24 rounded-lg bg-primary/10 flex items-center justify-center text-xs text-primary">
                    {t.job.after}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1">{t.job.completeJob}</Button>
                <Button variant="outline" className="flex-1">{t.job.generateInvoice}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Schedule;
