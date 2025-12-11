import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
  Trash2,
  Mail,
  MessageSquare,
  Receipt,
  Loader2,
  Sparkles,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logActivity } from '@/stores/activityStore';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useCompanyStore } from '@/stores/companyStore';
import useRoleAccess from '@/hooks/useRoleAccess';
import AddJobModal from '@/components/modals/AddJobModal';
import JobCompletionModal, { PaymentData } from '@/components/modals/JobCompletionModal';
import OffRequestModal, { OffRequestType } from '@/components/modals/OffRequestModal';
import AvailabilityManager from '@/components/schedule/AvailabilityManager';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, addDays, subDays, parseISO } from 'date-fns';

type ViewType = 'day' | 'week' | 'month' | 'timeline';
type JobStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';

interface ScheduledJob {
  id: string;
  clientId: string;
  clientName: string;
  address: string;
  date: string;
  time: string;
  duration: string;
  employeeId: string;
  employeeName: string;
  status: JobStatus;
  services: string[];
  notes?: string;
  completedAt?: string;
  jobType?: 'cleaning' | 'visit';
  visitPurpose?: string;
  visitRoute?: string;
}

interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const statusConfig: Record<JobStatus, { color: string; bgColor: string; label: string }> = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  'in-progress': { color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', label: 'In Progress' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
};

// Generate 24-hour time slots
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const h24 = hour.toString().padStart(2, '0');
    const value = `${h24}:00`;
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const label = `${h12}:00 ${ampm}`;
    slots.push({ value, label });
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const Schedule = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addInvoice, getInvoiceByJobId } = useInvoiceStore();
  const { estimateConfig } = useCompanyStore();
  const { isCleaner, isAdminOrManager } = useRoleAccess();
  
  // Read URL params for initial state
  const urlView = searchParams.get('view') as ViewType | null;
  const urlDate = searchParams.get('date');
  
  const [view, setView] = useState<ViewType>(urlView || 'week');
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null);
  const [currentDate, setCurrentDate] = useState(() => {
    if (urlDate) {
      try {
        return parseISO(urlDate);
      } catch {
        return new Date();
      }
    }
    return new Date();
  });
  const [showAddJob, setShowAddJob] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [showAbsenceRequest, setShowAbsenceRequest] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<ScheduledJob | null>(null);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceGenerationMode, setInvoiceGenerationMode] = useState<'automatic' | 'manual'>('manual');
  
  // Update view and date when URL params change
  useEffect(() => {
    if (urlView && ['day', 'week', 'month', 'timeline'].includes(urlView)) {
      setView(urlView);
    }
    if (urlDate) {
      try {
        setCurrentDate(parseISO(urlDate));
      } catch {
        // Invalid date, ignore
      }
    }
  }, [urlView, urlDate]);

  // Fetch jobs from Supabase
  const fetchJobs = useCallback(async () => {
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
      
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          client_id,
          cleaner_id,
          scheduled_date,
          start_time,
          duration_minutes,
          status,
          job_type,
          notes,
          completed_at,
          visit_purpose,
          visit_route,
          clients(id, name),
          profiles:cleaner_id(id, first_name, last_name),
          client_locations(address, city)
        `)
        .eq('company_id', companyId)
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        console.error('Error fetching jobs:', error);
        setIsLoading(false);
        return;
      }
      
      const mappedJobs: ScheduledJob[] = (data || []).map((job: any) => {
        // Determine if this is a visit or cleaning job
        const isVisit = job.job_type === 'visit';
        
        return {
          id: job.id,
          clientId: job.client_id,
          clientName: job.clients?.name || 'Unknown',
          address: job.client_locations?.address 
            ? `${job.client_locations.address}${job.client_locations.city ? `, ${job.client_locations.city}` : ''}`
            : 'No address',
          date: job.scheduled_date,
          time: job.start_time?.slice(0, 5) || '09:00',
          duration: job.duration_minutes ? `${job.duration_minutes / 60}h` : '2h',
          employeeId: job.cleaner_id || '',
          employeeName: job.profiles 
            ? `${job.profiles.first_name || ''} ${job.profiles.last_name || ''}`.trim() || 'Unassigned'
            : 'Unassigned',
          status: job.status as JobStatus,
          services: isVisit ? ['Visit'] : [job.job_type || 'Standard Clean'],
          notes: job.notes,
          completedAt: job.completed_at,
          jobType: isVisit ? 'visit' : 'cleaning',
          visitPurpose: job.visit_purpose,
          visitRoute: job.visit_route,
        };
      });
      
      setJobs(mappedJobs);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchJobs:', error);
      setIsLoading(false);
    }
  }, [user]);

  // Fetch absence requests
  const fetchAbsenceRequests = useCallback(async () => {
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) return;
      
      const { data, error } = await supabase
        .from('absence_requests')
        .select(`
          id,
          cleaner_id,
          start_date,
          end_date,
          reason,
          status,
          created_at,
          profiles:cleaner_id(first_name, last_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching absence requests:', error);
        return;
      }
      
      const mappedRequests: AbsenceRequest[] = (data || []).map((req: any) => ({
        id: req.id,
        employeeId: req.cleaner_id,
        employeeName: req.profiles 
          ? `${req.profiles.first_name || ''} ${req.profiles.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown',
        startDate: req.start_date,
        endDate: req.end_date,
        reason: req.reason || '',
        status: req.status,
        createdAt: req.created_at,
      }));
      
      setAbsenceRequests(mappedRequests);
    } catch (error) {
      console.error('Error in fetchAbsenceRequests:', error);
    }
  }, [user]);

  // Fetch invoice generation mode setting
  const fetchInvoiceSettings = useCallback(async () => {
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) return;
      
      const { data } = await supabase
        .from('company_estimate_config')
        .select('invoice_generation_mode')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (data?.invoice_generation_mode) {
        setInvoiceGenerationMode(data.invoice_generation_mode as 'automatic' | 'manual');
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchAbsenceRequests();
      fetchInvoiceSettings();
    }
  }, [user, fetchJobs, fetchAbsenceRequests, fetchInvoiceSettings]);

  // For cleaners: only show their own jobs. For admin/manager: show all or filtered
  const baseJobs = isCleaner 
    ? jobs.filter(job => job.employeeId === user?.id)
    : jobs;
  
  const filteredJobs = employeeFilter === 'all' 
    ? baseJobs 
    : baseJobs.filter(job => job.employeeId === employeeFilter);

  const uniqueEmployees = Array.from(new Set(jobs.map(j => ({ id: j.employeeId, name: j.employeeName }))))
    .filter((emp, index, self) => self.findIndex(e => e.id === emp.id) === index);

  // Create cleaner payment entry based on their payment model
  const createCleanerPayment = async (
    job: ScheduledJob, 
    jobTotal: number, 
    hoursWorked: number,
    paymentData: PaymentData
  ) => {
    try {
      const companyId = user?.profile?.company_id;
      if (!companyId || !job.employeeId) return;
      
      // Fetch cleaner's payment model from profiles
      const { data: cleanerProfile } = await supabase
        .from('profiles')
        .select('payment_model, hourly_rate, fixed_amount_per_job, percentage_of_job_total')
        .eq('id', job.employeeId)
        .maybeSingle();
      
      if (!cleanerProfile) return;
      
      const paymentModel = cleanerProfile.payment_model || 'hourly';
      let amountDue = 0;
      
      // Calculate amount based on payment model
      switch (paymentModel) {
        case 'hourly':
          const hourlyRate = cleanerProfile.hourly_rate || 15;
          amountDue = hoursWorked * hourlyRate;
          break;
        case 'fixed':
          amountDue = cleanerProfile.fixed_amount_per_job || 50;
          break;
        case 'percentage':
          const percentage = cleanerProfile.percentage_of_job_total || 60;
          amountDue = jobTotal * (percentage / 100);
          break;
      }
      
      // Determine if cleaner already received cash
      const cashReceivedByCleaner = paymentData.paymentMethod === 'cash' && 
        paymentData.paymentReceivedBy === 'cleaner';
      
      // Create cleaner payment entry
      await supabase
        .from('cleaner_payments')
        .insert({
          company_id: companyId,
          cleaner_id: job.employeeId,
          job_id: job.id,
          service_date: job.date,
          payment_model: paymentModel,
          hours_worked: hoursWorked,
          hourly_rate: cleanerProfile.hourly_rate,
          job_total: jobTotal,
          percentage_rate: cleanerProfile.percentage_of_job_total,
          fixed_amount: cleanerProfile.fixed_amount_per_job,
          amount_due: amountDue,
          status: cashReceivedByCleaner ? 'cash_received' : 'pending',
          cash_received_by_cleaner: cashReceivedByCleaner,
          notes: cashReceivedByCleaner 
            ? `Cash received directly by cleaner from client` 
            : null,
        });
      
      console.log(`Cleaner payment created: $${amountDue.toFixed(2)} (${paymentModel})`);
    } catch (error) {
      console.error('Error creating cleaner payment:', error);
    }
  };

  // Navigation handlers
  const goToToday = () => setCurrentDate(new Date());
  
  const goToPrevious = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const getMonthDays = () => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  };

  // Handle time slot click - opens AddJobModal with date AND time pre-filled
  // Create a new Date at noon to avoid timezone issues
  const handleTimeSlotClick = (date: Date, time: string) => {
    // Create a new date at noon local time to avoid timezone issues
    const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    setSelectedDate(safeDate);
    setSelectedTime(time);
    setShowAddJob(true);
  };

  // Handle day click (without specific time)
  // Create a new Date at noon to avoid timezone issues
  const handleDayClick = (date: Date) => {
    // Create a new date at noon local time to avoid timezone issues
    const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    setSelectedDate(safeDate);
    setSelectedTime(null);
    setShowAddJob(true);
  };

  const handleAddJob = async (jobData: Omit<ScheduledJob, 'id'>) => {
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        toast.error('Unable to identify company');
        return;
      }
      
      // Parse duration to minutes
      const durationMatch = jobData.duration.match(/(\d+\.?\d*)/);
      const durationMinutes = durationMatch ? parseFloat(durationMatch[1]) * 60 : 120;
      
      // Determine job type - check if formData has jobType property
      const isVisit = (jobData as any).jobType === 'visit';
      
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          company_id: companyId,
          client_id: jobData.clientId,
          cleaner_id: jobData.employeeId || null,
          scheduled_date: jobData.date,
          start_time: jobData.time,
          duration_minutes: durationMinutes,
          status: 'scheduled',
          job_type: isVisit ? 'visit' : (jobData.services[0] || 'Standard Clean'),
          notes: jobData.notes,
          visit_purpose: isVisit ? (jobData as any).visitPurpose : null,
          visit_route: isVisit ? (jobData as any).visitRoute : null,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating job:', error);
        toast.error('Failed to create job');
        return;
      }
      
      logActivity('job_created', `Job created for ${jobData.clientName}`, undefined, jobData.clientName);
      toast.success('Job scheduled successfully');
      
      // Refresh jobs list
      await fetchJobs();
      
      setSelectedDate(null);
      setSelectedTime(null);
    } catch (error) {
      console.error('Error in handleAddJob:', error);
      toast.error('Failed to create job');
    }
  };

  const handleEditJob = (job: ScheduledJob) => {
    setEditingJob(job);
    setSelectedJob(null);
  };

  const handleUpdateJob = async (updatedJobData: Omit<ScheduledJob, 'id'>) => {
    if (!editingJob) return;
    
    try {
      const durationMatch = updatedJobData.duration.match(/(\d+\.?\d*)/);
      const durationMinutes = durationMatch ? parseFloat(durationMatch[1]) * 60 : 120;
      
      const { error } = await supabase
        .from('jobs')
        .update({
          client_id: updatedJobData.clientId,
          cleaner_id: updatedJobData.employeeId || null,
          scheduled_date: updatedJobData.date,
          start_time: updatedJobData.time,
          duration_minutes: durationMinutes,
          job_type: updatedJobData.services[0] || 'Standard Clean',
          notes: updatedJobData.notes,
        })
        .eq('id', editingJob.id);
      
      if (error) {
        console.error('Error updating job:', error);
        toast.error('Failed to update job');
        return;
      }
      
      logActivity('job_updated', `Job updated for ${updatedJobData.clientName}`, editingJob.id, updatedJobData.clientName);
      toast.success('Job updated successfully');
      
      await fetchJobs();
      setEditingJob(null);
    } catch (error) {
      console.error('Error in handleUpdateJob:', error);
      toast.error('Failed to update job');
    }
  };

  const handleDeleteJob = async () => {
    if (!jobToDelete) return;
    
    try {
      const companyId = user?.profile?.company_id;
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobToDelete.id)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Error deleting job:', error);
        toast.error('Failed to delete job');
        return;
      }
      
      logActivity('job_cancelled', `Job cancelled for ${jobToDelete.clientName}`, jobToDelete.id, jobToDelete.clientName);
      toast.success('Job deleted successfully');
      
      await fetchJobs();
      setJobToDelete(null);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error in handleDeleteJob:', error);
      toast.error('Failed to delete job');
    }
  };

  const handleCompleteJob = async (jobId: string, afterPhoto?: string, notes?: string, paymentData?: PaymentData) => {
    try {
      // Build update object with payment data if provided
      const updateData: Record<string, any> = {
        status: 'completed',
        completed_at: new Date().toISOString(),
      };
      
      // Add payment data if provided
      if (paymentData && paymentData.paymentMethod) {
        updateData.payment_method = paymentData.paymentMethod;
        updateData.payment_amount = paymentData.paymentAmount;
        updateData.payment_date = paymentData.paymentDate.toISOString();
        updateData.payment_reference = paymentData.paymentReference || null;
        updateData.payment_received_by = paymentData.paymentReceivedBy || null;
        updateData.payment_notes = paymentData.paymentNotes || null;
      }
      
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId);
      
      if (error) {
        console.error('Error completing job:', error);
        toast.error('Failed to complete job');
        return;
      }
      
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        logActivity('job_completed', `Job completed for ${job.clientName}`, jobId, job.clientName);
        
        // Skip invoice generation for Visit type jobs
        if (job.jobType === 'visit') {
          toast.success('Visit completed successfully');
          await fetchJobs();
          setSelectedJob(null);
          return;
        }
        
        // Only auto-generate invoice if mode is 'automatic'
        // If 'manual', job will appear in Completed Services screen for admin review
        if (invoiceGenerationMode === 'automatic') {
          const existingInvoice = getInvoiceByJobId(jobId);
          if (!existingInvoice) {
            const durationHours = parseFloat(job.duration.replace(/[^0-9.]/g, '')) || 2;
            const hourlyRate = estimateConfig.defaultHourlyRate || 35;
            const subtotal = durationHours * hourlyRate;
            const taxRate = estimateConfig.taxRate || 13;
            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;

            const invoice = addInvoice({
              clientId: job.clientId || crypto.randomUUID(),
              clientName: job.clientName,
              clientAddress: job.address,
              serviceAddress: job.address,
              jobId: jobId,
              cleanerName: job.employeeName,
              cleanerId: job.employeeId,
              serviceDate: job.date,
              serviceDuration: job.duration,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              lineItems: [
                {
                  id: crypto.randomUUID(),
                  description: `Cleaning Service - ${job.clientName}`,
                  quantity: durationHours,
                  unitPrice: hourlyRate,
                  total: subtotal
                }
              ],
              subtotal,
              taxRate,
              taxAmount,
              total,
              status: paymentData?.paymentMethod ? 'paid' : 'draft',
              notes: notes || ''
            });
            
            // Create cleaner payment entry automatically
            if (job.employeeId && paymentData?.paymentMethod) {
              await createCleanerPayment(job, total, durationHours, paymentData);
            }
            
            // If payment was recorded, update the invoice with payment info
            if (paymentData?.paymentMethod) {
              // Also save payment info to Supabase invoices table
              const { data: companyIdData } = await supabase.rpc('get_user_company_id');
              if (companyIdData) {
                await supabase
                  .from('invoices')
                  .insert({
                    company_id: companyIdData,
                    client_id: job.clientId,
                    cleaner_id: job.employeeId || null,
                    location_id: null,
                    job_id: jobId,
                    invoice_number: invoice.invoiceNumber,
                    subtotal,
                    tax_rate: taxRate,
                    tax_amount: taxAmount,
                    total,
                    status: 'paid',
                    service_date: job.date,
                    service_duration: job.duration,
                    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    notes: notes || '',
                    payment_method: paymentData.paymentMethod,
                    payment_amount: paymentData.paymentAmount,
                    payment_date: paymentData.paymentDate.toISOString(),
                    payment_reference: paymentData.paymentReference || null,
                    payment_received_by: paymentData.paymentReceivedBy || null,
                    payment_notes: paymentData.paymentNotes || null,
                    paid_at: new Date().toISOString(),
                  });
              }
              toast.success(`Invoice ${invoice.invoiceNumber} generated and marked as paid`);
            } else {
              toast.success(`Invoice ${invoice.invoiceNumber} generated`);
            }
          }
        } else {
          // Manual mode - job will appear in Completed Services
          toast.success('Job completed. Invoice can be generated from Completed Services.');
        }
      }
      
      toast.success(t.job.jobCompleted);
      await fetchJobs();
      setSelectedJob(null);
    } catch (error) {
      console.error('Error in handleCompleteJob:', error);
      toast.error('Failed to complete job');
    }
  };

  const handleAbsenceRequest = async (request: { startDate: string; endDate: string; reason: string; requestType?: string }) => {
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId || !user?.id) {
        toast.error('Unable to submit request');
        return;
      }
      
      const { error } = await supabase
        .from('absence_requests')
        .insert({
          company_id: companyId,
          cleaner_id: user.id,
          start_date: request.startDate,
          end_date: request.endDate,
          reason: request.reason,
          request_type: request.requestType || 'time_off',
          status: 'pending',
        });
      
      if (error) {
        console.error('Error submitting absence request:', error);
        toast.error('Failed to submit absence request');
        return;
      }
      
      logActivity('absence_requested', `Absence request submitted for ${request.startDate} - ${request.endDate}`);
      toast.success(t.schedule.absenceSubmitted);
      
      await fetchAbsenceRequests();
    } catch (error) {
      console.error('Error in handleAbsenceRequest:', error);
      toast.error('Failed to submit absence request');
    }
  };

  const handleSendSchedule = () => {
    toast.success(t.schedule.scheduleSent);
  };

  const handleViewInvoice = (job: ScheduledJob) => {
    const invoice = getInvoiceByJobId(job.id);
    if (invoice) {
      navigate(`/invoices?highlight=${invoice.id}`);
    } else {
      toast.error('No invoice found for this job');
    }
  };

  const handleSendInvoiceEmail = (job: ScheduledJob) => {
    const invoice = getInvoiceByJobId(job.id);
    if (invoice) {
      toast.success(`Invoice ${invoice.invoiceNumber} sent via email`);
    }
  };

  const handleSendInvoiceSms = (job: ScheduledJob) => {
    const invoice = getInvoiceByJobId(job.id);
    if (invoice) {
      toast.success(`Invoice ${invoice.invoiceNumber} sent via SMS`);
    }
  };

  const getJobsForDate = (date: Date) => {
    return filteredJobs.filter(job => {
      // Parse job.date as local date to avoid timezone shift
      // job.date is in format "YYYY-MM-DD"
      const [year, month, day] = job.date.split('-').map(Number);
      const jobDate = new Date(year, month - 1, day, 12, 0, 0);
      return isSameDay(jobDate, date);
    });
  };

  // Format time for display (AM/PM)
  const formatTimeDisplay = (time24: string) => {
    const slot = TIME_SLOTS.find(s => s.value === time24);
    return slot?.label || time24;
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title={t.schedule.title}
        action={isAdminOrManager ? {
          label: t.schedule.addJob,
          icon: CalendarPlus,
          onClick: () => setShowAddJob(true),
        } : undefined}
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
                <div className="grid grid-cols-7 border-b border-border/50">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-r border-border/50 last:border-r-0">
                      {day}
                    </div>
                  ))}
                </div>
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
                                "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer flex items-center gap-1",
                                job.jobType === 'visit' 
                                  ? "bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300" 
                                  : statusConfig[job.status].bgColor
                              )}
                            >
                              {job.jobType === 'visit' ? (
                                <Eye className="h-2.5 w-2.5 flex-shrink-0" />
                              ) : (
                                <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
                              )}
                              <span className="truncate">{job.clientName}</span>
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
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/50">
                  <div className="p-2 text-center text-sm text-muted-foreground border-r border-border/50 flex items-center justify-center">
                    <Clock className="h-4 w-4" />
                  </div>
                  {getWeekDays().map((day) => (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "p-2 text-center border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-muted/30",
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
                  {TIME_SLOTS.map((slot) => (
                    <div key={slot.value} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/20 last:border-b-0">
                      <div className="p-2 text-xs text-muted-foreground border-r border-border/30 bg-muted/20 flex items-start justify-center">
                        {slot.label}
                      </div>
                      {getWeekDays().map((day) => {
                        const dayJobs = getJobsForDate(day).filter(j => j.time === slot.value);
                        return (
                          <div 
                            key={`${day.toISOString()}-${slot.value}`} 
                            className="p-1 border-r border-border/20 last:border-r-0 min-h-[48px] hover:bg-muted/30 transition-colors cursor-pointer"
                            onClick={() => handleTimeSlotClick(day, slot.value)}
                          >
                            {dayJobs.map((job) => (
                              <div 
                                key={job.id}
                                className={cn(
                                  "p-1.5 rounded border text-xs cursor-pointer transition-all hover:shadow-md",
                                  job.jobType === 'visit' 
                                    ? "bg-purple-500/10 border-purple-500/30" 
                                    : statusConfig[job.status].bgColor
                                )}
                                onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                              >
                                <div className="flex items-center gap-1 mb-0.5">
                                  {job.jobType === 'visit' ? (
                                    <Eye className="h-3 w-3 text-purple-500" />
                                  ) : (
                                    <Sparkles className="h-3 w-3 text-primary" />
                                  )}
                                  <p className="font-medium truncate">{job.clientName}</p>
                                </div>
                                <p className="text-muted-foreground text-[10px] truncate">{job.employeeName}</p>
                                <span className={cn(
                                  "text-[9px] font-medium",
                                  job.jobType === 'visit' ? "text-purple-600 dark:text-purple-400" : "text-primary"
                                )}>
                                  {job.jobType === 'visit' ? 'Visit' : 'Service'}
                                </span>
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
                  {TIME_SLOTS.map((slot) => {
                    const timeJobs = getJobsForDate(currentDate).filter(j => j.time === slot.value);
                    return (
                      <div 
                        key={slot.value} 
                        className="flex gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleTimeSlotClick(currentDate, slot.value)}
                      >
                        <div className="w-20 text-sm text-muted-foreground shrink-0">{slot.label}</div>
                        <div className="flex-1 space-y-1">
                          {timeJobs.map((job) => (
                            <div 
                              key={job.id}
                              className={cn(
                                "p-2 rounded border cursor-pointer",
                                job.jobType === 'visit' 
                                  ? "bg-purple-500/10 border-purple-500/30" 
                                  : statusConfig[job.status].bgColor
                              )}
                              onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {job.jobType === 'visit' ? (
                                  <Eye className="h-4 w-4 text-purple-500" />
                                ) : (
                                  <Sparkles className="h-4 w-4 text-primary" />
                                )}
                                <p className="font-medium text-sm">{job.clientName}</p>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-1 py-0",
                                    job.jobType === 'visit' 
                                      ? "border-purple-500/30 text-purple-600 dark:text-purple-400" 
                                      : "border-primary/30 text-primary"
                                  )}
                                >
                                  {job.jobType === 'visit' ? 'Visit' : 'Service'}
                                </Badge>
                              </div>
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
                        job.jobType === 'visit' 
                          ? "border-l-purple-500"
                          : job.status === 'scheduled' ? "border-l-info"
                          : job.status === 'in-progress' ? "border-l-warning"
                          : job.status === 'completed' ? "border-l-success"
                          : "border-l-muted-foreground"
                      )}
                      onClick={() => setSelectedJob(job)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-center">
                              <p className="text-lg font-semibold">{formatTimeDisplay(job.time)}</p>
                              <p className="text-xs text-muted-foreground">{job.duration}</p>
                            </div>
                            <div className="h-10 w-px bg-border" />
                            <div>
                              <div className="flex items-center gap-2">
                                {job.jobType === 'visit' ? (
                                  <Eye className="h-4 w-4 text-purple-500" />
                                ) : (
                                  <Sparkles className="h-4 w-4 text-primary" />
                                )}
                                <p className="font-medium text-sm">{job.clientName}</p>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    job.jobType === 'visit' 
                                      ? "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400" 
                                      : "border-primary/30 bg-primary/10 text-primary"
                                  )}
                                >
                                  {job.jobType === 'visit' ? 'Visit' : 'Service'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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
            {/* Type Legend */}
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Service</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-muted-foreground">Visit</span>
            </div>
            <div className="h-4 w-px bg-border mx-1" />
            {/* Status Legend */}
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
                    <p className="text-sm font-medium">{formatTimeDisplay(selectedJob.time)} ({selectedJob.duration})</p>
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

              <div className="flex flex-wrap gap-2 pt-2">
                {selectedJob.status === 'scheduled' && (
                  <Button className="flex-1 gap-2" onClick={() => { setShowCompletion(true); }}>
                    <CheckCircle className="h-4 w-4" />
                    {t.job.completeJob}
                  </Button>
                )}
                
                {selectedJob.status === 'completed' && (
                  <>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleViewInvoice(selectedJob)}>
                      <Receipt className="h-4 w-4" />
                      View Invoice
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSendInvoiceEmail(selectedJob)}>
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSendInvoiceSms(selectedJob)}>
                      <MessageSquare className="h-4 w-4" />
                      SMS
                    </Button>
                  </>
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
            setSelectedTime(null);
          }
        }}
        onSave={editingJob ? handleUpdateJob : handleAddJob}
        job={editingJob || undefined}
        preselectedDate={selectedDate}
        preselectedTime={selectedTime}
      />

      {/* Job Completion Modal */}
      <JobCompletionModal
        open={showCompletion}
        onOpenChange={setShowCompletion}
        job={selectedJob}
        onComplete={handleCompleteJob}
      />

      {/* Off Request Modal */}
      <OffRequestModal
        open={showAbsenceRequest}
        onOpenChange={setShowAbsenceRequest}
        onSubmit={(data) => handleAbsenceRequest({ ...data, startDate: data.startDate, endDate: data.endDate, reason: data.reason })}
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
