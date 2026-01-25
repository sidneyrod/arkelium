import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
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
  FileText,
  ArrowRight,
  Expand,
  Minimize2
} from 'lucide-react';
import { cn, parseDurationToMinutes } from '@/lib/utils';
import { toast } from 'sonner';
import { logActivity } from '@/stores/activityStore';
import { useInvoiceStore } from '@/stores/invoiceStore';
import { useCompanyStore } from '@/stores/companyStore';
import useRoleAccess from '@/hooks/useRoleAccess';
import { useCompanyPreferences } from '@/hooks/useCompanyPreferences';
import { useTimezone } from '@/hooks/useTimezone';
import AddJobDrawer from '@/components/schedule/AddJobDrawer';
import { NewBookingModal } from '@/components/schedule/NewBookingModal';
import { CompanyFilter } from '@/components/ui/company-filter';
import JobCompletionModal, { PaymentData } from '@/components/modals/JobCompletionModal';
import StartServiceModal from '@/components/modals/StartServiceModal';
import VisitCompletionModal, { VisitCompletionData } from '@/components/schedule/VisitCompletionModal';
import CancelJobModal from '@/components/modals/CancelJobModal';
import OverdueJobAlert from '@/components/schedule/OverdueJobAlert';
import { notifyJobCreated, notifyJobUpdated, notifyJobCancelled, notifyVisitCreated, notifyJobCompleted, notifyInvoiceGenerated } from '@/hooks/useNotifications';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, addDays, subDays, parseISO, startOfDay, endOfDay } from 'date-fns';
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
  paymentMethod?: string;
  serviceDate?: string;
  operationType?: 'billable_service' | 'non_billable_visit' | 'internal_work';
  activityCode?: string;
  operatingCompanyId?: string;
  operatingCompanyName?: string;
  serviceCatalogId?: string | null;
  billableAmount?: number | null;
  isBillable?: boolean;
  organizationId?: string | null;
  // Midnight-crossing job properties (for rendering only)
  _isContinuation?: boolean;
  _originalDate?: string;
  _originalTime?: string;
  _originalDuration?: string;
}

// Premium status configuration with refined colors for enterprise clarity
const statusConfig: Record<JobStatus, { 
  color: string; 
  bgColor: string; 
  label: string;
  badgeClass: string;
  indicatorClass: string;
  dotClass: string;
  cardBgClass: string;
  cardBorderClass: string;
}> = {
  // Scheduled: anticipatory, professional blue
  scheduled: { 
    color: 'text-info', 
    bgColor: 'schedule-badge-scheduled border', 
    label: 'Scheduled',
    badgeClass: 'schedule-badge-scheduled',
    indicatorClass: 'schedule-status-indicator-scheduled',
    dotClass: 'bg-info',
    cardBgClass: 'bg-info/6 hover:bg-info/12 dark:bg-info/8 dark:hover:bg-info/14',
    cardBorderClass: 'border-l-info',
  },
  // In Progress: warm, active attention with pulse - YELLOW/AMBER
  'in-progress': { 
    color: 'text-warning', 
    bgColor: 'schedule-badge-inprogress border', 
    label: 'In Progress',
    badgeClass: 'schedule-badge-inprogress',
    indicatorClass: 'schedule-status-indicator-inprogress',
    dotClass: 'bg-warning animate-pulse',
    cardBgClass: 'bg-warning/8 hover:bg-warning/14 dark:bg-warning/10 dark:hover:bg-warning/16',
    cardBorderClass: 'border-l-warning',
  },
  // Completed: calm, subdued success - GREEN
  completed: { 
    color: 'text-success/85', 
    bgColor: 'schedule-badge-completed border', 
    label: 'Completed',
    badgeClass: 'schedule-badge-completed',
    indicatorClass: 'schedule-status-indicator-completed',
    dotClass: 'bg-success/70',
    cardBgClass: 'bg-success/8 hover:bg-success/14 dark:bg-success/10 dark:hover:bg-success/16',
    cardBorderClass: 'border-l-success',
  },
  // Cancelled: visually quiet, de-emphasized
  cancelled: { 
    color: 'text-muted-foreground/70', 
    bgColor: 'schedule-badge-cancelled border', 
    label: 'Cancelled',
    badgeClass: 'schedule-badge-cancelled',
    indicatorClass: 'schedule-status-indicator-cancelled',
    dotClass: 'bg-muted-foreground/50',
    cardBgClass: 'bg-muted/6 hover:bg-muted/12 dark:bg-muted/8 dark:hover:bg-muted/14',
    cardBorderClass: 'border-l-muted-foreground',
  },
};

// Helper to get card class based on job type (Service vs Visit)
const getScheduleCardClass = (job: ScheduledJob) => {
  const isVisit = job.jobType === 'visit';
  return isVisit ? 'schedule-card-visit' : 'schedule-card-service';
};

// Helper to get type badge class
const getTypeBadgeClass = (job: ScheduledJob, filled = false) => {
  const isVisit = job.jobType === 'visit';
  if (filled) {
    return isVisit ? 'schedule-type-badge-visit-filled' : 'schedule-type-badge-service-filled';
  }
  return isVisit ? 'schedule-type-badge-visit' : 'schedule-type-badge-service';
};

// Helper to get hover card header class
const getHoverCardHeaderClass = (job: ScheduledJob) => {
  const isVisit = job.jobType === 'visit';
  return isVisit ? 'schedule-hovercard-header-visit' : 'schedule-hovercard-header-service';
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
  const { preferences: companyPreferences } = useCompanyPreferences();
  
  // Use accessible companies hook for module-level filtering
  const { companies: accessibleCompanies, getDefaultCompanyId, isLoading: isLoadingCompanies } = useAccessibleCompanies();
  
  // Module-local company filter state
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | 'all'>('all');
  
  // Initialize selectedCompanyId when companies load
  useEffect(() => {
    if (!isLoadingCompanies && accessibleCompanies.length > 0 && selectedCompanyId === 'all') {
      // Keep 'all' as default for multi-company view
    }
  }, [isLoadingCompanies, accessibleCompanies, selectedCompanyId]);
  
  // Read URL params for initial state
  const urlView = searchParams.get('view') as ViewType | null;
  const urlDate = searchParams.get('date');
  
  const [view, setView] = useState<ViewType>(urlView || 'week');
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
  
  const [jobToCancel, setJobToCancel] = useState<ScheduledJob | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [editingJob, setEditingJob] = useState<ScheduledJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [focusMode, setFocusMode] = useState(false);
  const [currentTimeLabel, setCurrentTimeLabel] = useState<string>('');
  
  // Timezone hook for accurate current time display
  const { formatLocal, timezone } = useTimezone();
  
  // QueryClient for cache invalidation
  const queryClient = useQueryClient();
  
  // Get accessible company IDs for query
  const accessibleCompanyIds = useMemo(() => accessibleCompanies.map(c => c.id), [accessibleCompanies]);
  const userCompanyId = user?.profile?.company_id || null;
  const userId = user?.id || null;
  
  // Determine which company IDs to query
  const queryCompanyIds = useMemo(() => {
    if (selectedCompanyId === 'all') {
      return accessibleCompanyIds;
    }
    return [selectedCompanyId];
  }, [selectedCompanyId, accessibleCompanyIds]);

  // React Query hook for fetching jobs - stable cache, no window focus refetch
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['schedule-jobs', selectedCompanyId, ...queryCompanyIds],
    queryFn: async () => {
      console.log('[Schedule] React Query fetching jobs', { selectedCompanyId, queryCompanyIds });
      
      if (queryCompanyIds.length === 0) {
        // No companies to query - fallback to RPC
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        if (!companyIdData) {
          console.log('[Schedule] No company ID found, returning empty');
          setDebugInfo('No company ID available');
          return [];
        }
        queryCompanyIds.push(companyIdData);
      }
      
      // Query jobs from selected company(ies)
      let query = supabase
        .from('jobs')
        .select(`
          id,
          client_id,
          cleaner_id,
          company_id,
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
          operation_type,
          activity_code,
          service_catalog_id,
          billable_amount,
          is_billable,
          organization_id,
          clients(id, name),
          profiles:cleaner_id(id, first_name, last_name),
          client_locations:location_id(address, city),
          companies:company_id(id, trade_name, company_code)
        `)
        .order('scheduled_date', { ascending: true });
      
      // Apply company filter - use .in() for multi-company, .eq() for single
      if (queryCompanyIds.length === 1) {
        query = query.eq('company_id', queryCompanyIds[0]);
      } else {
        query = query.in('company_id', queryCompanyIds);
      }
      
      const { data, error } = await query;
      
      console.log('[Schedule] Query result:', { count: data?.length, error, queryCompanyIds });
      
      if (error) {
        console.error('Error fetching jobs:', error);
        setDebugInfo(`Query error: ${error.message}`);
        throw error;
      }
      
      const mappedJobs: ScheduledJob[] = (data || []).map((job: any) => {
        const isVisit = job.job_type === 'visit' || job.operation_type === 'non_billable_visit';
        
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
          operationType: job.operation_type || 'billable_service',
          activityCode: job.activity_code || 'cleaning',
          operatingCompanyId: job.company_id,
          operatingCompanyName: job.companies?.trade_name || '',
          serviceCatalogId: job.service_catalog_id,
          billableAmount: job.billable_amount,
          isBillable: job.is_billable ?? true,
          organizationId: job.organization_id || null,
        };
      });
      
      console.log('[Schedule] Mapped jobs:', mappedJobs.length);
      setDebugInfo(`Loaded ${mappedJobs.length} jobs`);
      return mappedJobs;
    },
    enabled: !!userId && queryCompanyIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 30 * 60 * 1000,   // 30 minutes in cache
    refetchOnWindowFocus: false, // CRITICAL: prevents refresh on tab switch
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // React Query hook for invoice settings - stable cache
  // Uses first accessible company for settings (or default company)
  const defaultCompanyForSettings = useMemo(() => {
    return getDefaultCompanyId() || (queryCompanyIds.length > 0 ? queryCompanyIds[0] : null);
  }, [getDefaultCompanyId, queryCompanyIds]);
  
  const { data: invoiceSettings } = useQuery({
    queryKey: ['schedule-invoice-settings', defaultCompanyForSettings],
    queryFn: async () => {
      let companyId = defaultCompanyForSettings;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) return { mode: 'manual' as const, autoSend: false };
      
      const { data } = await supabase
        .from('company_estimate_config')
        .select('invoice_generation_mode, auto_send_cash_receipt')
        .eq('company_id', companyId)
        .maybeSingle();
      
      return {
        mode: (data?.invoice_generation_mode || 'manual') as 'automatic' | 'manual',
        autoSend: data?.auto_send_cash_receipt || false,
      };
    },
    enabled: !!userId && !!defaultCompanyForSettings,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const invoiceGenerationMode = invoiceSettings?.mode || 'manual';
  const autoSendCashReceipt = invoiceSettings?.autoSend || false;

  // Helper to invalidate jobs cache after mutations
  const refetchJobs = () => {
    queryClient.invalidateQueries({ queryKey: ['schedule-jobs'] });
  };
  
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

  // Reset search when company filter changes
  useEffect(() => {
    setSearchQuery('');
  }, [selectedCompanyId]);

  // For cleaners: only show their own jobs. For admin/manager/super-admin: show all
  // Super Admin has isAdminOrManager=true, so we check both conditions
  const isCleanerOnly = isCleaner && !isAdminOrManager;
  
  console.log('[Schedule] Role check:', { isCleaner, isAdminOrManager, isCleanerOnly, jobsCount: jobs.length });
  
  const baseJobs = isCleanerOnly 
    ? jobs.filter(job => job.employeeId === user?.id)
    : jobs;
  
  console.log('[Schedule] baseJobs after role filter:', baseJobs.length);
  
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return baseJobs;
    
    const query = searchQuery.toLowerCase().trim();
    
    return baseJobs.filter(job => {
      // Search by client name
      if (job.clientName.toLowerCase().includes(query)) return true;
      // Search by employee name
      if (job.employeeName.toLowerCase().includes(query)) return true;
      // Search by type (cleaning/service/visit)
      if (job.jobType?.toLowerCase().includes(query)) return true;
      if (query === 'service' && job.jobType === 'cleaning') return true;
      // Search by status
      if (job.status.toLowerCase().includes(query)) return true;
      // Search by address
      if (job.address.toLowerCase().includes(query)) return true;
      // Search for "in progress" as "in-progress"
      if (query.includes('progress') && job.status === 'in-progress') return true;
      return false;
    });
  }, [baseJobs, searchQuery]);

  // Calculate visible date range based on current view and selected date
  const visibleDateRange = useMemo(() => {
    switch (view) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate)
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'month':
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
    }
  }, [view, currentDate]);

  // Filter jobs by the visible date period (for KPIs)
  const periodFilteredJobs = useMemo(() => {
    const { start, end } = visibleDateRange;
    return filteredJobs.filter(job => {
      const jobDate = toSafeLocalDate(job.date);
      return jobDate >= start && jobDate <= end;
    });
  }, [filteredJobs, visibleDateRange]);

  // Calculate summary stats for contextual header - now based on visible period
  const summaryStats = useMemo(() => {
    const today = new Date();
    const todayJobs = periodFilteredJobs.filter(job => isSameDay(toSafeLocalDate(job.date), today));
    const completedCount = periodFilteredJobs.filter(job => job.status === 'completed').length;
    const inProgressCount = periodFilteredJobs.filter(job => job.status === 'in-progress').length;
    const scheduledCount = periodFilteredJobs.filter(job => job.status === 'scheduled').length;
    
    return {
      total: periodFilteredJobs.length,
      completed: completedCount,
      inProgress: inProgressCount,
      scheduled: scheduledCount,
      todayCount: todayJobs.length,
    };
  }, [periodFilteredJobs]);

  // Update current time label every minute for the time indicator
  useEffect(() => {
    const updateTimeLabel = () => {
      try {
        setCurrentTimeLabel(formatLocal(new Date(), 'h:mm a'));
      } catch {
        setCurrentTimeLabel(format(new Date(), 'h:mm a'));
      }
    };
    updateTimeLabel();
    const interval = setInterval(updateTimeLabel, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [formatLocal]);

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

  const handleAddJob = async (jobData: Omit<ScheduledJob, 'id'> & {
    operationType?: string;
    activityCode?: string;
    operatingCompanyId?: string;
    serviceCatalogId?: string | null;
    billableAmount?: number;
    organizationId?: string | null;
  }) => {
    try {
      // Use operating company from enterprise flow, fallback to default or user company
      let companyId = jobData.operatingCompanyId || getDefaultCompanyId() || user?.profile?.company_id;
      if (!companyId) {
        const { data: companyIdData } = await supabase.rpc('get_user_company_id');
        companyId = companyIdData;
      }
      
      if (!companyId) {
        toast.error('Unable to identify company');
        return;
      }
      
      // Parse duration to minutes
      const durationMinutes = parseDurationToMinutes(jobData.duration);
      
      // Determine job type - map from operation type or legacy jobType
      const isVisit = (jobData as any).jobType === 'visit' || jobData.operationType === 'non_billable_visit';
      const isBillable = jobData.operationType !== 'non_billable_visit' && jobData.operationType !== 'internal_work';
      
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          company_id: companyId,
          client_id: jobData.clientId || null,
          cleaner_id: jobData.employeeId || null,
          scheduled_date: jobData.date,
          start_time: jobData.time,
          duration_minutes: durationMinutes,
          status: 'scheduled',
          job_type: isVisit ? 'visit' : (jobData.services?.[0] || 'Standard Clean'),
          notes: jobData.notes,
          visit_purpose: isVisit ? (jobData as any).visitPurpose : null,
          visit_route: isVisit ? (jobData as any).visitRoute : null,
          // Enterprise fields
          operation_type: jobData.operationType || 'billable_service',
          activity_code: jobData.activityCode || 'cleaning',
          service_catalog_id: jobData.serviceCatalogId || null,
          billable_amount: isBillable ? (jobData.billableAmount || null) : null,
          is_billable: isBillable,
          organization_id: jobData.organizationId || null,
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
      refetchJobs();
      
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

  const handleUpdateJob = async (updatedJobData: Omit<ScheduledJob, 'id'> & {
    operationType?: string;
    activityCode?: string;
    operatingCompanyId?: string;
    serviceCatalogId?: string | null;
    billableAmount?: number;
    organizationId?: string | null;
  }) => {
    if (!editingJob) return;
    
    try {
      const durationMinutes = parseDurationToMinutes(updatedJobData.duration);
      
      // Determine if billable
      const isVisit = (updatedJobData as any).jobType === 'visit' || updatedJobData.operationType === 'non_billable_visit';
      const isBillable = updatedJobData.operationType !== 'non_billable_visit' && updatedJobData.operationType !== 'internal_work';
      
      const { error } = await supabase
        .from('jobs')
        .update({
          client_id: updatedJobData.clientId || null,
          cleaner_id: updatedJobData.employeeId || null,
          scheduled_date: updatedJobData.date,
          start_time: updatedJobData.time,
          duration_minutes: durationMinutes,
          job_type: isVisit ? 'visit' : (updatedJobData.services?.[0] || 'Standard Clean'),
          notes: updatedJobData.notes,
          visit_purpose: isVisit ? (updatedJobData as any).visitPurpose : null,
          visit_route: isVisit ? (updatedJobData as any).visitRoute : null,
          // Enterprise fields
          operation_type: updatedJobData.operationType || undefined,
          activity_code: updatedJobData.activityCode || undefined,
          service_catalog_id: updatedJobData.serviceCatalogId || null,
          billable_amount: isBillable ? (updatedJobData.billableAmount || null) : null,
          is_billable: isBillable,
          organization_id: updatedJobData.organizationId || null,
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
      
      refetchJobs();
      setEditingJob(null);
    } catch (error) {
      console.error('Error in handleUpdateJob:', error);
      toast.error('Failed to update job');
    }
  };

  // Open cancel modal for a job
  const handleOpenCancelJob = (job: ScheduledJob) => {
    setJobToCancel(job);
    setShowCancelModal(true);
    setSelectedJob(null);
  };

  // Callback when job is cancelled successfully
  const handleJobCancelled = () => {
    refetchJobs();
    setJobToCancel(null);
    setShowCancelModal(false);
  };

  // Open start service modal with before photo option
  const handleOpenStartService = (job: ScheduledJob) => {
    setJobToStart(job);
    setShowStartService(true);
    setSelectedJob(null);
  };

  // Handle starting a job (mark as in-progress) - called from StartServiceModal
  const handleStartJob = async (jobId: string, beforePhotos?: string[]) => {
    try {
      const companyId = user?.profile?.company_id;
      const job = jobs.find(j => j.id === jobId);
      
      const updateData: Record<string, any> = { status: 'in-progress' };
      if (beforePhotos && beforePhotos.length > 0) {
        updateData.before_photos = beforePhotos;
      }
      
      const { error } = await supabase
        .from('jobs')
        .update(updateData)
        .eq('id', jobId)
        .eq('company_id', companyId);
      
      if (error) {
        console.error('Error starting job:', error);
        toast.error('Failed to start job');
        return;
      }
      
      logActivity('job_started', `Job started for ${job?.clientName || 'Unknown'}`, jobId, job?.clientName || '');
      toast.success('Job started successfully');
      
      refetchJobs();
      setJobToStart(null);
    } catch (error) {
      console.error('Error in handleStartJob:', error);
      toast.error('Failed to start job');
    }
  };

  // Helper to check if payment is on the same day as service
  const isSameDayPayment = (paymentDate: Date, serviceDate: string): boolean => {
    const serviceDateParsed = toSafeLocalDate(serviceDate);
    return isSameDay(paymentDate, serviceDateParsed);
  };

  // Generic payment receipt generator (works for cash AND same-day e-transfers)
  const createPaymentReceipt = async (
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
      
      // Format payment method for display
      const paymentMethodDisplay = paymentData.paymentMethod === 'e_transfer' ? 'E-Transfer' : 
        paymentData.paymentMethod === 'cash' ? 'Cash' : paymentData.paymentMethod;
      
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
        paymentMethod: paymentMethodDisplay,
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
      
      // Insert payment receipt - same-day payments are confirmed immediately
      const { error: receiptError } = await supabase
        .from('payment_receipts')
        .insert({
          company_id: companyId,
          job_id: job.id,
          client_id: job.clientId,
          cleaner_id: job.employeeId || null,
          receipt_number: receiptNumber,
          payment_method: paymentData.paymentMethod,
          amount: subtotal,
          tax_amount: taxAmount,
          total,
          service_date: job.date,
          service_description: `Cleaning service - ${job.duration}`,
          receipt_html: receiptHtml,
          created_by: user?.id || null,
          notes: paymentData.paymentNotes || null,
          sent_at: new Date().toISOString(), // Same-day receipts are confirmed immediately upon generation
        });
      
      if (receiptError) {
        console.error('Error creating receipt:', receiptError);
        return null;
      }
      
      console.log(`Payment receipt ${receiptNumber} created successfully (${paymentData.paymentMethod})`);
      return { receiptNumber, receiptHtml };
    } catch (error) {
      console.error('Error in createPaymentReceipt:', error);
      return null;
    }
  };
  
  const handleCompleteJob = async (jobId: string, afterPhotos?: string[], notes?: string, paymentData?: PaymentData) => {
    // IMPORTANT: Clear selectedJob FIRST to prevent job details dialog from flashing
    // The dialog condition is: !!selectedJob && !showCompletion
    // So we must nullify selectedJob before setting showCompletion to false
    setSelectedJob(null);
    setShowCompletion(false);
    
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
      
      // Add after photos if provided
      if (afterPhotos && afterPhotos.length > 0) {
        updateData.after_photos = afterPhotos;
      }
      
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
        
        // Determine if we should generate a receipt (cash OR same-day e-transfer)
        const isCashPayment = paymentData?.paymentMethod === 'cash';
        const isSameDayETransfer = paymentData?.paymentMethod === 'e_transfer' && 
          paymentData?.paymentDate && 
          isSameDayPayment(paymentData.paymentDate, job.date);
        const shouldGenerateReceipt = isCashPayment || isSameDayETransfer;
        
        // Handle payments that generate receipts (cash or same-day e-transfer)
        if (shouldGenerateReceipt && paymentData) {
          // Only auto-generate receipt if preference is enabled
          let receipt: { receiptNumber: string; receiptHtml: string } | null = null;
          
          if (companyPreferences.autoGenerateCashReceipt) {
            receipt = await createPaymentReceipt(job, paymentData, companyId);
            if (receipt) {
              const methodLabel = isCashPayment ? 'Cash' : 'E-Transfer';
              toast.success(`${methodLabel} receipt ${receipt.receiptNumber} generated successfully`);
            
              // Auto-send receipt if preference is enabled
              if (companyPreferences.autoSendCashReceipt) {
                try {
                  // Fetch receipt ID and client email
                  const { data: receiptData } = await supabase
                    .from('payment_receipts')
                    .select('id')
                    .eq('receipt_number', receipt.receiptNumber)
                    .eq('company_id', companyId)
                    .single();
                  
                  if (receiptData) {
                    // Fetch client email
                    const { data: clientData } = await supabase
                      .from('clients')
                      .select('email, name')
                      .eq('id', job.clientId)
                      .single();
                    
                    if (clientData?.email) {
                      await supabase.functions.invoke('send-receipt-email', {
                        body: { 
                          receiptId: receiptData.id,
                          recipientEmail: clientData.email,
                          recipientName: clientData.name
                        }
                      });
                      toast.success('Receipt sent to client');
                    }
                  }
                } catch (sendError) {
                  console.error('Error auto-sending receipt:', sendError);
                  // Don't show error toast - receipt was still generated
                }
              }
            }
          } else {
            // Notify that receipt can be generated manually
            const methodLabel = isCashPayment ? 'Cash' : 'E-Transfer';
            toast.info(`${methodLabel} payment recorded. Generate receipt manually from Receipts page.`);
          }
            
          // Create cleaner payment entry for same-day payments
          if (job.employeeId) {
            const durationHours = parseFloat(job.duration.replace(/[^0-9.]/g, '')) || 2;
            await createCleanerPayment(job, paymentData.paymentAmount, durationHours, paymentData);
          }
          
          // Cash collection record is ONLY for cash payments (not e-transfer)
          if (isCashPayment) {
            // When cash kept is disabled, always force delivered_to_office
            const cashHandling = companyPreferences.enableCashKeptByEmployee && paymentData.cashHandlingChoice === 'keep_cash' 
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
              organization_id: job.organizationId || null,
            } as any).select('id').single();
            
            // Log activity for cash handling
            logActivity(
              cashHandling === 'kept_by_cleaner' ? 'cash_kept_by_cleaner' as any : 'cash_delivered_to_office' as any,
              `Cash $${paymentData.paymentAmount.toFixed(2)} ${cashHandling === 'kept_by_cleaner' ? 'kept by cleaner' : 'delivered to office'}`,
              jobId,
              job.clientName
            );
            
            // Notify admin if cleaner is keeping cash (requires approval)
            // Only send notification when cash kept is enabled
            if (companyPreferences.enableCashKeptByEmployee && cashHandling === 'kept_by_cleaner' && insertedCashCollection?.id) {
              const { notifyCashApprovalRequested } = await import('@/hooks/useNotifications');
              await notifyCashApprovalRequested(
                job.employeeName,
                job.clientName,
                paymentData.paymentAmount,
                insertedCashCollection.id
              );
            }
          }
          
          // Skip invoice generation for payments that generated receipts
          refetchJobs();
          return;
        }
        
        // Skip invoice generation for Visit type jobs
        if (job.jobType === 'visit') {
          toast.success('Visit completed successfully');
          refetchJobs();
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
      refetchJobs();
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
      refetchJobs();
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

  // ================= MIDNIGHT-CROSSING JOB HELPERS =================
  
  // Check if a job crosses midnight (ends after 24:00)
  const doesJobCrossMidnight = (startTime: string, duration: string): boolean => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const durationHours = parseFloat(duration.replace(/[^0-9.]/g, '')) || 2;
    const totalMinutes = hours * 60 + minutes + (durationHours * 60);
    return totalMinutes >= 24 * 60; // Crosses midnight if >= 1440 minutes
  };

  // Calculate how many hours of a job belong to the next day
  const getNextDayDuration = (startTime: string, duration: string): number => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const durationHours = parseFloat(duration.replace(/[^0-9.]/g, '')) || 2;
    const totalMinutes = hours * 60 + minutes + (durationHours * 60);
    const minutesPastMidnight = totalMinutes - (24 * 60);
    return minutesPastMidnight > 0 ? minutesPastMidnight / 60 : 0;
  };

  // Calculate remaining duration until midnight (for first day of a midnight-crossing job)
  const getDurationUntilMidnight = (startTime: string): number => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const minutesToMidnight = (24 * 60) - (hours * 60 + minutes);
    return minutesToMidnight / 60;
  };

  // Get jobs for a specific date, including continuations from previous day
  const getJobsForDate = (date: Date) => {
    // Jobs that start on this day
    const jobsStartingToday = filteredJobs.filter(job => {
      const jobDate = toSafeLocalDate(job.date);
      return isSameDay(jobDate, date);
    });
    
    // Jobs that started yesterday but continue into today
    const yesterday = subDays(date, 1);
    const jobsContinuingFromYesterday = filteredJobs
      .filter(job => {
        const jobDate = toSafeLocalDate(job.date);
        return isSameDay(jobDate, yesterday) && doesJobCrossMidnight(job.time, job.duration);
      })
      .map(job => ({
        ...job,
        // Mark as continuation for special rendering
        _isContinuation: true,
        _originalDate: job.date,
        _originalTime: job.time,
        _originalDuration: job.duration,
        // Override time and duration for rendering on continuation day
        time: '00:00',
        duration: `${getNextDayDuration(job.time, job.duration).toFixed(1)}h`,
      }));
    
    return [...jobsStartingToday, ...jobsContinuingFromYesterday];
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

  // Calculate max height for a job card to avoid overlapping the next job
  const getMaxHeightBeforeNextJob = (currentJob: ScheduledJob, allJobsOnDay: ScheduledJob[], slotHeight: number): number | null => {
    const currentStartMinutes = timeToMinutes(currentJob.time);
    
    // Find jobs that start after this job's start time on the same day
    const subsequentJobs = allJobsOnDay.filter(j => {
      if (j.id === currentJob.id) return false;
      if (j._isContinuation && currentJob._isContinuation) return false; // Don't compare continuations
      const jobStartMinutes = timeToMinutes(j.time);
      return jobStartMinutes > currentStartMinutes;
    });
    
    if (subsequentJobs.length === 0) return null;
    
    // Find the earliest start time among subsequent jobs
    const earliestNextStart = subsequentJobs.reduce((min, j) => {
      const start = timeToMinutes(j.time);
      return start < min ? start : min;
    }, Infinity);
    
    if (earliestNextStart === Infinity) return null;
    
    // Calculate the height in pixels from current job start to next job start
    const slotsUntilNextJob = (earliestNextStart - currentStartMinutes) / 30; // Each slot is 30 minutes
    const heightUntilNextJob = slotsUntilNextJob * slotHeight;
    
    return heightUntilNextJob;
  };

  // Check if a job overlaps with a specific time slot
  const getJobsForTimeSlot = (date: Date, timeSlot: string): ScheduledJob[] => {
    const dayJobs = getJobsForDate(date);
    const slotMinutes = timeToMinutes(timeSlot);
    
    return dayJobs.filter(job => {
      const jobStartMinutes = timeToMinutes(job.time);
      
      // For continuation jobs, calculate end time normally
      const endTime = calculateEndTime(job.time, job.duration);
      let jobEndMinutes = timeToMinutes(endTime);
      
      // For non-continuation jobs that cross midnight, cap at 24:00
      if (!job._isContinuation && doesJobCrossMidnight(job.time, job.duration)) {
        jobEndMinutes = 24 * 60;
      }
      
      return jobStartMinutes <= slotMinutes && jobEndMinutes > slotMinutes;
    });
  };

  // Get the row span for a job (how many 30-min slots it covers)
  const getJobRowSpan = (job: ScheduledJob): number => {
    const durationHours = parseFloat(job.duration.replace(/[^0-9.]/g, '')) || 2;
    
    // For midnight-crossing jobs on their START day, limit to time until midnight
    if (!job._isContinuation && doesJobCrossMidnight(job.time, job.duration)) {
      const hoursUntilMidnight = getDurationUntilMidnight(job.time);
      return Math.ceil(hoursUntilMidnight * 2);
    }
    
    return Math.ceil(durationHours * 2); // Each slot is 30 minutes, so 2 slots per hour
  };

  // Check if a job starts at a specific time slot
  const isJobStartingAt = (job: ScheduledJob, timeSlot: string): boolean => {
    return job.time === timeSlot;
  };

  // Get current time position for the "now" indicator (returns pixel offset from top)
  const getCurrentTimePosition = (): number => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const slotIndex = hours * 2 + Math.floor(minutes / 30);
    const offsetWithinSlot = (minutes % 30) / 30 * 56; // 56px per slot
    return slotIndex * 56 + offsetWithinSlot;
  };

  // Check if a date is today for the current time indicator
  const isTodayForIndicator = (date: Date): boolean => {
    return isToday(date);
  };

  if (isLoading) {
    return (
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn(
      "p-1 space-y-1 h-[calc(100vh/0.80-20px)] flex flex-col",
      focusMode && "schedule-focus-mode"
    )}>
      {/* Overdue Job Alert - For Admin/Manager and Cleaners */}
      <OverdueJobAlert />
      
      {/* Single-Line Header: Company → Search → Mode → KPIs → Date Nav → Add Job → Expand */}
      <div className="flex items-center gap-2 w-full">
        {/* 1. Company Filter */}
        <CompanyFilter
          value={selectedCompanyId}
          onChange={setSelectedCompanyId}
          showAllOption={accessibleCompanies.length > 1}
          allLabel="All Companies"
          className="w-[160px] h-8 text-xs flex-shrink-0"
        />
        
        {/* 2. Search Bar (flex-1 to fill available space) */}
        <div className="relative flex-1 min-w-[120px] max-w-[200px]">
          <input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full pl-7 pr-2 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
          <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        </div>

        {/* 2. View Mode Dropdown */}
        <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
          <SelectTrigger className="w-[90px] h-8 text-xs flex-shrink-0">
            <CalendarIcon className="h-3 w-3 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="day">{t.schedule.day}</SelectItem>
            <SelectItem value="week">{t.schedule.week}</SelectItem>
            <SelectItem value="month">{t.schedule.month}</SelectItem>
            <SelectItem value="timeline">
              <span className="flex items-center gap-2">
                <List className="h-3 w-3" />
                Timeline
              </span>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* 3. KPI Pills (Jobs, Done, In Progress, Today) */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="schedule-kpi-pill-inline schedule-kpi-pill-jobs">
            <span className="schedule-kpi-pill-value">{summaryStats.total}</span>
            <span className="schedule-kpi-pill-label">Jobs</span>
          </div>
          <div className="schedule-kpi-pill-inline schedule-kpi-pill-completed">
            <span className="schedule-kpi-pill-value">{summaryStats.completed}</span>
            <span className="schedule-kpi-pill-label">Done</span>
          </div>
          <div className={cn(
            "schedule-kpi-pill-inline",
            summaryStats.inProgress > 0 ? "schedule-kpi-pill-inprogress" : "schedule-kpi-pill-jobs"
          )}>
            <span className="schedule-kpi-pill-value">{summaryStats.inProgress}</span>
            <span className="schedule-kpi-pill-label">In Progress</span>
          </div>
          <div className="schedule-kpi-pill-inline schedule-kpi-pill-today">
            <span className="schedule-kpi-pill-value">{summaryStats.todayCount}</span>
            <span className="schedule-kpi-pill-label">Today</span>
          </div>
        </div>

        {/* 4. Date Navigation + Today Button */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="outline" size="icon" onClick={goToPrevious} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-2.5 py-1.5 rounded-md bg-card border border-border/50 min-w-[110px] text-center">
            <span className="font-medium text-xs">{format(currentDate, view === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}</span>
          </div>
          <Button variant="outline" size="icon" onClick={goToNext} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToToday}>
            {t.schedule.today}
          </Button>
        </div>

        {/* 5. Add Job Button */}
        {isAdminOrManager && (
          <Button onClick={() => setShowAddJob(true)} className="gap-1.5 h-8 text-xs px-3 flex-shrink-0">
            <CalendarPlus className="h-3.5 w-3.5" />
            {t.schedule.addJob}
          </Button>
        )}

        {/* 6. Focus Mode Toggle (last) */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setFocusMode(!focusMode)}
                className={cn(
                  "h-8 w-8 transition-colors flex-shrink-0",
                  focusMode && "bg-primary/10 text-primary"
                )}
              >
                {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {focusMode ? 'Exit Focus Mode' : 'Focus Mode'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Calendar Views with smooth transitions */}
      <div className="animate-fade-in flex-1 flex flex-col min-h-0" key={view}>
        {/* Month View */}
        {view === 'month' && (
          <Card className="border-border/40 shadow-soft-sm overflow-hidden flex-1 flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              <div className="grid grid-cols-7 border-b border-border/40 bg-muted/20">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="p-2.5 text-center text-xs font-medium text-muted-foreground border-r border-border/30 last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1">
                {getMonthDays().map((day, idx) => {
                  const dayJobs = getJobsForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isTodayCell = isToday(day);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={cn(
                        "p-1 border-r border-b schedule-grid-line last:border-r-0 cursor-pointer transition-all duration-150",
                        "hover:bg-primary/5",
                        !isCurrentMonth && "bg-muted/5 text-muted-foreground/60",
                        isTodayCell && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                      )}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1.5 h-5 w-5 flex items-center justify-center rounded-full transition-all",
                        isTodayCell && "bg-primary text-primary-foreground shadow-sm"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        <TooltipProvider delayDuration={300}>
                          {dayJobs.slice(0, 2).map((job) => {
                            const crossesMidnight = !job._isContinuation && doesJobCrossMidnight(job._originalTime || job.time, job._originalDuration || job.duration);
                            const isVisit = job.jobType === 'visit';
                            
                            return (
                              <Tooltip key={job.id + (job._isContinuation ? '-cont' : '')}>
                                <TooltipTrigger asChild>
                                  <div
                                    onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                    className={cn(
                                      "text-[10px] px-2 py-1.5 rounded-lg truncate cursor-pointer flex items-center gap-1.5 relative overflow-hidden",
                                      "transition-all duration-200 ease-out",
                                      "hover:scale-[1.02] hover:-translate-y-0.5",
                                      // Full card color fill - elegant transparent style
                                      isVisit 
                                        ? "bg-purple-500/10 hover:bg-purple-500/18 border border-purple-500/25 dark:bg-purple-500/12 dark:hover:bg-purple-500/22" 
                                        : "bg-emerald-500/10 hover:bg-emerald-500/18 border border-emerald-500/25 dark:bg-emerald-500/12 dark:hover:bg-emerald-500/22",
                                      job._isContinuation && "opacity-90"
                                    )}
                                  >
                                    {/* Type icon */}
                                    {isVisit ? (
                                      <Eye className="h-2.5 w-2.5 flex-shrink-0 text-purple-600 dark:text-purple-400" />
                                    ) : (
                                      <Sparkles className="h-2.5 w-2.5 flex-shrink-0 text-info" />
                                    )}
                                    
                                    {/* Client name */}
                                    <span className={cn(
                                      "truncate font-semibold flex-1",
                                      isVisit ? "text-purple-700 dark:text-purple-300" : ""
                                    )}>
                                      {job.clientName}
                                    </span>
                                    
                                    {/* Status dot indicator */}
                                    <span className={cn(
                                      "w-2 h-2 rounded-full flex-shrink-0",
                                      statusConfig[job.status].dotClass
                                    )} />
                                    
                                    {/* Crosses midnight visual indicator */}
                                    {crossesMidnight && (
                                      <ArrowRight className="h-2.5 w-2.5 text-warning/70 flex-shrink-0" />
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center" collisionPadding={40} className="max-w-[240px] p-0 shadow-xl border-0 overflow-hidden z-[100]">
                                  {/* Premium tooltip header */}
                                  <div className={cn("p-2.5", getHoverCardHeaderClass(job))}>
                                    <Badge className={cn("text-[9px] px-2 py-0.5", getTypeBadgeClass(job, true))}>
                                      {isVisit ? 'VISIT' : 'SERVICE'}
                                    </Badge>
                                  </div>
                                  
                                  {/* Content */}
                                  <div className="p-3 space-y-1.5">
                                    {job._isContinuation && (
                                      <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                                        <div className="w-1 h-3 rounded-full bg-muted-foreground/30" />
                                        <span className="italic">Continues from previous day</span>
                                      </div>
                                    )}
                                    <p className="font-semibold text-xs">{job.clientName}</p>
                                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {job.address}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <Clock className="h-3 w-3 text-muted-foreground" />
                                      <span>{formatTimeDisplay(job.time)} · {job.duration}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px]">
                                      <User className="h-3 w-3 text-muted-foreground" />
                                      <span>{job.employeeName}</span>
                                    </div>
                                    {/* Status badge */}
                                    <Badge className={cn("text-[9px] mt-1", statusConfig[job.status].badgeClass)}>
                                      {statusConfig[job.status].label}
                                    </Badge>
                                    {crossesMidnight && (
                                      <div className="flex items-center gap-1 text-[9px] text-warning">
                                        <ArrowRight className="h-2.5 w-2.5" />
                                        <span className="italic">Continues to next day</span>
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </TooltipProvider>
                        {dayJobs.length > 2 && (
                          <div className="text-[9px] text-muted-foreground/70 px-1 font-medium">
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
          <Card className="border-border/40 shadow-soft-sm overflow-hidden min-w-0">
            <CardContent className="p-0">
              <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b border-border/40 bg-muted/20">
                <div className="p-2 text-center text-sm text-muted-foreground border-r border-border/30 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                {getWeekDays().map((day) => {
                  const isTodayCell = isToday(day);
                  return (
                    <div 
                      key={day.toISOString()} 
                      className={cn(
                        "p-2.5 text-center border-r border-border/25 last:border-r-0 cursor-pointer transition-all duration-150",
                        "hover:bg-muted/30",
                        isTodayCell && "bg-primary/5 relative"
                      )}
                      onClick={() => handleDayClick(day)}
                    >
                      <p className="text-xs font-medium text-muted-foreground">{format(day, 'EEE')}</p>
                      <p className={cn(
                        "text-lg font-semibold mt-0.5 transition-colors",
                        isTodayCell && "text-primary"
                      )}>{format(day, 'd')}</p>
                      {isTodayCell && (
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary/50 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
              
              <div className={cn("overflow-y-auto overflow-x-hidden relative", focusMode ? "max-h-[calc(100vh-40px)]" : "max-h-[calc(100vh-80px)]")}>
                {/* Current Time Indicator - Enhanced with floating label */}
                {getWeekDays().some(day => isTodayForIndicator(day)) && (
                  <div 
                    className="schedule-current-time-line"
                    style={{ top: getCurrentTimePosition() }}
                  >
                    <div className="schedule-current-time-dot" />
                  </div>
                )}
                
                {/* Background Grid - Visual time slots */}
                {TIME_SLOTS.map((slot, slotIndex) => {
                  return (
                    <div key={slot.value} className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b schedule-grid-line last:border-b-0">
                      <div className="p-2 text-xs text-muted-foreground border-r border-border/20 bg-muted/5 flex items-start justify-center h-14">
                        {slot.label}
                      </div>
                      {getWeekDays().map((day) => {
                        // Get jobs that SPAN this slot (for pointer-events blocking)
                        const spanningJobs = getJobsForTimeSlot(day, slot.value);
                        const hasJob = spanningJobs.length > 0;
                        const isTodayCell = isToday(day);
                        
                        return (
                          <div 
                            key={`${day.toISOString()}-${slot.value}`} 
                            className={cn(
                              "border-r schedule-grid-line last:border-r-0 h-14 transition-colors min-w-0",
                              isAdminOrManager && !hasJob && "hover:bg-primary/5 cursor-pointer",
                              isTodayCell && "bg-primary/[0.02]"
                            )}
                            onClick={() => isAdminOrManager && !hasJob && handleTimeSlotClick(day, slot.value)}
                          />
                        );
                      })}
                    </div>
                  );
                })}
                
                {/* Overlay Layer - Jobs with absolute positioning */}
                <div className="absolute inset-0 grid grid-cols-[60px_repeat(7,minmax(0,1fr))] pointer-events-none">
                  {/* Empty time column offset */}
                  <div />
                  
                  {/* Job columns for each day */}
                  {getWeekDays().map((day) => {
                    const dayJobs = getJobsForDate(day);
                    
                    return (
                      <div key={day.toISOString()} className="relative">
                        {dayJobs.map((job) => {
                          const startSlotIndex = TIME_SLOTS.findIndex(s => s.value === job.time);
                          if (startSlotIndex === -1) return null;
                          
                          const rowSpan = getJobRowSpan(job);
                          const slotHeight = 56; // h-14 = 56px
                          const topPosition = startSlotIndex * slotHeight;
                          const cardHeight = rowSpan * slotHeight;
                          const endTime = calculateEndTime(job.time, job.duration);
                          const crossesMidnight = !job._isContinuation && doesJobCrossMidnight(job._originalTime || job.time, job._originalDuration || job.duration);
                          
                          // Calculate maximum height before the next job starts (to prevent overlap)
                          const maxBeforeNextJob = getMaxHeightBeforeNextJob(job, dayJobs, slotHeight);
                          
                          // Clamp height to available slots remaining
                          const remainingSlots = TIME_SLOTS.length - startSlotIndex;
                          let maxCardHeight = remainingSlots * slotHeight;
                          
                          // If there's a job after this one, cap the height to avoid overlap (with small gap)
                          if (maxBeforeNextJob !== null) {
                            maxCardHeight = Math.min(maxCardHeight, maxBeforeNextJob - 4);
                          }
                          
                          // Minimum height for legibility (at least one slot minus padding)
                          const minCardHeight = slotHeight - 8;
                          const clampedCardHeight = Math.max(
                            Math.min(cardHeight, maxCardHeight),
                            minCardHeight
                          );
                          
                          return (
                            <HoverCard key={job.id + (job._isContinuation ? '-cont' : '')} openDelay={300} closeDelay={100}>
                              <HoverCardTrigger asChild>
                                <div 
                                  className="absolute left-1 right-1 pointer-events-auto"
                                  style={{ top: topPosition + 2, height: clampedCardHeight - 6 }}
                                >
                                  <div 
                                    className={cn(
                                      "h-full p-2 text-xs cursor-pointer z-10 relative pl-3",
                                      "transition-all duration-200 ease-out",
                                      // For Visit: use CSS class; For Service: apply status-based colors
                                      job.jobType === 'visit' 
                                        ? 'schedule-card-visit' 
                                        : cn('schedule-card-service', statusConfig[job.status].cardBgClass),
                                      job._isContinuation && "opacity-90"
                                    )}
                                    onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                  >
                                    {/* Status indicator stripe on left edge */}
                                    <div className={cn(
                                      "schedule-status-indicator",
                                      statusConfig[job.status].indicatorClass
                                    )} />
                                    
                                    {/* Continuation visual indicator (top gradient) */}
                                    {job._isContinuation && (
                                      <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-b from-muted-foreground/10 to-transparent rounded-t-xl" />
                                    )}
                                    
                                    {/* Adaptive Card content based on available height */}
                                    {(() => {
                                      const isCompact = clampedCardHeight < 55;
                                      const isMedium = !isCompact && clampedCardHeight < 80;
                                      const isVisit = job.jobType === 'visit';
                                      
                                      return (
                                        <div className="flex flex-col h-full overflow-hidden">
                                          {/* Row 1: Type Badge + Client (always show) */}
                                          <div className="flex items-center gap-1.5 mb-0.5">
                                            {!isCompact && (
                                              <Badge 
                                                variant="outline" 
                                                className={cn(
                                                  "text-[7px] px-1.5 py-0 h-3.5 flex-shrink-0",
                                                  getTypeBadgeClass(job)
                                                )}
                                              >
                                                {isVisit ? 'VISIT' : 'SVC'}
                                              </Badge>
                                            )}
                                            <span className={cn(
                                              "font-semibold truncate flex-1",
                                              isCompact ? "text-[9px]" : "text-[11px]",
                                              isVisit && "text-purple-700 dark:text-purple-300"
                                            )}>
                                              {job.clientName}
                                            </span>
                                            {/* Status dot for compact mode */}
                                            {isCompact && (
                                              <span className={cn(
                                                "w-2 h-2 rounded-full flex-shrink-0",
                                                statusConfig[job.status].dotClass
                                              )} />
                                            )}
                                          </div>
                                          
                                          {/* Row 2: Time range (always show) */}
                                          <p className={cn(
                                            "font-medium text-foreground/75",
                                            isCompact ? "text-[8px]" : "text-[10px]"
                                          )}>
                                            {formatTimeDisplay(job.time)}{!isCompact && ` – ${crossesMidnight ? '12:00 AM' : formatTimeDisplay(endTime)}`}
                                          </p>
                                          
                                          {/* Row 3: Status badge (only in standard mode) */}
                                          {!isMedium && !isCompact && (
                                            <Badge 
                                              variant="outline" 
                                              className={cn(
                                                "text-[7px] px-1.5 py-0 h-3.5 w-fit mt-0.5",
                                                statusConfig[job.status].badgeClass
                                              )}
                                            >
                                              {statusConfig[job.status].label}
                                            </Badge>
                                          )}
                                          
                                          {/* Row 4: Employee (only if enough height) */}
                                          {!isMedium && !isCompact && (
                                            <p className="text-[8px] text-muted-foreground truncate mt-auto">
                                              {job.employeeName}
                                            </p>
                                          )}
                                        </div>
                                      );
                                    })()}
                                    
                                    {/* Crosses midnight visual indicator (bottom gradient + arrow) */}
                                    {crossesMidnight && (
                                      <>
                                        <div className="absolute bottom-0 inset-x-0 h-3 bg-gradient-to-t from-warning/15 to-transparent rounded-b-xl" />
                                        <div className="absolute bottom-1 right-1.5">
                                          <ArrowRight className="h-3 w-3 text-warning/70" />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </HoverCardTrigger>
                              <HoverCardContent 
                                side="top" 
                                align="center"
                                sideOffset={12}
                                collisionPadding={40}
                                className="w-80 p-0 shadow-2xl border-0 overflow-hidden z-[100]"
                              >
                                {/* Premium Header with prominent type badge */}
                                <div className={cn("p-4", getHoverCardHeaderClass(job))}>
                                  <Badge className={cn("text-sm px-4 py-1.5 shadow-md", getTypeBadgeClass(job, true))}>
                                    {job.jobType === 'visit' ? 'VISIT' : 'SERVICE'}
                                  </Badge>
                                </div>
                                
                                {/* Status banner */}
                                <div className={cn(
                                  "px-4 py-2 flex items-center gap-2 border-b border-border/30",
                                  statusConfig[job.status].badgeClass
                                )}>
                                  <span className={cn(
                                    "w-2 h-2 rounded-full flex-shrink-0",
                                    statusConfig[job.status].dotClass
                                  )} />
                                  <span className="font-semibold text-sm">{statusConfig[job.status].label}</span>
                                  {job.status === 'in-progress' && <span className="animate-pulse">●</span>}
                                </div>
                                
                                {/* Content */}
                                <div className="p-4 space-y-3">
                                  {/* Continuation notice */}
                                  {job._isContinuation && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                                      <div className="w-1 h-3 rounded-full bg-muted-foreground/30" />
                                      <span className="italic">Continues from previous day</span>
                                    </div>
                                  )}
                                  
                                  {/* Client Name - Hero element */}
                                  <h4 className="font-bold text-lg">{job.clientName}</h4>
                                  
                                  {/* Details Grid */}
                                  <div className="space-y-2 text-sm">
                                    {/* Date + Time */}
                                    <div className="flex items-start gap-3">
                                      <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium">{format(toSafeLocalDate(job.date), 'EEE, MMM d')}</p>
                                        <p className="text-muted-foreground">
                                          {formatTimeDisplay(job.time)} – {crossesMidnight ? '12:00 AM (next day)' : formatTimeDisplay(endTime)} ({job.duration})
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Address */}
                                    <div className="flex items-start gap-3">
                                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                      <p className={cn(
                                        job.address === 'No address' && "text-muted-foreground/60 italic"
                                      )}>
                                        {job.address}
                                      </p>
                                    </div>
                                    
                                    {/* Assigned */}
                                    <div className="flex items-center gap-3">
                                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      <p className="font-medium">{job.employeeName}</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Quick Actions Footer */}
                                <div className="flex items-center gap-2 p-3 bg-muted/30 border-t">
                                  <Button 
                                    size="sm" 
                                    className="flex-1 h-8"
                                    onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                  >
                                    Open Details
                                  </Button>
                                  {isAdminOrManager && job.status === 'scheduled' && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      className="h-8"
                                      onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}
                                    >
                                      <Pencil className="h-3.5 w-3.5 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </div>
                              </HoverCardContent>
                            </HoverCard>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Day View */}
        {view === 'day' && (
          <Card className="border-border/40 shadow-soft-sm">
            <div className="p-4 border-b border-border/40 bg-muted/10">
              <h3 className={cn(
                "text-base font-medium",
                isToday(currentDate) && "text-primary"
              )}>
                {format(currentDate, 'EEEE, MMMM d, yyyy')}
                {isToday(currentDate) && (
                  <span className="ml-2 text-xs font-normal text-primary/70">(Today)</span>
                )}
              </h3>
            </div>
            <CardContent className="p-0 overflow-hidden">
              <div className="relative overflow-y-auto overflow-x-hidden" style={{ maxHeight: focusMode ? 'calc(100vh - 40px)' : 'calc(100vh - 80px)' }}>
                {/* Current Time Indicator - Enhanced with floating label */}
                {isTodayForIndicator(currentDate) && (
                  <div 
                    className="schedule-current-time-line"
                    style={{ top: getCurrentTimePosition() }}
                  >
                    <div className="schedule-current-time-dot" />
                    <div className="schedule-current-time-label">
                      Now · {currentTimeLabel}
                    </div>
                  </div>
                )}
                
                {/* Time slots grid as background - Increased height for better cards */}
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
                        "flex gap-3 border-b schedule-grid-line last:border-b-0 h-20 min-w-0",
                        isAdminOrManager && !isOccupied && "hover:bg-primary/5 cursor-pointer transition-colors"
                      )}
                      onClick={() => isAdminOrManager && !isOccupied && handleTimeSlotClick(currentDate, slot.value)}
                    >
                      <div className="w-20 text-sm text-muted-foreground shrink-0 flex items-start justify-center pt-3 bg-muted/5 border-r border-border/20">
                        {slot.label}
                      </div>
                      <div className="flex-1 relative min-w-0 overflow-hidden" />
                    </div>
                  );
                })}
                
                {/* Overlay jobs with absolute positioning - Premium HoverCard */}
                {(() => {
                  const dayJobs = getJobsForDate(currentDate);
                  return dayJobs.map((job) => {
                    const startSlotIndex = TIME_SLOTS.findIndex(s => s.value === job.time);
                    if (startSlotIndex === -1) return null;
                    
                    const rowSpan = getJobRowSpan(job);
                    const slotHeight = 80; // h-20 = 80px (increased from 56px for better card display)
                    const topPosition = startSlotIndex * slotHeight;
                    const cardHeight = rowSpan * slotHeight;
                    const endTime = calculateEndTime(job.time, job.duration);
                    const crossesMidnight = !job._isContinuation && doesJobCrossMidnight(job._originalTime || job.time, job._originalDuration || job.duration);
                    
                    // Calculate maximum height before the next job starts (to prevent overlap)
                    const maxBeforeNextJob = getMaxHeightBeforeNextJob(job, dayJobs, slotHeight);
                    
                    // Clamp height to available slots remaining in the grid
                    const remainingSlots = TIME_SLOTS.length - startSlotIndex;
                    let maxCardHeight = remainingSlots * slotHeight;
                    
                    // If there's a job after this one, cap the height to avoid overlap (with small gap)
                    if (maxBeforeNextJob !== null) {
                      maxCardHeight = Math.min(maxCardHeight, maxBeforeNextJob - 6);
                    }
                    
                    // Minimum height for legibility (at least ~100px for all info)
                    const minCardHeight = 100;
                    const clampedCardHeight = Math.max(
                      Math.min(cardHeight, maxCardHeight),
                      minCardHeight
                    );
                    
                    const isVisit = job.jobType === 'visit';
                  
                  return (
                    <HoverCard key={job.id + (job._isContinuation ? '-cont' : '')} openDelay={300} closeDelay={100}>
                      <HoverCardTrigger asChild>
                        <div
                          className="schedule-event left-20 right-3"
                          style={{ top: topPosition + 4, height: clampedCardHeight - 8 }}
                        >
                          <div 
                            className={cn(
                              "h-full p-3 cursor-pointer relative pl-5",
                              "transition-all duration-200 ease-out",
                              // For Visit: use CSS class; For Service: apply status-based colors
                              job.jobType === 'visit' 
                                ? 'schedule-card-visit' 
                                : cn('schedule-card-service', statusConfig[job.status].cardBgClass),
                              job._isContinuation && "opacity-90"
                            )}
                            onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                          >
                            {/* Status indicator stripe on left edge */}
                            <div className={cn(
                              "schedule-status-indicator",
                              statusConfig[job.status].indicatorClass
                            )} />
                            
                            {/* Continuation visual indicator (top gradient) */}
                            {job._isContinuation && (
                              <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-b from-muted-foreground/10 to-transparent rounded-t-xl" />
                            )}
                            
                            {/* Enhanced Day View Card Layout: Type > Client > User > Time > Status */}
                            <div className="flex flex-col h-full justify-between overflow-hidden">
                              {/* Row 1: Type Badge + Status (aligned right) */}
                              <div className="flex items-center justify-between mb-1">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 h-5 flex-shrink-0",
                                    getTypeBadgeClass(job)
                                  )}
                                >
                                  {isVisit ? 'VISIT' : 'SERVICE'}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-[10px] px-2 py-0.5 flex-shrink-0",
                                    statusConfig[job.status].badgeClass
                                  )}
                                >
                                  {statusConfig[job.status].label}
                                </Badge>
                              </div>
                              
                              {/* Row 2: Client Name - Hero (never truncated) */}
                              <h4 className={cn(
                                "font-bold text-base text-foreground leading-tight",
                                isVisit && "text-purple-700 dark:text-purple-300"
                              )}>
                                {job.clientName}
                              </h4>
                              
                              {/* Row 3: Responsible User */}
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="font-medium truncate">{job.employeeName}</span>
                              </div>
                              
                              {/* Row 4: Time Range */}
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>
                                  {formatTimeDisplay(job.time)} – {crossesMidnight ? '12:00 AM' : formatTimeDisplay(endTime)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Crosses midnight visual indicator (bottom gradient + arrow) */}
                            {crossesMidnight && (
                              <>
                                <div className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-warning/15 to-transparent rounded-b-xl" />
                                <div className="absolute bottom-2 right-3">
                                  <ArrowRight className="h-4 w-4 text-warning/70" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent 
                        side="top" 
                        align="center"
                        sideOffset={12}
                        collisionPadding={40}
                        className="w-80 p-0 shadow-2xl border-0 overflow-hidden z-[100]"
                      >
                        {/* Premium Header with prominent type badge */}
                        <div className={cn("p-4", getHoverCardHeaderClass(job))}>
                          <Badge className={cn("text-sm px-4 py-1.5 shadow-md", getTypeBadgeClass(job, true))}>
                            {job.jobType === 'visit' ? 'VISIT' : 'SERVICE'}
                          </Badge>
                        </div>
                        
                        {/* Status banner */}
                        <div className={cn(
                          "px-4 py-2 flex items-center gap-2 border-b border-border/30",
                          statusConfig[job.status].badgeClass
                        )}>
                          <span className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            statusConfig[job.status].dotClass
                          )} />
                          <span className="font-semibold text-sm">{statusConfig[job.status].label}</span>
                          {job.status === 'in-progress' && <span className="animate-pulse">●</span>}
                        </div>
                        
                        {/* Content */}
                        <div className="p-4 space-y-3">
                          {job._isContinuation && (
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-2 py-1 rounded">
                              <div className="w-1 h-3 rounded-full bg-muted-foreground/30" />
                              <span className="italic">Continues from previous day</span>
                            </div>
                          )}
                          
                          <h4 className="font-bold text-lg">{job.clientName}</h4>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-3">
                              <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="font-medium">{format(toSafeLocalDate(job.date), 'EEE, MMM d')}</p>
                                <p className="text-muted-foreground">
                                  {formatTimeDisplay(job.time)} – {crossesMidnight ? '12:00 AM (next day)' : formatTimeDisplay(endTime)} ({job.duration})
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                              <p className={cn(job.address === 'No address' && "text-muted-foreground/60 italic")}>
                                {job.address}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <p className="font-medium">{job.employeeName}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 p-3 bg-muted/30 border-t">
                          <Button size="sm" className="flex-1 h-8" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}>
                            Open Details
                          </Button>
                          {isAdminOrManager && job.status === 'scheduled' && (
                            <Button variant="outline" size="sm" className="h-8" onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                });
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline View - Enhanced with date grouping */}
        {view === 'timeline' && (
          <div className="space-y-3">
            {filteredJobs.length === 0 ? (
              <Card className="border-border/40 shadow-soft-sm">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No jobs scheduled</p>
                </CardContent>
              </Card>
            ) : (
              (() => {
                // Group jobs by date
                const jobsByDate = filteredJobs.reduce((acc, job) => {
                  const dateKey = job.date;
                  if (!acc[dateKey]) acc[dateKey] = [];
                  acc[dateKey].push(job);
                  return acc;
                }, {} as Record<string, typeof filteredJobs>);
                
                // Sort dates
                const sortedDates = Object.keys(jobsByDate).sort((a, b) => 
                  toSafeLocalDate(a).getTime() - toSafeLocalDate(b).getTime()
                );
                
                return sortedDates.map((dateKey) => {
                  const dateJobs = jobsByDate[dateKey];
                  const dateObj = toSafeLocalDate(dateKey);
                  const isDateToday = isToday(dateObj);
                  
                  return (
                    <div key={dateKey} className="space-y-1.5">
                      {/* Date Header - Sticky */}
                      <div className={cn(
                        "sticky top-0 z-10 backdrop-blur-sm py-2 px-3 rounded-lg flex items-center justify-between",
                        isDateToday 
                          ? "bg-primary/10 border border-primary/20" 
                          : "bg-muted/60 border border-border/30"
                      )}>
                        <div className="flex items-center gap-2">
                          <CalendarIcon className={cn(
                            "h-4 w-4",
                            isDateToday ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "font-semibold text-sm",
                            isDateToday && "text-primary"
                          )}>
                            {format(dateObj, 'EEEE, MMMM d, yyyy')}
                          </span>
                          {isDateToday && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 bg-primary/10 text-primary">
                              Today
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dateJobs.length} {dateJobs.length === 1 ? 'job' : 'jobs'}
                        </span>
                      </div>
                      
                      {/* Jobs for this date */}
                      {dateJobs.map((job) => {
                        const config = statusConfig[job.status];
                        const crossesMidnight = doesJobCrossMidnight(job.time, job.duration);
                        
                        return (
                          <Card 
                            key={job.id} 
                            className={cn(
                              "border-l-4 cursor-pointer overflow-hidden shadow-soft-sm ml-2",
                              "transition-all duration-200 ease-out",
                              "hover:shadow-soft-md hover:-translate-y-0.5 hover:scale-[1.002]",
                              "active:scale-[0.998] active:shadow-soft-sm",
                              job.jobType === 'visit' 
                                ? "border-l-purple-500 bg-purple-500/12"
                                : cn(statusConfig[job.status].cardBorderClass, statusConfig[job.status].cardBgClass)
                            )}
                            onClick={() => setSelectedJob(job)}
                          >
                            <CardContent className="p-3.5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  {/* Time block */}
                                  <div className="text-center min-w-[55px] flex-shrink-0">
                                    <p className="text-base font-semibold leading-tight">{formatTimeDisplay(job.time)}</p>
                                    <p className="text-[10px] text-muted-foreground">{job.duration}</p>
                                  </div>
                                  
                                  <div className="h-9 w-px bg-border/40 flex-shrink-0" />
                                  
                                  {/* Main content */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      {job.jobType === 'visit' ? (
                                        <Eye className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                                      ) : (
                                        <Sparkles className="h-3.5 w-3.5 text-primary/70 flex-shrink-0" />
                                      )}
                                      <span className="font-semibold text-sm truncate">{job.clientName}</span>
                                      <Badge 
                                        variant="outline" 
                                        className={cn(
                                          "text-[9px] px-1.5 py-0 flex-shrink-0",
                                          job.jobType === 'visit' 
                                            ? "border-purple-500/30 bg-purple-500/12 text-purple-600 dark:text-purple-400" 
                                            : "border-primary/30 bg-primary/5 text-primary"
                                        )}
                                      >
                                        {job.jobType === 'visit' ? 'Visit' : 'Service'}
                                      </Badge>
                                      {crossesMidnight && (
                                        <div className="flex items-center gap-0.5 text-[9px] text-warning">
                                          <ArrowRight className="h-2.5 w-2.5" />
                                          <span>Next day</span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                                      <MapPin className="h-3 w-3 flex-shrink-0" />
                                      {job.address}
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Right side: Employee + Status */}
                                <div className="flex items-center gap-2.5 flex-shrink-0">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span className="max-w-[80px] truncate">{job.employeeName}</span>
                                  </div>
                                  <Badge className={cn("text-[9px] px-2 py-0.5", config.bgColor, config.color)}>
                                    {config.label}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                });
              })()
            )}
          </div>
        )}
      </div>

      {/* Compact Status Legend */}
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 py-0.5 px-1 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5 text-primary/70" />
          <span>Service</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="h-2.5 w-2.5 text-purple-500/70" />
          <span>Visit</span>
        </div>
        <div className="h-2.5 w-px bg-border/40" />
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={cn("h-1.5 w-1.5 rounded-full", config.dotClass)} />
            <span>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Job Details Sheet - Right-side drawer for premium UX */}
      <Sheet open={!!selectedJob && !showCompletion} onOpenChange={() => setSelectedJob(null)}>
        <SheetContent side="right" className="w-[400px] p-0 overflow-hidden" allowCloseOnOutsideClick>
          {selectedJob && (
            <>
              {/* Premium Header with Type Badge */}
              <div className={cn("p-5", getHoverCardHeaderClass(selectedJob))}>
                <Badge className={cn("text-sm px-4 py-1.5 shadow-md", getTypeBadgeClass(selectedJob, true))}>
                  {selectedJob.jobType === 'visit' ? 'VISIT' : 'SERVICE'}
                </Badge>
              </div>
              
              {/* Status Banner */}
              <div className={cn(
                "px-5 py-3 flex items-center gap-2.5 border-b border-border/30",
                statusConfig[selectedJob.status].badgeClass
              )}>
                <span className={cn(
                  "w-2.5 h-2.5 rounded-full flex-shrink-0",
                  statusConfig[selectedJob.status].dotClass
                )} />
                <span className="font-semibold">{statusConfig[selectedJob.status].label}</span>
                {selectedJob.status === 'in-progress' && <span className="animate-pulse ml-auto">●</span>}
              </div>
              
              {/* Content */}
              <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                {/* Continuation notice */}
                {selectedJob._isContinuation && (
                  <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md border border-dashed border-border/50">
                    ↳ This is the continuation of a job that started on the previous day
                  </div>
                )}
                
                {/* Client Name - Hero Element */}
                <div>
                  <h3 className="text-xl font-bold">{selectedJob.clientName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    {selectedJob.address}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t.job.time}</p>
                      <p className="text-sm font-medium">
                        {formatTimeDisplay(selectedJob._originalTime || selectedJob.time)} ({selectedJob._originalDuration || selectedJob.duration})
                      </p>
                      {selectedJob._isContinuation && (
                        <p className="text-[10px] text-muted-foreground italic mt-0.5">
                          Showing on this day: {formatTimeDisplay(selectedJob.time)} ({selectedJob.duration})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t.job.assignedEmployee}</p>
                      <p className="text-sm font-medium">{selectedJob.employeeName}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-muted/20 border-t border-border/30">
                <div className="flex flex-wrap gap-2">
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

                  {/* Complete button */}
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
                          {selectedJob.paymentMethod !== 'cash' ? (
                            <>
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleViewInvoice(selectedJob)}>
                                <Receipt className="h-4 w-4" />
                                Invoice
                              </Button>
                              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSendInvoiceEmail(selectedJob)}>
                                <Mail className="h-4 w-4" />
                                Email
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground">
                              <Receipt className="h-3.5 w-3.5" />
                              <span>Cash payment - Receipt generated</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/calculator?clientId=${selectedJob.clientId}`)}>
                            <Calculator className="h-4 w-4" />
                            Estimate
                          </Button>
                          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/contracts?clientId=${selectedJob.clientId}`)}>
                            <FileText className="h-4 w-4" />
                            Contract
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
                        onClick={() => handleOpenCancelJob(selectedJob)}
                        title="Cancel Job"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Job Modal (Enterprise) */}
      <NewBookingModal
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

      {/* Cancel Job Modal (Enterprise Governance) */}
      <CancelJobModal
        open={showCancelModal}
        onOpenChange={setShowCancelModal}
        job={jobToCancel}
        onSuccess={handleJobCancelled}
      />
    </div>
  );
};

export default Schedule;
