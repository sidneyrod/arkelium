import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  List,
  CheckCircle,
  Send,
  Pencil,
  Trash2,
  Mail,
  MessageSquare,
  Receipt,
  Loader2,
  Sparkles,
  Eye,
  Filter,
  Calculator,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { logActivity } from '@/stores/activityStore';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useCompanyStore } from '@/stores/companyStore';
import useRoleAccess from '@/hooks/useRoleAccess';
import AddJobDrawer from '@/components/schedule/AddJobDrawer';
import JobCompletionModal, { PaymentData } from '@/components/modals/JobCompletionModal';
import StartServiceModal from '@/components/modals/StartServiceModal';
import VisitCompletionModal, { VisitCompletionData } from '@/components/schedule/VisitCompletionModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import OverdueJobAlert from '@/components/schedule/OverdueJobAlert';
import { notifyJobCreated, notifyJobUpdated, notifyJobCancelled, notifyVisitCreated, notifyJobCompleted, notifyInvoiceGenerated } from '@/hooks/useNotifications';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, addDays, subDays, parseISO } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';
import { generatePaymentReceiptPdf, openPdfPreview } from '@/utils/pdfGenerator';

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
  paymentMethod?: string; // Track payment method for invoice vs receipt rules
  serviceDate?: string;
}


const statusConfig: Record<JobStatus, { color: string; bgColor: string; label: string }> = {
  scheduled: { color: 'text-info', bgColor: 'bg-info/10 border-info/20', label: 'Scheduled' },
  'in-progress': { color: 'text-warning', bgColor: 'bg-warning/10 border-warning/20', label: 'In Progress' },
  completed: { color: 'text-success', bgColor: 'bg-success/10 border-success/20', label: 'Completed' },
  cancelled: { color: 'text-muted-foreground', bgColor: 'bg-muted border-border', label: 'Cancelled' },
};

// Generate 24-hour time slots with 30-minute increments (matching AddJobModal)
const generateTimeSlots = () => {
  const slots: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const h24 = hour.toString().padStart(2, '0');
      const m = min.toString().padStart(2, '0');
      const value = `${h24}:${m}`;
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${h12}:${m} ${ampm}`;
      slots.push({ value, label });
    }
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
  const [showVisitCompletion, setShowVisitCompletion] = useState(false);
  const [showStartService, setShowStartService] = useState(false);
  const [jobToStart, setJobToStart] = useState<ScheduledJob | null>(null);
  
  const [jobToDelete, setJobToDelete] = useState<ScheduledJob | null>(null);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<'all' | 'cleaning' | 'visit'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');
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
          payment_method,
          payment_date,
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
          paymentMethod: job.payment_method || undefined,
          serviceDate: job.scheduled_date,
        };
      });
      
      setJobs(mappedJobs);
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchJobs:', error);
      setIsLoading(false);
    }
  }, [user]);

  const [autoSendCashReceipt, setAutoSendCashReceipt] = useState(false);
  
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
        .select('invoice_generation_mode, auto_send_cash_receipt')
        .eq('company_id', companyId)
        .maybeSingle();
      
      if (data?.invoice_generation_mode) {
        setInvoiceGenerationMode(data.invoice_generation_mode as 'automatic' | 'manual');
      }
      if (data?.auto_send_cash_receipt !== undefined) {
        setAutoSendCashReceipt(data.auto_send_cash_receipt);
      }
    } catch (error) {
      console.error('Error fetching invoice settings:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchJobs();
      fetchInvoiceSettings();
    }
  }, [user, fetchJobs, fetchInvoiceSettings]);

  // For cleaners: only show their own jobs. For admin/manager: show all or filtered
  const baseJobs = isCleaner 
    ? jobs.filter(job => job.employeeId === user?.id)
    : jobs;
  
  const filteredJobs = baseJobs.filter(job => {
    if (employeeFilter !== 'all' && job.employeeId !== employeeFilter) return false;
    if (serviceTypeFilter !== 'all' && job.jobType !== serviceTypeFilter) return false;
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    return true;
  });

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
        .select('payment_model, hourly_rate, fixed_amount_per_job, percentage_of_job_total, first_name, last_name')
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
      
      // Determine if cleaner received cash and their handling choice
      const cashReceivedByCleaner = paymentData.paymentMethod === 'cash' && 
        paymentData.paymentReceivedBy === 'cleaner';
      
      // Determine initial status based on cash handling
      let status = 'pending';
      let deductFromPayroll = false;
      
      if (cashReceivedByCleaner && paymentData.cashHandlingChoice) {
        if (paymentData.cashHandlingChoice === 'keep_cash') {
          status = 'pending_approval'; // Needs admin approval
          deductFromPayroll = true;
        } else if (paymentData.cashHandlingChoice === 'hand_to_admin') {
          status = 'pending_handover'; // Cleaner will deliver cash
        }
      }
      
      // Build notes based on handling choice
      let notes = '';
      if (cashReceivedByCleaner) {
        if (paymentData.cashHandlingChoice === 'keep_cash') {
          notes = 'Cleaner chose to keep cash - pending admin approval for payroll deduction';
        } else if (paymentData.cashHandlingChoice === 'hand_to_admin') {
          notes = 'Cleaner will hand over cash to admin';
        }
      }
      
      // Create cleaner payment entry
      const { data: paymentEntry } = await supabase
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
          status,
          cash_received_by_cleaner: cashReceivedByCleaner,
          cash_handling_choice: paymentData.cashHandlingChoice || null,
          admin_approval_status: cashReceivedByCleaner ? 'pending' : null,
          deduct_from_payroll: deductFromPayroll,
          notes,
        })
        .select('id')
        .single();
      
      // Send notification to admin if cleaner received cash
      if (cashReceivedByCleaner && paymentEntry?.id) {
        const cleanerName = `${cleanerProfile.first_name || ''} ${cleanerProfile.last_name || ''}`.trim() || 'Cleaner';
        const handlingText = paymentData.cashHandlingChoice === 'keep_cash' 
          ? 'wants to keep the cash (deduct from payroll)' 
          : 'will hand over the cash';
        
        await notifyCashPaymentPending(
          cleanerName,
          paymentData.paymentAmount,
          handlingText,
          paymentEntry.id
        );
      }
      
      console.log(`Cleaner payment created: $${amountDue.toFixed(2)} (${paymentModel}) - Status: ${status}`);
    } catch (error) {
      console.error('Error creating cleaner payment:', error);
    }
  };

  // Helper to notify admin about pending cash payment
  const notifyCashPaymentPending = async (
    cleanerName: string,
    amount: number,
    handlingText: string,
    paymentId: string
  ) => {
    try {
      const { data: companyId } = await supabase.rpc('get_user_company_id');
      if (!companyId) return;
      
      await supabase.from('notifications').insert({
        company_id: companyId,
        recipient_user_id: null,
        role_target: 'admin',
        title: 'Cash Payment Requires Approval',
        message: `${cleanerName} received $${amount.toFixed(2)} in cash and ${handlingText}`,
        type: 'payroll',
        severity: 'warning',
        metadata: { payment_id: paymentId, cleaner_name: cleanerName, amount }
      } as any);
    } catch (error) {
      console.error('Error creating cash payment notification:', error);
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
      
      logActivity('job_created', `Job created for ${jobData.clientName}`, data?.id, jobData.clientName);
      toast.success('Job scheduled successfully');
      
      // Send notification to the assigned cleaner
      if (jobData.employeeId) {
        const jobIsVisit = (jobData as any).jobType === 'visit';
        if (jobIsVisit) {
          await notifyVisitCreated(
            jobData.employeeId,
            (jobData as any).visitPurpose || 'Visit',
            jobData.date,
            jobData.address,
            data?.id || ''
          );
        } else {
          await notifyJobCreated(
            jobData.employeeId,
            jobData.clientName,
            jobData.date,
            jobData.time,
            jobData.address,
            data?.id || ''
          );
        }
      }
      
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
      
      // Send notification to the assigned cleaner if changed or still assigned
      if (updatedJobData.employeeId) {
        await notifyJobUpdated(
          updatedJobData.employeeId,
          updatedJobData.clientName,
          'Schedule updated',
          editingJob.id
        );
      }
      
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
      
      // Notify cleaner about job cancellation
      if (jobToDelete.employeeId) {
        await notifyJobCancelled(
          jobToDelete.employeeId,
          jobToDelete.clientName,
          jobToDelete.date,
          jobToDelete.id
        );
      }
      
      await fetchJobs();
      setJobToDelete(null);
      setSelectedJob(null);
    } catch (error) {
      console.error('Error in handleDeleteJob:', error);
      toast.error('Failed to delete job');
    }
  };

  // Open start service modal with before photo option
  const handleOpenStartService = (job: ScheduledJob) => {
    setJobToStart(job);
    setShowStartService(true);
    setSelectedJob(null);
  };

  // Handle starting a job (mark as in-progress) - called from StartServiceModal
  const handleStartJob = async (jobId: string, beforePhoto?: string) => {
    try {
      const companyId = user?.profile?.company_id;
      const job = jobs.find(j => j.id === jobId);
      
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'in-progress' })
        .eq('id', jobId)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Error starting job:', error);
        toast.error('Failed to start job');
        return;
      }
      
      logActivity('job_started', `Job started for ${job?.clientName || 'Unknown'}`, jobId, job?.clientName || '');
      toast.success('Job started successfully');
      
      await fetchJobs();
      setJobToStart(null);
    } catch (error) {
      console.error('Error in handleStartJob:', error);
      toast.error('Failed to start job');
    }
  };

  const createCashReceipt = async (
    job: ScheduledJob,
    paymentData: PaymentData,
    companyId: string
  ) => {
    try {
      // Fetch client data
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, name, email, address, city, postal_code, phone')
        .eq('id', job.clientId)
        .single();
      
      // Fetch company and branding
      const { data: companyData } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();
      
      const { data: brandingData } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();
      
      // Fetch config for tax rate
      const { data: configData } = await supabase
        .from('company_estimate_config')
        .select('tax_rate')
        .eq('company_id', companyId)
        .maybeSingle();
      
      const taxRate = configData?.tax_rate || 13;
      const subtotal = paymentData.paymentAmount;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;
      
      // Generate receipt number
      const receiptNumber = `REC-${format(new Date(), 'yyyyMMdd')}-${Date.now().toString().slice(-6)}`;
      
      // Generate receipt HTML
      const receiptData = {
        receiptNumber,
        clientName: clientData?.name || job.clientName,
        clientEmail: clientData?.email || '',
        clientPhone: clientData?.phone || '',
        clientAddress: clientData?.address || job.address,
        cleanerName: job.employeeName,
        serviceDate: job.date,
        serviceDescription: `Cleaning service - ${job.duration}`,
        paymentMethod: 'cash',
        amount: subtotal,
        taxAmount,
        total,
        notes: paymentData.paymentNotes,
      };
      
      const company = {
        companyName: companyData?.trade_name || '',
        legalName: companyData?.legal_name || '',
        address: companyData?.address || '',
        city: companyData?.city || '',
        province: companyData?.province || '',
        postalCode: companyData?.postal_code || '',
        phone: companyData?.phone || '',
        email: companyData?.email || '',
        website: companyData?.website || '',
        businessNumber: '',
        gstHstNumber: '',
      };
      
      const branding = {
        logoUrl: brandingData?.logo_url || null,
        primaryColor: brandingData?.primary_color || '#1a3d2e',
      };
      
      const receiptHtml = generatePaymentReceiptPdf(receiptData, company, branding);
      
      // Insert payment receipt
      const { error: receiptError } = await supabase
        .from('payment_receipts')
        .insert({
          company_id: companyId,
          job_id: job.id,
          client_id: job.clientId,
          cleaner_id: job.employeeId || null,
          receipt_number: receiptNumber,
          payment_method: 'cash',
          amount: subtotal,
          tax_amount: taxAmount,
          total,
          service_date: job.date,
          service_description: `Cleaning service - ${job.duration}`,
          receipt_html: receiptHtml,
          created_by: user?.id || null,
          notes: paymentData.paymentNotes || null,
        });
      
      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        return null;
      }
      
      console.log(`Cash receipt ${receiptNumber} created successfully`);
      return { receiptNumber, receiptHtml };
    } catch (error) {
      console.error('Error in createCashReceipt:', error);
      return null;
    }
  };
  
  const handleCompleteJob = async (jobId: string, afterPhoto?: string, notes?: string, paymentData?: PaymentData) => {
    // Close modal first to prevent reopening
    setShowCompletion(false);
    setSelectedJob(null);
    
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
        
        // Notify admin that job was completed
        await notifyJobCompleted(
          job.employeeName,
          job.clientName,
          jobId,
          paymentData?.paymentAmount,
          paymentData?.paymentMethod || undefined
        );
        
        // Handle cash payments - create receipt and cash collection record
        if (paymentData?.paymentMethod === 'cash') {
          const receipt = await createCashReceipt(job, paymentData, companyId);
          if (receipt) {
            toast.success(`Receipt ${receipt.receiptNumber} generated successfully`);
            
            // Create cleaner payment entry for cash
            if (job.employeeId) {
              const durationHours = parseFloat(job.duration.replace(/[^0-9.]/g, '')) || 2;
              await createCleanerPayment(job, paymentData.paymentAmount, durationHours, paymentData);
            }
            
            // Create cash collection record for tracking
            const cashHandling = paymentData.cashHandlingChoice === 'keep_cash' 
              ? 'kept_by_cleaner' 
              : 'delivered_to_office';
            
            const compensationStatus = cashHandling === 'kept_by_cleaner' 
              ? 'pending' 
              : 'not_applicable';
            
            const { data: insertedCashCollection } = await supabase.from('cash_collections').insert({
              company_id: companyId,
              job_id: jobId,
              cleaner_id: job.employeeId || user?.id,
              client_id: job.clientId,
              amount: paymentData.paymentAmount,
              cash_handling: cashHandling,
              handled_by_user_id: user?.id,
              compensation_status: compensationStatus,
              service_date: job.date,
              notes: paymentData.paymentNotes || null,
            } as any).select('id').single();
            
            // Log activity for cash handling
            logActivity(
              cashHandling === 'kept_by_cleaner' ? 'cash_kept_by_cleaner' as any : 'cash_delivered_to_office' as any,
              `Cash $${paymentData.paymentAmount.toFixed(2)} ${cashHandling === 'kept_by_cleaner' ? 'kept by cleaner' : 'delivered to office'}`,
              jobId,
              job.clientName
            );
            
            // Notify admin if cleaner is keeping cash (requires approval)
            if (cashHandling === 'kept_by_cleaner' && insertedCashCollection?.id) {
              const { notifyCashApprovalRequested } = await import('@/hooks/useNotifications');
              await notifyCashApprovalRequested(
                job.employeeName,
                job.clientName,
                paymentData.paymentAmount,
                insertedCashCollection.id
              );
            }
          }
          
          // Skip invoice generation for cash payments
          await fetchJobs();
          return;
        }
        
        // Skip invoice generation for Visit type jobs
        if (job.jobType === 'visit') {
          toast.success('Visit completed successfully');
          await fetchJobs();
          return;
        }
        
        // Only auto-generate invoice if mode is 'automatic' and NOT cash
        if (invoiceGenerationMode === 'automatic') {
          // Check if invoice already exists in Supabase
          const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('job_id', jobId)
            .eq('company_id', companyId)
            .maybeSingle();
          
          if (!existingInvoice) {
            const durationHours = parseFloat(job.duration.replace(/[^0-9.]/g, '')) || 2;
            
            // Fetch company config for accurate rates
            const { data: configData } = await supabase
              .from('company_estimate_config')
              .select('default_hourly_rate, tax_rate')
              .eq('company_id', companyId)
              .maybeSingle();
            
            const hourlyRate = configData?.default_hourly_rate || 35;
            const taxRate = configData?.tax_rate || 13;
            const subtotal = durationHours * hourlyRate;
            const taxAmount = subtotal * (taxRate / 100);
            const total = subtotal + taxAmount;
            
            // Generate unique invoice number
            const invoiceNumber = `INV-${format(new Date(), 'yyyyMMdd')}-${Date.now().toString().slice(-6)}`;
            
            // Create invoice in Supabase (source of truth)
            const { data: invoiceData, error: invoiceError } = await supabase
              .from('invoices')
              .insert({
                company_id: companyId,
                client_id: job.clientId,
                cleaner_id: job.employeeId || null,
                job_id: jobId,
                invoice_number: invoiceNumber,
                subtotal,
                tax_rate: taxRate,
                tax_amount: taxAmount,
                total,
                status: paymentData?.paymentMethod ? 'paid' : 'draft',
                service_date: job.date, // Use scheduled_date as source of truth
                service_duration: job.duration,
                due_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                notes: notes || '',
                payment_method: paymentData?.paymentMethod || null,
                payment_amount: paymentData?.paymentAmount || null,
                payment_date: paymentData?.paymentDate?.toISOString() || null,
                payment_reference: paymentData?.paymentReference || null,
                payment_received_by: paymentData?.paymentReceivedBy || null,
                payment_notes: paymentData?.paymentNotes || null,
                paid_at: paymentData?.paymentMethod ? new Date().toISOString() : null,
              })
              .select('id')
              .single();
            
            if (invoiceError) {
              console.error('Error creating invoice:', invoiceError);
              toast.error('Job completed, but failed to generate invoice');
            } else {
              // Create cleaner payment entry if payment was recorded
              if (job.employeeId && paymentData?.paymentMethod) {
                await createCleanerPayment(job, total, durationHours, paymentData);
              }
              
              // Notify admin about invoice generation
              await notifyInvoiceGenerated(
                invoiceNumber,
                job.clientName,
                total,
                invoiceData.id
              );
              
              if (paymentData?.paymentMethod) {
                toast.success(`Invoice ${invoiceNumber} generated and marked as paid`);
              } else {
                toast.success(`Invoice ${invoiceNumber} generated`);
              }
            }
          }
        } else {
          // Manual mode - job will appear in Completed Services
          toast.success('Job completed. Invoice can be generated from Completed Services.');
        }
      }
      
      toast.success(t.job.jobCompleted);
      await fetchJobs();
    } catch (error) {
      console.error('Error in handleCompleteJob:', error);
      toast.error('Failed to complete job');
    }
  };

  // Handle visit completion (no financial records)
  const handleCompleteVisit = async (jobId: string, data: VisitCompletionData) => {
    try {
      let companyId = user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        toast.error('Unable to complete visit');
        return;
      }
      
      const { error } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          visit_outcome: data.outcome,
          visit_notes: data.notes || null,
          visit_next_action: data.nextAction || null,
        })
        .eq('id', jobId)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Error completing visit:', error);
        toast.error('Failed to complete visit');
        return;
      }
      
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        logActivity('visit_completed', `Visit completed for ${job.clientName} - Outcome: ${data.outcome}`, jobId, job.clientName);
      }
      
      toast.success('Visit completed successfully');
      setShowVisitCompletion(false);
      setSelectedJob(null);
      await fetchJobs();
    } catch (error) {
      console.error('Error in handleCompleteVisit:', error);
      toast.error('Failed to complete visit');
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
      // Use safe date parsing helper to prevent timezone shift
      const jobDate = toSafeLocalDate(job.date);
      return isSameDay(jobDate, date);
    });
  };

  // Format time for display (AM/PM)
  const formatTimeDisplay = (time24: string) => {
    const slot = TIME_SLOTS.find(s => s.value === time24);
    return slot?.label || time24;
  };

  // Calculate end time from start time + duration
  const calculateEndTime = (startTime: string, duration: string): string => {
    const durationHours = parseFloat(duration.replace(/[^0-9.]/g, '')) || 2;
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + (durationHours * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  };

  // Convert time string to minutes for comparison
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Check if a job overlaps with a specific time slot
  const getJobsForTimeSlot = (date: Date, timeSlot: string): ScheduledJob[] => {
    const dayJobs = getJobsForDate(date);
    const slotMinutes = timeToMinutes(timeSlot);
    
    return dayJobs.filter(job => {
      const jobStartMinutes = timeToMinutes(job.time);
      const endTime = calculateEndTime(job.time, job.duration);
      const jobEndMinutes = timeToMinutes(endTime);
      // A job overlaps with a time slot if the job starts before or at slot start and ends after slot start
      return jobStartMinutes <= slotMinutes && jobEndMinutes > slotMinutes;
    });
  };

  // Get the row span for a job (how many 30-min slots it covers)
  const getJobRowSpan = (job: ScheduledJob): number => {
    const durationHours = parseFloat(job.duration.replace(/[^0-9.]/g, '')) || 2;
    return Math.ceil(durationHours * 2); // Each slot is 30 minutes, so 2 slots per hour
  };

  // Check if a job starts at a specific time slot
  const isJobStartingAt = (job: ScheduledJob, timeSlot: string): boolean => {
    return job.time === timeSlot;
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
      {/* Overdue Job Alert - For Admin/Manager and Cleaners */}
      <OverdueJobAlert />
      
      {/* Controls - Compact header with calendar navigation */}
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Service Type Filter */}
          <Select value={serviceTypeFilter} onValueChange={(v) => setServiceTypeFilter(v as 'all' | 'cleaning' | 'visit')}>
            <SelectTrigger className="w-[130px] h-9">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="cleaning">
                <span className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Cleaning
                </span>
              </SelectItem>
              <SelectItem value="visit">
                <span className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-purple-500" />
                  Visit
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Employee Filter */}
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="w-[150px] h-9">
              <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder={t.schedule.filterByEmployee} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">{t.schedule.allEmployees}</SelectItem>
              {uniqueEmployees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | JobStatus)}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

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

          {isAdminOrManager && (
            <Button onClick={() => setShowAddJob(true)} className="gap-2">
              <CalendarPlus className="h-4 w-4" />
              {t.schedule.addJob}
            </Button>
          )}
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
                                "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer flex flex-col gap-0.5 border",
                                job.jobType === 'visit' 
                                  ? "bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300" 
                                  : statusConfig[job.status].bgColor
                              )}
                            >
                              <div className="flex items-center gap-1">
                                {job.jobType === 'visit' ? (
                                  <Eye className="h-2.5 w-2.5 flex-shrink-0" />
                                ) : (
                                  <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
                                )}
                                <span className="truncate">{job.clientName}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] text-muted-foreground">{job.duration}</span>
                                <span className={cn(
                                  "text-[8px] font-medium uppercase",
                                  statusConfig[job.status].color
                                )}>
                                  {statusConfig[job.status].label}
                                </span>
                              </div>
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
                
                <div className="max-h-[400px] overflow-y-auto relative">
                  {TIME_SLOTS.map((slot, slotIndex) => (
                    <div key={slot.value} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border/20 last:border-b-0">
                      <div className="p-2 text-xs text-muted-foreground border-r border-border/30 bg-muted/20 flex items-start justify-center h-12">
                        {slot.label}
                      </div>
                      {getWeekDays().map((day) => {
                        // Get jobs that START at this time slot
                        const startingJobs = getJobsForDate(day).filter(j => isJobStartingAt(j, slot.value));
                        // Get jobs that SPAN this slot but started earlier
                        const spanningJobs = getJobsForTimeSlot(day, slot.value).filter(j => !isJobStartingAt(j, slot.value));
                        const hasSpanningJob = spanningJobs.length > 0;
                        
                        return (
                          <div 
                            key={`${day.toISOString()}-${slot.value}`} 
                            className={cn(
                              "border-r border-border/20 last:border-r-0 h-12 transition-colors relative",
                              isAdminOrManager && !hasSpanningJob && "hover:bg-muted/30 cursor-pointer",
                              hasSpanningJob && "bg-transparent pointer-events-none"
                            )}
                            onClick={() => isAdminOrManager && !hasSpanningJob && handleTimeSlotClick(day, slot.value)}
                          >
                            {startingJobs.map((job) => {
                              const rowSpan = getJobRowSpan(job);
                              const heightPx = rowSpan * 48; // 48px per slot (h-12)
                              const endTime = calculateEndTime(job.time, job.duration);
                              
                              return (
                                <div 
                                  key={job.id}
                                  className={cn(
                                    "absolute left-0 right-0 mx-1 p-1.5 rounded border text-xs cursor-pointer transition-all hover:shadow-md z-10",
                                    job.jobType === 'visit' 
                                      ? "bg-purple-500/10 border-purple-500/30" 
                                      : statusConfig[job.status].bgColor
                                  )}
                                  style={{ height: `${heightPx - 4}px`, top: 0 }}
                                  onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                >
                                  <div className="flex items-center gap-1 mb-0.5">
                                    {job.jobType === 'visit' ? (
                                      <Eye className="h-3 w-3 text-purple-500" />
                                    ) : (
                                      <Sparkles className="h-3 w-3 text-primary" />
                                    )}
                                    <p className="font-medium truncate text-[11px]">{job.clientName}</p>
                                  </div>
                                  <p className="text-muted-foreground text-[10px] truncate">
                                    {job.employeeName}
                                  </p>
                                  <p className="text-[9px] font-medium text-primary">
                                    {formatTimeDisplay(job.time)} - {formatTimeDisplay(endTime)} ({job.duration})
                                  </p>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className={cn(
                                      "text-[8px] font-medium",
                                      job.jobType === 'visit' ? "text-purple-600 dark:text-purple-400" : "text-primary"
                                    )}>
                                      {job.jobType === 'visit' ? 'Visit' : 'Service'}
                                    </span>
                                    <span className={cn(
                                      "text-[8px] font-medium uppercase px-1 py-0.5 rounded",
                                      statusConfig[job.status].bgColor,
                                      statusConfig[job.status].color
                                    )}>
                                      {statusConfig[job.status].label}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
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
              <div className="p-4 border-b border-border/50">
                <h3 className="text-base font-medium">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
              </div>
              <CardContent className="p-0">
                <div className="relative">
                  {/* Time slots grid as background */}
                  {TIME_SLOTS.map((slot, slotIndex) => {
                    // Get jobs that SPAN this slot but started earlier
                    const spanningJobs = getJobsForTimeSlot(currentDate, slot.value).filter(j => !isJobStartingAt(j, slot.value));
                    const hasSpanningJob = spanningJobs.length > 0;
                    const startingJobs = getJobsForDate(currentDate).filter(j => isJobStartingAt(j, slot.value));
                    const isOccupied = hasSpanningJob || startingJobs.length > 0;
                    
                    return (
                      <div 
                        key={slot.value}
                        className={cn(
                          "flex gap-3 border-b border-border/20 last:border-b-0 h-12",
                          isAdminOrManager && !isOccupied && "hover:bg-muted/30 cursor-pointer"
                        )}
                        onClick={() => isAdminOrManager && !isOccupied && handleTimeSlotClick(currentDate, slot.value)}
                      >
                        <div className="w-20 text-sm text-muted-foreground shrink-0 flex items-start justify-center pt-2 bg-muted/10 border-r border-border/30">
                          {slot.label}
                        </div>
                        <div className="flex-1 relative" />
                      </div>
                    );
                  })}
                  
                  {/* Overlay jobs with absolute positioning */}
                  {getJobsForDate(currentDate).map((job) => {
                    const startSlotIndex = TIME_SLOTS.findIndex(s => s.value === job.time);
                    if (startSlotIndex === -1) return null;
                    
                    const rowSpan = getJobRowSpan(job);
                    const slotHeight = 48; // h-12 = 48px
                    const topPosition = startSlotIndex * slotHeight;
                    const cardHeight = rowSpan * slotHeight;
                    const endTime = calculateEndTime(job.time, job.duration);
                    
                    return (
                      <div
                        key={job.id}
                        className="absolute left-20 right-0 px-2"
                        style={{ top: topPosition + 4, height: cardHeight - 8 }}
                      >
                        <div 
                          className={cn(
                            "h-full p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md overflow-hidden",
                            job.jobType === 'visit' 
                              ? "bg-purple-500/10 border-purple-500/30" 
                              : statusConfig[job.status].bgColor
                          )}
                          onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {job.jobType === 'visit' ? (
                              <Eye className="h-4 w-4 text-purple-500 flex-shrink-0" />
                            ) : (
                              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                            <p className="font-medium text-sm truncate">{job.clientName}</p>
                            <span className="text-xs font-medium text-primary whitespace-nowrap">
                              {formatTimeDisplay(job.time)} - {formatTimeDisplay(endTime)}
                            </span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">({job.duration})</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1 py-0 flex-shrink-0",
                                job.jobType === 'visit' 
                                  ? "border-purple-500/30 text-purple-600 dark:text-purple-400" 
                                  : "border-primary/30 text-primary"
                              )}
                            >
                              {job.jobType === 'visit' ? 'Visit' : 'Service'}
                            </Badge>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1 py-0 ml-auto flex-shrink-0",
                                statusConfig[job.status].bgColor,
                                statusConfig[job.status].color
                              )}
                            >
                              {statusConfig[job.status].label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{job.address}</p>
                          <p className="text-xs text-muted-foreground truncate">{job.employeeName}</p>
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
              {/* Start button: Cleaners can start their scheduled cleaning jobs */}
              {selectedJob.status === 'scheduled' && selectedJob.jobType !== 'visit' && 
                isCleaner && selectedJob.employeeId === user?.id && (
                  <Button 
                    className="flex-1 gap-2"
                    variant="outline"
                    onClick={() => handleOpenStartService(selectedJob)}
                  >
                    <Clock className="h-4 w-4" />
                    Start Service
                  </Button>
              )}

              {/* Complete button: 
                  - For CLEANING jobs: Only the assigned cleaner can complete (must be in-progress)
                  - For VISIT jobs: Admin/Manager can complete (from scheduled status)
              */}
              {selectedJob.status === 'in-progress' && selectedJob.jobType !== 'visit' &&
                isCleaner && selectedJob.employeeId === user?.id && (
                  <Button 
                    className="flex-1 gap-2" 
                    onClick={() => setShowCompletion(true)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t.job.completeJob}
                  </Button>
              )}

              {selectedJob.status === 'scheduled' && selectedJob.jobType === 'visit' &&
                isAdminOrManager && (
                  <Button 
                    className="flex-1 gap-2" 
                    onClick={() => setShowVisitCompletion(true)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete Visit
                  </Button>
              )}
                
                {selectedJob.status === 'completed' && isAdminOrManager && (
                  <>
                    {selectedJob.jobType !== 'visit' ? (
                      <>
                        {/* Invoice buttons - HIDDEN for cash payments per business rule */}
                        {selectedJob.paymentMethod !== 'cash' ? (
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
                        ) : (
                          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Cash payment - Receipt generated (no invoice)</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/calculator?clientId=${selectedJob.clientId}`)}>
                          <Calculator className="h-4 w-4" />
                          Create Estimate
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/contracts?clientId=${selectedJob.clientId}`)}>
                          <FileText className="h-4 w-4" />
                          Create Contract
                        </Button>
                      </>
                    )}
                  </>
                )}
                
                {/* Edit/Delete only for Admin/Manager */}
                {isAdminOrManager && (
                  <>
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
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Job Drawer */}
      <AddJobDrawer
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

      {/* Job Completion Modal (for cleaning jobs) */}
      <JobCompletionModal
        open={showCompletion}
        onOpenChange={setShowCompletion}
        job={selectedJob}
        onComplete={handleCompleteJob}
      />

      {/* Visit Completion Modal (for visit jobs - no financial records) */}
      <VisitCompletionModal
        open={showVisitCompletion}
        onOpenChange={setShowVisitCompletion}
        job={selectedJob}
        onComplete={handleCompleteVisit}
      />

      {/* Start Service Modal (with before photo) */}
      <StartServiceModal
        open={showStartService}
        onOpenChange={setShowStartService}
        job={jobToStart}
        onStart={handleStartJob}
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
