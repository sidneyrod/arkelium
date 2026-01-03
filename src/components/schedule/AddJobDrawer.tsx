import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Loader2, AlertTriangle, CalendarOff, Sparkles, Eye, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScheduledJob } from '@/stores/scheduleStore';
import { jobSchema, validateForm } from '@/lib/validations';
import { useScheduleValidation } from '@/hooks/useScheduleValidation';
import { useCleanerBlockCheck } from '@/hooks/useCleanerBlockCheck';
import { toast } from 'sonner';

export type ServiceType = 'cleaning' | 'visit';

interface AddJobDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (job: Omit<ScheduledJob, 'id'>) => void;
  job?: ScheduledJob;
  preselectedDate?: Date | null;
  preselectedTime?: string | null;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface ClientLocation {
  id: string;
  client_id: string;
  address: string;
  city?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

// Generate 24-hour time slots in AM/PM format
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

const AddJobDrawer = ({ open, onOpenChange, onSave, job, preselectedDate, preselectedTime }: AddJobDrawerProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isEditing = !!job;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [unavailableCleaners, setUnavailableCleaners] = useState<string[]>([]);
  const [blockedCleaners, setBlockedCleaners] = useState<string[]>([]);
  const { validateSchedule, getAvailableCleaners, canScheduleForClient } = useScheduleValidation();
  const { getBlockedCleanersForDate, validateJobCreation } = useCleanerBlockCheck();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  const [formData, setFormData] = useState({
    clientId: job?.clientId || '',
    clientName: job?.clientName || '',
    address: job?.address || '',
    date: job?.date ? new Date(job.date) : preselectedDate || new Date(),
    time: job?.time || preselectedTime || '09:00',
    duration: job?.duration || '2h',
    employeeId: job?.employeeId || '',
    employeeName: job?.employeeName || '',
    services: job?.services || ['Standard Clean'],
    notes: job?.notes || '',
    status: job?.status || 'scheduled' as const,
    // Service type - the core distinction
    serviceType: (job?.jobType === 'visit' ? 'visit' : 'cleaning') as ServiceType,
    // Visit-specific fields
    visitPurpose: job?.visitPurpose || '',
    visitRoute: job?.visitRoute || '',
    visitOutcome: '' as 'completed' | 'no_show' | 'follow_up' | '',
    // Cleaning-specific fields (financial)
    estimatedValue: '',
    financialNotes: '',
  });

  // Fetch clients and employees
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      setIsLoading(true);
      
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
        
        const [clientsRes, employeesRes, locationsRes] = await Promise.all([
          supabase.from('clients').select('id, name, email, phone').eq('company_id', companyId),
          supabase.from('profiles').select('id, first_name, last_name').eq('company_id', companyId),
          supabase.from('client_locations').select('id, client_id, address, city').eq('company_id', companyId),
        ]);
        
        if (clientsRes.data) setClients(clientsRes.data);
        if (employeesRes.data) setEmployees(employeesRes.data);
        if (locationsRes.data) setLocations(locationsRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      
      setIsLoading(false);
    };
    
    fetchData();
  }, [open, user]);

  // Update date and time when preselected values change
  useEffect(() => {
    if (!job) {
      setFormData(prev => ({
        ...prev,
        date: preselectedDate || prev.date,
        time: preselectedTime || prev.time,
      }));
    }
  }, [preselectedDate, preselectedTime, job]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      if (job) {
        const [year, month, day] = job.date.split('-').map(Number);
        const jobDate = new Date(year, month - 1, day, 12, 0, 0);
        
        setFormData({
          clientId: job.clientId,
          clientName: job.clientName,
          address: job.address,
          date: jobDate,
          time: job.time,
          duration: job.duration,
          employeeId: job.employeeId,
          employeeName: job.employeeName,
          services: job.services,
          notes: job.notes || '',
          status: job.status,
          serviceType: job.jobType === 'visit' ? 'visit' : 'cleaning',
          visitPurpose: job.visitPurpose || '',
          visitRoute: job.visitRoute || '',
          visitOutcome: '',
          estimatedValue: '',
          financialNotes: '',
        });
      } else {
        let initialDate = new Date();
        if (preselectedDate) {
          initialDate = new Date(preselectedDate.getFullYear(), preselectedDate.getMonth(), preselectedDate.getDate(), 12, 0, 0);
        } else {
          initialDate = new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate(), 12, 0, 0);
        }
        
        setFormData({
          clientId: '',
          clientName: '',
          address: '',
          date: initialDate,
          time: preselectedTime || '09:00',
          duration: '2h',
          employeeId: '',
          employeeName: '',
          services: ['Standard Clean'],
          notes: '',
          status: 'scheduled',
          serviceType: 'cleaning',
          visitPurpose: '',
          visitRoute: '',
          visitOutcome: '',
          estimatedValue: '',
          financialNotes: '',
        });
      }
      setErrors({});
    }
  }, [open, job, preselectedDate, preselectedTime]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      const clientLocations = locations.filter(l => l.client_id === clientId);
      const address = clientLocations.length > 0 
        ? `${clientLocations[0].address}${clientLocations[0].city ? `, ${clientLocations[0].city}` : ''}`
        : '';
      
      setFormData(prev => ({ ...prev, clientId, clientName: client.name, address }));
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 'Unknown',
      }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const safeDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
      setFormData(prev => ({ ...prev, date: safeDate }));
      setCalendarOpen(false);
    }
  };

  // Check cleaner availability
  useEffect(() => {
    const checkAvailability = async () => {
      if (!formData.date || !formData.time || !user?.profile?.company_id) return;
      
      const year = formData.date.getFullYear();
      const month = String(formData.date.getMonth() + 1).padStart(2, '0');
      const day = String(formData.date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const unavailable = await getAvailableCleaners(dateString, formData.time, formData.duration, user.profile.company_id, job?.id);
      setUnavailableCleaners(unavailable);
      
      const blocked = await getBlockedCleanersForDate(dateString, user.profile.company_id);
      setBlockedCleaners(blocked);
    };
    
    checkAvailability();
  }, [formData.date, formData.time, formData.duration, user?.profile?.company_id, job?.id, getAvailableCleaners, getBlockedCleanersForDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const validationData = {
      clientId: formData.clientId,
      employeeId: formData.employeeId,
      date: dateString,
      time: formData.time,
      duration: formData.duration,
      services: formData.services,
      notes: formData.notes,
    };

    const result = validateForm(jobSchema, validationData);
    if ('errors' in result && !result.success) {
      setErrors(result.errors);
      return;
    }

    if (user?.profile?.company_id) {
      setIsValidating(true);
      
      const blockCheck = await validateJobCreation(formData.employeeId, dateString, user.profile.company_id);
      if (!blockCheck.canCreate) {
        setIsValidating(false);
        toast.error(blockCheck.message || 'Employee unavailable on this date.');
        return;
      }
      
      // Only check contract for cleaning jobs
      if (formData.serviceType === 'cleaning') {
        const contractCheck = await canScheduleForClient(formData.clientId, user.profile.company_id);
        if (!contractCheck.isValid) {
          setIsValidating(false);
          toast.error(contractCheck.message);
          return;
        }
      }
      
      const conflictCheck = await validateSchedule(
        { clientId: formData.clientId, employeeId: formData.employeeId, date: dateString, time: formData.time, duration: formData.duration, jobId: job?.id },
        user.profile.company_id
      );
      setIsValidating(false);
      
      if (!conflictCheck.isValid) {
        toast.error(conflictCheck.message);
        return;
      }
    }

    setErrors({});
    
    const jobData = {
      ...formData,
      date: dateString,
      jobType: formData.serviceType,
    };
    
    onSave(jobData as any);
    onOpenChange(false);
  };

  const formatTimeDisplay = (time24: string) => {
    const slot = TIME_SLOTS.find(s => s.value === time24);
    return slot?.label || time24;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.serviceType === 'visit' ? (
              <Eye className="h-5 w-5 text-purple-500" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
            {isEditing ? 'Edit Booking' : 'New Booking'}
          </DialogTitle>
          <DialogDescription>
            {formData.serviceType === 'visit' 
              ? 'Schedule a non-billable visit (inspection, quote, consultation)'
              : 'Schedule a billable cleaning service'
            }
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* Service Type Toggle */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Service Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formData.serviceType === 'cleaning' ? 'default' : 'outline'}
                  className={cn(
                    "h-12 flex flex-col items-center gap-1",
                    formData.serviceType === 'cleaning' && "bg-primary"
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, serviceType: 'cleaning' }))}
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">Cleaning</span>
                </Button>
                <Button
                  type="button"
                  variant={formData.serviceType === 'visit' ? 'default' : 'outline'}
                  className={cn(
                    "h-12 flex flex-col items-center gap-1",
                    formData.serviceType === 'visit' && "bg-purple-600 hover:bg-purple-700"
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, serviceType: 'visit' }))}
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">Visit</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.serviceType === 'visit' 
                  ? '⚠️ Visits are non-billable and won\'t generate invoices or receipts'
                  : '✓ Cleaning services are billable and generate financial records'
                }
              </p>
            </div>

            <Separator />

            {/* Client */}
            <div className="space-y-2">
              <Label className="text-sm">Client</Label>
              <Select value={formData.clientId} onValueChange={handleClientChange}>
                <SelectTrigger className={errors.clientId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {clients.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">No clients found</div>
                  ) : (
                    clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.clientId && <p className="text-xs text-destructive">{errors.clientId}</p>}
            </div>
            
            {formData.address && (
              <div className="space-y-2">
                <Label className="text-sm">Address</Label>
                <Input value={formData.address} disabled className="bg-muted" />
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formData.date, 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={handleDateSelect}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Start Time</Label>
                <Select value={formData.time} onValueChange={(time) => setFormData(prev => ({ ...prev, time }))}>
                  <SelectTrigger>
                    <SelectValue>{formatTimeDisplay(formData.time)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-[200px]">
                    {TIME_SLOTS.map(slot => (
                      <SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Duration & Employee */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Duration</Label>
                <Select value={formData.duration} onValueChange={(duration) => setFormData(prev => ({ ...prev, duration }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {['30m', '1h', '1.5h', '2h', '2.5h', '3h', '3.5h', '4h', '5h', '6h', '8h'].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Assigned To</Label>
                <Select value={formData.employeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {employees.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">No employees</div>
                    ) : (
                      employees.map(emp => {
                        const isUnavailable = unavailableCleaners.includes(emp.id);
                        const isBlocked = blockedCleaners.includes(emp.id);
                        const isDisabled = isUnavailable || isBlocked;
                        const empName = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                        return (
                          <SelectItem key={emp.id} value={emp.id} disabled={isDisabled} className={isDisabled ? 'opacity-50' : ''}>
                            <div className="flex items-center gap-2">
                              <span>{empName}</span>
                              {isBlocked && <span className="text-xs text-destructive flex items-center gap-1"><CalendarOff className="h-3 w-3" />Off</span>}
                              {isUnavailable && !isBlocked && <span className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Busy</span>}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
                {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
              </div>
            </div>

            <Separator />

            {/* VISIT-SPECIFIC FIELDS */}
            {formData.serviceType === 'visit' && (
              <div className="space-y-4 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium text-sm">Visit Details</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Purpose</Label>
                  <Select value={formData.visitPurpose} onValueChange={(v) => setFormData(prev => ({ ...prev, visitPurpose: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select purpose..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="quote">Quote / Estimate</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="walkthrough">Walkthrough</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Route / Instructions</Label>
                  <Textarea
                    value={formData.visitRoute}
                    onChange={(e) => setFormData(prev => ({ ...prev, visitRoute: e.target.value }))}
                    placeholder="Route, stops, or special instructions..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* CLEANING-SPECIFIC FIELDS */}
            {formData.serviceType === 'cleaning' && (
              <div className="space-y-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-primary">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium text-sm">Service Details</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm">Service Type</Label>
                  <Select value={formData.services[0]} onValueChange={(service) => setFormData(prev => ({ ...prev, services: [service] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="Standard Clean">Standard Clean</SelectItem>
                      <SelectItem value="Deep Clean">Deep Clean</SelectItem>
                      <SelectItem value="Move-out Clean">Move-out Clean</SelectItem>
                      <SelectItem value="Office Clean">Office Clean</SelectItem>
                      <SelectItem value="Daily Clean">Daily Clean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Internal Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Notes for the team..."
                rows={2}
              />
            </div>

            {/* Footer */}
            <DialogFooter className="pt-4">
              <div className="flex gap-2 w-full sm:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={clients.length === 0 || employees.length === 0 || isValidating}
                  className={cn("flex-1 sm:flex-none", formData.serviceType === 'visit' && "bg-purple-600 hover:bg-purple-700")}
                >
                  {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update' : 'Schedule'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddJobDrawer;
