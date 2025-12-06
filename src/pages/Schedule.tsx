import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CalendarPlus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User,
  Calendar as CalendarIcon,
  List,
  CheckCircle,
  Camera,
  Send,
  CalendarOff,
  Users,
  Pencil,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useScheduleStore, JobStatus, ScheduledJob } from '@/stores/scheduleStore';
import { logActivity } from '@/stores/activityStore';
import AddJobModal from '@/components/modals/AddJobModal';
import JobCompletionModal from '@/components/modals/JobCompletionModal';
import AbsenceRequestModal from '@/components/modals/AbsenceRequestModal';
import AvailabilityManager from '@/components/schedule/AvailabilityManager';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';

type ViewType = 'day' | 'week' | 'month' | 'timeline';

const statusConfig: Record<JobStatus, { color: string; bgColor: string; label: string }> = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  'in-progress': { color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', label: 'In Progress' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
};

const Schedule = () => {
  const { t } = useLanguage();
  const { jobs, addJob, updateJob, deleteJob, completeJob, addAbsenceRequest, absenceRequests } = useScheduleStore();
  
  const [view, setView] = useState<ViewType>('week');
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddJob, setShowAddJob] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAbsenceRequest, setShowAbsenceRequest] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<ScheduledJob | null>(null);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const filteredJobs = employeeFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.employeeId === employeeFilter);

  const uniqueEmployees = Array.from(new Set(jobs.map(j => ({ id: j.employeeId, name: j.employeeName }))))
    .filter((emp, index, self) => self.findIndex(e => e.id === emp.id) === index);

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 1)));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 1)));
    }
  };

  // Get days for month view
  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // Get days for week view
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // Handle day click - opens AddJobModal with date pre-filled
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setShowAddJob(true);
  };

  const handleAddJob = (job: Omit<ScheduledJob, 'id'>) => {
    addJob(job);
    logActivity('job_created', `Job created for ${job.clientName}`, undefined, job.clientName);
    toast.success('Job scheduled successfully');
    setSelectedDate(null);
  };

  const handleEditJob = (job: ScheduledJob) => {
    setEditingJob(job);
    setSelectedJob(null);
  };

  const handleUpdateJob = (updatedJob: Omit<ScheduledJob, 'id'>) => {
    if (editingJob) {
      updateJob(editingJob.id, updatedJob);
      logActivity('job_updated', `Job updated for ${updatedJob.clientName}`, editingJob.id, updatedJob.clientName);
      toast.success('Job updated successfully');
      setEditingJob(null);
    }
  };

  const handleDeleteJob = () => {
    if (jobToDelete) {
      deleteJob(jobToDelete.id);
      logActivity('job_cancelled', `Job cancelled for ${jobToDelete.clientName}`, jobToDelete.id, jobToDelete.clientName);
      toast.success('Job deleted successfully');
      setJobToDelete(null);
      setSelectedJob(null);
    }
  };

  const handleCompleteJob = (jobId: string, afterPhoto?: string, notes?: string) => {
    completeJob(jobId, afterPhoto);
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      logActivity('job_completed', `Job completed for ${job.clientName}`, jobId, job.clientName);
    }
    toast.success(t.job.jobCompleted);
    setSelectedJob(null);
  };

  const handleAbsenceRequest = (request: { startDate: string; endDate: string; reason: string }) => {
    addAbsenceRequest({
      employeeId: 'current-user',
      employeeName: 'Current User',
      ...request,
    });
    logActivity('absence_requested', `Absence request submitted for ${request.startDate} - ${request.endDate}`);
    toast.success(t.schedule.absenceSubmitted);
  };

  const handleSendSchedule = () => {
    toast.success(t.schedule.scheduleSent);
  };

  // Get jobs for a specific date
  const getJobsForDate = (date: Date) => {
    return filteredJobs.filter(job => {
      const jobDate = new Date(job.date);
      return isSameDay(jobDate, date);
    });
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title={t.schedule.title}
        description={t.schedule.title}
        action={{
          label: t.schedule.addJob,
          icon: CalendarPlus,
          onClick: () => setShowAddJob(true),
        }}
      />

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {t.schedule.weeklyPlanner}
          </TabsTrigger>
          <TabsTrigger value="availability" className="gap-2">
            <Users className="h-4 w-4" />
            {t.schedule.availability}
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <CalendarOff className="h-4 w-4" />
            {t.schedule.absenceRequest}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 rounded-lg bg-card border border-border/50 min-w-[140px] text-center">
                <span className="font-medium">{format(currentDate, view === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}</span>
              </div>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="ml-2" onClick={goToToday}>
                {t.schedule.today}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder={t.schedule.filterByEmployee} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">{t.schedule.allEmployees}</SelectItem>
                  {uniqueEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" className="gap-2" onClick={handleSendSchedule}>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">{t.schedule.sendSchedule}</span>
              </Button>

              <div className="flex items-center rounded-lg border border-border/50 p-0.5">
                <Button 
                  variant={view === 'day' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setView('day')}
                  className="h-7 px-2"
                >
                  {t.schedule.day}
                </Button>
                <Button 
                  variant={view === 'week' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setView('week')}
                  className="h-7 px-2"
                >
                  {t.schedule.week}
                </Button>
                <Button 
                  variant={view === 'month' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setView('month')}
                  className="h-7 px-2"
                >
                  {t.schedule.month}
                </Button>
                <Button 
                  variant={view === 'timeline' ? 'secondary' : 'ghost'} 
                  size="sm"
                  onClick={() => setView('timeline')}
                  className="h-7 px-2"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Month View */}
          {view === 'month' && (
            <Card className="border-border/50">
              <CardContent className="p-0">
                {/* Header */}
                <div className="grid grid-cols-7 border-b border-border/50">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r border-border/50 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Days Grid */}
                <div className="grid grid-cols-7">
                  {getMonthDays().map((day, idx) => {
                    const dayJobs = getJobsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleDayClick(day)}
                        className={cn(
                          "min-h-[80px] p-1 border-r border-b border-border/30 last:border-r-0 cursor-pointer hover:bg-muted/30 transition-colors",
                          !isCurrentMonth && "bg-muted/20 text-muted-foreground",
                          isToday(day) && "bg-primary/5"
                        )}
                      >
                        <div className={cn(
                          "text-xs font-medium mb-1 h-5 w-5 flex items-center justify-center rounded-full",
                          isToday(day) && "bg-primary text-primary-foreground"
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-0.5">
                          {dayJobs.slice(0, 2).map((job) => (
                            <div
                              key={job.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer",
                                statusConfig[job.status].bgColor
                              )}
                            >
                              {job.clientName}
                            </div>
                          ))}
                          {dayJobs.length > 2 && (
                            <div className="text-[10px] text-muted-foreground px-1">
                              +{dayJobs.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Week View */}
          {view === 'week' && (
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-8 border-b border-border/50">
                  <div className="p-2 text-center text-sm text-muted-foreground border-r border-border/50">
                    <Clock className="h-4 w-4 mx-auto" />
                  </div>
                  {getWeekDays().map((day) => (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "p-2 text-center border-r border-border/50 last:border-r-0 cursor-pointer hover:bg-muted/30",
                        isToday(day) && "bg-primary/5"
                      )}
                      onClick={() => handleDayClick(day)}
                    >
                      <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                      <p className={cn(
                        "text-lg font-semibold mt-0.5",
                        isToday(day) && "text-primary"
                      )}>{format(day, 'd')}</p>
                    </div>
                  ))}
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b border-border/30 last:border-b-0">
                      <div className="p-2 text-xs text-muted-foreground border-r border-border/50 bg-muted/30">
                        {time}
                      </div>
                      {getWeekDays().map((day) => {
                        const dayJobs = getJobsForDate(day).filter(j => j.time === time);
                        return (
                          <div 
                            key={`${day.toISOString()}-${time}`} 
                            className="p-1 border-r border-border/30 last:border-r-0 min-h-[50px] hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => handleDayClick(day)}
                          >
                            {dayJobs.map((job) => (
                              <div 
                                key={job.id}
                                className={cn(
                                  "p-1.5 rounded border text-xs cursor-pointer transition-all hover:shadow-md",
                                  statusConfig[job.status].bgColor
                                )}
                                onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                              >
                                <p className="font-medium truncate">{job.clientName}</p>
                                <p className="text-muted-foreground text-[10px]">{job.duration}</p>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Day View */}
          {view === 'day' && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{format(currentDate, 'EEEE, MMMM d, yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeSlots.map((time) => {
                    const timeJobs = getJobsForDate(currentDate).filter(j => j.time === time);
                    return (
                      <div 
                        key={time} 
                        className="flex gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleDayClick(currentDate)}
                      >
                        <div className="w-16 text-sm text-muted-foreground shrink-0">{time}</div>
                        <div className="flex-1 space-y-1">
                          {timeJobs.map((job) => (
                            <div 
                              key={job.id}
                              className={cn(
                                "p-2 rounded border cursor-pointer",
                                statusConfig[job.status].bgColor
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                            >
                              <p className="font-medium text-sm">{job.clientName}</p>
                              <p className="text-xs text-muted-foreground">{job.address}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline View */}
          {view === 'timeline' && (
            <div className="space-y-2">
              {filteredJobs.length === 0 ? (
                <Card className="border-border/50">
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No jobs scheduled
                  </CardContent>
                </Card>
              ) : (
                filteredJobs.map((job) => {
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
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-lg font-semibold">{job.time}</p>
                              <p className="text-xs text-muted-foreground">{job.duration}</p>
                            </div>
                            <div className="h-10 w-px bg-border" />
                            <div>
                              <p className="font-medium text-sm">{job.clientName}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.address}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                              {job.employeeName}
                            </div>
                            <Badge className={cn("border text-xs", config.bgColor, config.color)}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* Status Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {Object.entries(statusConfig).map(([status, config]) => (
              <div key={status} className="flex items-center gap-1.5">
                <div className={cn("h-2.5 w-2.5 rounded-full", config.bgColor.split(' ')[0])} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityManager />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAbsenceRequest(true)} size="sm" className="gap-2">
              <CalendarOff className="h-4 w-4" />
              Request Absence
            </Button>
          </div>
          
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Absence Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {absenceRequests.length > 0 ? (
                <div className="space-y-2">
                  {absenceRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium text-sm">{request.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{request.startDate} - {request.endDate}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{request.reason}</p>
                      </div>
                      <Badge variant={
                        request.status === 'approved' ? 'default' :
                        request.status === 'rejected' ? 'destructive' : 'secondary'
                      } className="text-xs">
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6 text-sm">No absence requests</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob && !showCompletion} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">{t.job.details}</DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-4 mt-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{selectedJob.clientName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedJob.address}
                  </p>
                </div>
                <Badge className={cn("border", statusConfig[selectedJob.status].bgColor, statusConfig[selectedJob.status].color)}>
                  {statusConfig[selectedJob.status].label}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t.job.time}</p>
                    <p className="text-sm font-medium">{selectedJob.time} ({selectedJob.duration})</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t.job.assignedEmployee}</p>
                    <p className="text-sm font-medium">{selectedJob.employeeName}</p>
                  </div>
                </div>
              </div>

              {selectedJob.checklist && selectedJob.checklist.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    {t.job.checklist}
                  </h4>
                  <div className="space-y-1">
                    {selectedJob.checklist.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className={cn(
                          "h-4 w-4 rounded-full border-2 flex items-center justify-center",
                          item.completed ? "border-success bg-success" : "border-border"
                        )}>
                          {item.completed && <CheckCircle className="h-3 w-3 text-success-foreground" />}
                        </div>
                        <span className={item.completed ? "text-muted-foreground line-through" : ""}>{item.item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedJob.beforePhoto && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Camera className="h-4 w-4 text-primary" />
                    {t.dashboard.beforeAfter}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <img src={selectedJob.beforePhoto} alt="Before" className="rounded-lg w-full h-24 object-cover" />
                    {selectedJob.afterPhoto && (
                      <img src={selectedJob.afterPhoto} alt="After" className="rounded-lg w-full h-24 object-cover" />
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {selectedJob.status === 'scheduled' && (
                  <Button className="flex-1 gap-2" onClick={() => { setShowCompletion(true); }}>
                    <CheckCircle className="h-4 w-4" />
                    {t.job.completeJob}
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={() => handleEditJob(selectedJob)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-destructive hover:text-destructive"
                  onClick={() => setJobToDelete(selectedJob)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Job Modal */}
      <AddJobModal
        open={showAddJob || !!editingJob}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddJob(false);
            setEditingJob(null);
            setSelectedDate(null);
          }
        }}
        onSave={editingJob ? handleUpdateJob : handleAddJob}
        job={editingJob || undefined}
        preselectedDate={selectedDate}
      />

      {/* Job Completion Modal */}
      <JobCompletionModal
        open={showCompletion}
        onOpenChange={setShowCompletion}
        job={selectedJob}
        onComplete={handleCompleteJob}
      />

      {/* Absence Request Modal */}
      <AbsenceRequestModal
        open={showAbsenceRequest}
        onOpenChange={setShowAbsenceRequest}
        onSubmit={handleAbsenceRequest}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!jobToDelete}
        onOpenChange={() => setJobToDelete(null)}
        onConfirm={handleDeleteJob}
        title={t.common.confirmDelete}
        description={`Are you sure you want to delete the job for "${jobToDelete?.clientName}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Schedule;
