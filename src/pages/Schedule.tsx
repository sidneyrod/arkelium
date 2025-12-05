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
  Users
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
  const [currentDate] = useState(new Date());
  const [showAddJob, setShowAddJob] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAbsenceRequest, setShowAbsenceRequest] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<ScheduledJob | null>(null);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('all');

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const filteredJobs = employeeFilter === 'all' 
    ? jobs 
    : jobs.filter(job => job.employeeId === employeeFilter);

  const uniqueEmployees = Array.from(new Set(jobs.map(j => ({ id: j.employeeId, name: j.employeeName }))))
    .filter((emp, index, self) => self.findIndex(e => e.id === emp.id) === index);

  const handleAddJob = (job: Omit<ScheduledJob, 'id'>) => {
    addJob(job);
    logActivity('job_created', `Job created for ${job.clientName}`, undefined, job.clientName);
    toast.success('Job scheduled successfully');
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

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
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

        <TabsContent value="calendar" className="space-y-6">
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
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.schedule.filterByEmployee} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.schedule.allEmployees}</SelectItem>
                  {uniqueEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" className="gap-2" onClick={handleSendSchedule}>
                <Send className="h-4 w-4" />
                {t.schedule.sendSchedule}
              </Button>

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
                        const dayJobs = filteredJobs.filter(j => j.time === time && dayIndex < 3);
                        return (
                          <div 
                            key={`${day}-${time}`} 
                            className="p-1 border-r border-border/30 last:border-r-0 min-h-[60px] hover:bg-muted/30 transition-colors cursor-pointer"
                          >
                            {dayJobs.map((job, idx) => dayIndex === idx && (
                              <div 
                                key={job.id}
                                className={cn(
                                  "p-2 rounded-lg border text-xs cursor-pointer transition-all hover:shadow-md",
                                  statusConfig[job.status].bgColor
                                )}
                                onClick={() => setSelectedJob(job)}
                              >
                                <p className="font-medium truncate">{job.clientName}</p>
                                <p className="text-muted-foreground mt-0.5">{job.duration}</p>
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

          {/* Timeline View */}
          {view === 'timeline' && (
            <div className="space-y-3">
              {filteredJobs.map((job) => {
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
                            <p className="font-medium">{job.clientName}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {job.address}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            {job.employeeName}
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
        </TabsContent>

        <TabsContent value="availability">
          <AvailabilityManager />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowAbsenceRequest(true)} className="gap-2">
              <CalendarOff className="h-4 w-4" />
              Request Absence
            </Button>
          </div>
          
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium">Absence Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {absenceRequests.length > 0 ? (
                <div className="space-y-3">
                  {absenceRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium">{request.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{request.startDate} - {request.endDate}</p>
                        <p className="text-sm text-muted-foreground mt-1">{request.reason}</p>
                      </div>
                      <Badge variant={
                        request.status === 'approved' ? 'default' :
                        request.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No absence requests</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      <Dialog open={!!selectedJob && !showCompletion} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t.job.details}</DialogTitle>
          </DialogHeader>
          
          {selectedJob && (
            <div className="space-y-6 mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedJob.clientName}</h3>
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
                    <p className="text-xs text-muted-foreground">{t.job.time}</p>
                    <p className="font-medium">{selectedJob.time} ({selectedJob.duration})</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t.job.assignedEmployee}</p>
                    <p className="font-medium">{selectedJob.employeeName}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  {t.job.serviceType}
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
                {selectedJob.status !== 'completed' && selectedJob.status !== 'cancelled' && (
                  <Button className="flex-1" onClick={() => setShowCompletion(true)}>
                    {t.job.completeJob}
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => handleEditJob(selectedJob)}>
                  {t.common.edit}
                </Button>
                <Button variant="destructive" onClick={() => setJobToDelete(selectedJob)}>
                  {t.common.delete}
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
          }
        }}
        onSave={editingJob ? handleUpdateJob : handleAddJob}
        job={editingJob || undefined}
      />

      {/* Job Completion Modal */}
      {selectedJob && (
        <JobCompletionModal
          open={showCompletion}
          onOpenChange={setShowCompletion}
          job={selectedJob}
          onComplete={handleCompleteJob}
        />
      )}

      {/* Absence Request Modal */}
      <AbsenceRequestModal
        open={showAbsenceRequest}
        onOpenChange={setShowAbsenceRequest}
        onSubmit={handleAbsenceRequest}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!jobToDelete}
        onOpenChange={() => setJobToDelete(null)}
        onConfirm={handleDeleteJob}
        title={t.common.confirmDelete}
        description={t.common.confirmDeleteDescription}
      />
    </div>
  );
};

export default Schedule;
