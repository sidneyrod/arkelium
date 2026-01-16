import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePickerDialog } from '@/components/ui/date-picker-dialog';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertTriangle, CalendarOff, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScheduledJob } from '@/stores/scheduleStore';
import { jobSchema, validateForm } from '@/lib/validations';
import { useScheduleValidation } from '@/hooks/useScheduleValidation';
import { useCleanerBlockCheck } from '@/hooks/useCleanerBlockCheck';
import { toast } from 'sonner';

// Enterprise Components
import { OperationTypeSelector, OperationType } from './OperationTypeSelector';
import { ActivitySelector } from './ActivitySelector';
import { OperatingCompanySelector } from './OperatingCompanySelector';
import { ServiceTypeSelector } from './ServiceTypeSelector';
import { ServiceCatalogItem } from '@/hooks/useServiceCatalog';

interface NewBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (job: Omit<ScheduledJob, 'id'> & { 
    operationType?: OperationType;
    activityCode?: string;
    operatingCompanyId?: string;
    serviceCatalogId?: string | null;
    billableAmount?: number;
  }) => void;
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

const DURATION_OPTIONS = [
  { value: '30m', label: '30 min' },
  { value: '1h', label: '1 hour' },
  { value: '1h30m', label: '1h 30min' },
  { value: '2h', label: '2 hours' },
  { value: '2h30m', label: '2h 30min' },
  { value: '3h', label: '3 hours' },
  { value: '3h30m', label: '3h 30min' },
  { value: '4h', label: '4 hours' },
  { value: '5h', label: '5 hours' },
  { value: '6h', label: '6 hours' },
  { value: '8h', label: '8 hours' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'e_transfer', label: 'E-Transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

export function NewBookingModal({ 
  open, 
  onOpenChange, 
  onSave, 
  job, 
  preselectedDate, 
  preselectedTime 
}: NewBookingModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { activeCompanyId, activeCompanyName } = useActiveCompanyStore();
  const isEditing = !!job;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [unavailableCleaners, setUnavailableCleaners] = useState<string[]>([]);
  const [blockedCleaners, setBlockedCleaners] = useState<string[]>([]);
  const { validateSchedule, getAvailableCleaners, canScheduleForClient } = useScheduleValidation();
  const { getBlockedCleanersForDate, validateJobCreation } = useCleanerBlockCheck();
  
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<ClientLocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Enterprise fields
  const [operationType, setOperationType] = useState<OperationType>('billable_service');
  const [activityCode, setActivityCode] = useState('cleaning');
  const [activityLabel, setActivityLabel] = useState('Cleaning Services');
  const [operatingCompanyId, setOperatingCompanyId] = useState(activeCompanyId || '');
  const [operatingCompanyName, setOperatingCompanyName] = useState(activeCompanyName || '');
  const [serviceCatalogId, setServiceCatalogId] = useState<string | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [selectedService, setSelectedService] = useState<ServiceCatalogItem | null>(null);
  
  // Standard form data
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
    visitPurpose: job?.visitPurpose || '',
    visitRoute: job?.visitRoute || '',
    // Billing fields
    billableAmount: '',
    paymentMethod: 'e_transfer',
  });

  // Fetch clients and employees for the operating company
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      const companyToUse = operatingCompanyId || activeCompanyId;
      if (!companyToUse) return;
      
      setIsLoading(true);
      
      try {
        const [clientsRes, employeesRes, locationsRes] = await Promise.all([
          supabase.from('clients').select('id, name, email, phone').eq('company_id', companyToUse),
          supabase.from('profiles').select('id, first_name, last_name').eq('company_id', companyToUse),
          supabase.from('client_locations').select('id, client_id, address, city').eq('company_id', companyToUse),
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
  }, [open, operatingCompanyId, activeCompanyId]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Reset enterprise fields
      setOperationType('billable_service');
      setActivityCode('cleaning');
      setActivityLabel('Cleaning Services');
      setOperatingCompanyId(activeCompanyId || '');
      setOperatingCompanyName(activeCompanyName || '');
      setServiceCatalogId(null);
      setServiceName('');
      setSelectedService(null);
      
      if (job) {
        const [year, month, day] = job.date.split('-').map(Number);
        const jobDate = new Date(year, month - 1, day, 12, 0, 0);
        
        // Map old job type to operation type
        const mappedOpType: OperationType = job.jobType === 'visit' ? 'non_billable_visit' : 'billable_service';
        setOperationType(mappedOpType);
        
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
          visitPurpose: job.visitPurpose || '',
          visitRoute: job.visitRoute || '',
          billableAmount: '',
          paymentMethod: 'e_transfer',
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
          visitPurpose: '',
          visitRoute: '',
          billableAmount: '',
          paymentMethod: 'e_transfer',
        });
      }
      setErrors({});
    }
  }, [open, job, preselectedDate, preselectedTime, activeCompanyId, activeCompanyName]);

  // Update defaults when service is selected from catalog
  useEffect(() => {
    if (selectedService) {
      const mins = selectedService.default_duration_minutes;
      let duration = '2h';
      if (mins <= 30) duration = '30m';
      else if (mins <= 60) duration = '1h';
      else if (mins <= 90) duration = '1h30m';
      else if (mins <= 120) duration = '2h';
      else if (mins <= 150) duration = '2h30m';
      else if (mins <= 180) duration = '3h';
      else if (mins <= 210) duration = '3h30m';
      else if (mins <= 240) duration = '4h';
      else if (mins <= 300) duration = '5h';
      else if (mins <= 360) duration = '6h';
      else duration = '8h';
      
      setFormData(prev => ({
        ...prev,
        duration,
        billableAmount: selectedService.default_rate?.toString() || '',
        services: [selectedService.service_name],
      }));
    }
  }, [selectedService]);

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

  // Check cleaner availability
  useEffect(() => {
    const checkAvailability = async () => {
      const companyToUse = operatingCompanyId || activeCompanyId;
      if (!formData.date || !formData.time || !companyToUse) return;
      
      const year = formData.date.getFullYear();
      const month = String(formData.date.getMonth() + 1).padStart(2, '0');
      const day = String(formData.date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      const unavailable = await getAvailableCleaners(dateString, formData.time, formData.duration, companyToUse, job?.id);
      setUnavailableCleaners(unavailable);
      
      const blocked = await getBlockedCleanersForDate(dateString, companyToUse);
      setBlockedCleaners(blocked);
    };
    
    checkAvailability();
  }, [formData.date, formData.time, formData.duration, operatingCompanyId, activeCompanyId, job?.id, getAvailableCleaners, getBlockedCleanersForDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyToUse = operatingCompanyId || activeCompanyId;
    
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Validation - client not required for internal work
    if (operationType !== 'internal_work' && !formData.clientId) {
      setErrors({ clientId: 'Client is required' });
      return;
    }
    
    if (operationType === 'billable_service' && !formData.employeeId) {
      setErrors({ employeeId: 'Assigned employee is required for billable services' });
      return;
    }

    if (companyToUse && formData.employeeId) {
      setIsValidating(true);
      
      const blockCheck = await validateJobCreation(formData.employeeId, dateString, companyToUse);
      if (!blockCheck.canCreate) {
        setIsValidating(false);
        toast.error(blockCheck.message || 'Employee unavailable on this date.');
        return;
      }
      
      // Only check contract for billable services
      if (operationType === 'billable_service' && formData.clientId) {
        const contractCheck = await canScheduleForClient(formData.clientId, companyToUse);
        if (!contractCheck.isValid) {
          setIsValidating(false);
          toast.error(contractCheck.message);
          return;
        }
      }
      
      const conflictCheck = await validateSchedule(
        { clientId: formData.clientId, employeeId: formData.employeeId, date: dateString, time: formData.time, duration: formData.duration, jobId: job?.id },
        companyToUse
      );
      setIsValidating(false);
      
      if (!conflictCheck.isValid) {
        toast.error(conflictCheck.message);
        return;
      }
    }

    setErrors({});
    
    // Map operation type to legacy job type
    const legacyJobType = operationType === 'non_billable_visit' ? 'visit' : 'cleaning';
    
    const jobData = {
      ...formData,
      date: dateString,
      jobType: legacyJobType,
      // Enterprise fields
      operationType,
      activityCode,
      operatingCompanyId: companyToUse,
      serviceCatalogId,
      billableAmount: operationType === 'billable_service' && formData.billableAmount 
        ? parseFloat(formData.billableAmount) 
        : undefined,
    };
    
    onSave(jobData as any);
    onOpenChange(false);
  };

  const formatTimeDisplay = (time24: string) => {
    const slot = TIME_SLOTS.find(s => s.value === time24);
    return slot?.label || time24;
  };

  const requiresClient = operationType !== 'internal_work';
  const showBillingSection = operationType === 'billable_service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {isEditing ? 'Edit Booking' : 'New Booking'}
          </DialogTitle>
          <DialogDescription>
            Schedule a service execution (billable or non-billable)
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {/* SECTION A: Operation Type */}
            <OperationTypeSelector 
              value={operationType} 
              onChange={setOperationType} 
            />

            <Separator />

            {/* SECTION B: Activity */}
            <ActivitySelector
              value={activityCode}
              onChange={(code, label) => {
                setActivityCode(code);
                setActivityLabel(label);
                // Reset service when activity changes
                setServiceCatalogId(null);
                setServiceName('');
                setSelectedService(null);
              }}
            />

            {/* SECTION C: Operating Company */}
            <OperatingCompanySelector
              value={operatingCompanyId}
              onChange={(id, name) => {
                setOperatingCompanyId(id);
                setOperatingCompanyName(name);
                // Reset client when company changes
                setFormData(prev => ({ ...prev, clientId: '', clientName: '', address: '' }));
              }}
              activityCode={activityCode}
            />

            {/* SECTION D: Service Type */}
            <ServiceTypeSelector
              value={serviceCatalogId || ''}
              onChange={(id, name, service) => {
                setServiceCatalogId(id);
                setServiceName(name);
                setSelectedService(service || null);
              }}
              companyId={operatingCompanyId || activeCompanyId || ''}
              activityCode={activityCode}
            />

            <Separator />

            {/* SECTION E: Client (hidden for Internal Work) */}
            {requiresClient ? (
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
                
                {formData.address && (
                  <Input value={formData.address} disabled className="bg-muted text-sm" />
                )}
              </div>
            ) : (
              <div className="p-3 rounded-md bg-muted/30 border text-sm text-muted-foreground">
                Internal work — no client required
              </div>
            )}

            {/* SECTION F: Date / Time / Duration / Assigned To */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Date</Label>
                <DatePickerDialog
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => {
                    if (date) {
                      const safeDate = new Date((date as Date).getFullYear(), (date as Date).getMonth(), (date as Date).getDate(), 12, 0, 0);
                      setFormData(prev => ({ ...prev, date: safeDate }));
                    }
                  }}
                />
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Duration</Label>
                <Select value={formData.duration} onValueChange={(duration) => setFormData(prev => ({ ...prev, duration }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {DURATION_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Assigned To {operationType !== 'internal_work' && <span className="text-destructive">*</span>}</Label>
                <Select value={formData.employeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger className={errors.employeeId ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select employee..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {employees.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">No employees found</div>
                    ) : (
                      employees.map(emp => {
                        const isUnavailable = unavailableCleaners.includes(emp.id);
                        const isBlocked = blockedCleaners.includes(emp.id);
                        const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown';
                        
                        return (
                          <SelectItem 
                            key={emp.id} 
                            value={emp.id}
                            disabled={isBlocked}
                            className={cn(
                              isBlocked && "text-destructive line-through",
                              isUnavailable && "text-amber-600"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{name}</span>
                              {isBlocked && <CalendarOff className="h-3 w-3" />}
                              {isUnavailable && !isBlocked && <AlertTriangle className="h-3 w-3" />}
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

            {/* SECTION G: Billing (only for Billable Service) */}
            {showBillingSection && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Billing Details</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Amount ($)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData.billableAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, billableAmount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <Select 
                        value={formData.paymentMethod} 
                        onValueChange={(pm) => setFormData(prev => ({ ...prev, paymentMethod: pm }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {PAYMENT_METHODS.map(pm => (
                            <SelectItem key={pm.value} value={pm.value}>{pm.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Visit-specific fields */}
            {operationType === 'non_billable_visit' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Visit Details</Label>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Purpose</Label>
                    <Input
                      placeholder="e.g., Quote, Inspection, Follow-up"
                      value={formData.visitPurpose}
                      onChange={(e) => setFormData(prev => ({ ...prev, visitPurpose: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm">Notes</Label>
              <Textarea
                placeholder="Additional notes or instructions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isValidating}>
                {isValidating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update Booking' : 'Schedule Booking'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
