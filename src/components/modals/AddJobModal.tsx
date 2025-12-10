import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScheduledJob } from '@/stores/scheduleStore';
import { jobSchema, validateForm } from '@/lib/validations';

interface AddJobModalProps {
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
      
      // Convert to AM/PM for display
      const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const label = `${h12}:${m} ${ampm}`;
      
      slots.push({ value, label });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

const AddJobModal = ({ open, onOpenChange, onSave, job, preselectedDate, preselectedTime }: AddJobModalProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isEditing = !!job;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data from Supabase
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
    jobType: 'cleaning' as 'cleaning' | 'visit',
    visitPurpose: '',
    visitRoute: '',
  });

  // Fetch clients and employees from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!open) return;
      
      setIsLoading(true);
      
      try {
        // Get company_id
        let companyId = user?.profile?.company_id;
        if (!companyId) {
          const { data: companyIdData } = await supabase.rpc('get_user_company_id');
          companyId = companyIdData;
        }
        
        if (!companyId) {
          setIsLoading(false);
          return;
        }
        
        // Fetch clients
        const { data: clientsData } = await supabase
          .from('clients')
          .select('id, name, email, phone')
          .eq('company_id', companyId);
        
        if (clientsData) {
          setClients(clientsData);
        }
        
        // Fetch employees (cleaners)
        const { data: employeesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('company_id', companyId);
        
        if (employeesData) {
          setEmployees(employeesData);
        }
        
        // Fetch locations
        const { data: locationsData } = await supabase
          .from('client_locations')
          .select('id, client_id, address, city')
          .eq('company_id', companyId);
        
        if (locationsData) {
          setLocations(locationsData);
        }
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
        setFormData({
          clientId: job.clientId,
          clientName: job.clientName,
          address: job.address,
          date: new Date(job.date),
          time: job.time,
          duration: job.duration,
          employeeId: job.employeeId,
          employeeName: job.employeeName,
          services: job.services,
          notes: job.notes || '',
          status: job.status,
          jobType: 'cleaning',
          visitPurpose: '',
          visitRoute: '',
        });
      } else {
        setFormData({
          clientId: '',
          clientName: '',
          address: '',
          date: preselectedDate || new Date(),
          time: preselectedTime || '09:00',
          duration: '2h',
          employeeId: '',
          employeeName: '',
          services: ['Standard Clean'],
          notes: '',
          status: 'scheduled',
          jobType: 'cleaning',
          visitPurpose: '',
          visitRoute: '',
        });
      }
      setErrors({});
    }
  }, [open, job, preselectedDate, preselectedTime]);

  const handleClientChange = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client) {
      // Find primary location for this client
      const clientLocations = locations.filter(l => l.client_id === clientId);
      const address = clientLocations.length > 0 
        ? `${clientLocations[0].address}${clientLocations[0].city ? `, ${clientLocations[0].city}` : ''}`
        : '';
      
      setFormData(prev => ({
        ...prev,
        clientId,
        clientName: client.name,
        address,
      }));
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
      setFormData(prev => ({ ...prev, date }));
      setCalendarOpen(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationData = {
      clientId: formData.clientId,
      employeeId: formData.employeeId,
      date: format(formData.date, 'yyyy-MM-dd'),
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

    setErrors({});
    
    // Use local date formatting to avoid timezone issues
    const year = formData.date.getFullYear();
    const month = String(formData.date.getMonth() + 1).padStart(2, '0');
    const day = String(formData.date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const jobData = {
      ...formData,
      date: dateString,
    };
    
    onSave(jobData);
    onOpenChange(false);
  };

  // Format time for display
  const formatTimeDisplay = (time24: string) => {
    const slot = TIME_SLOTS.find(s => s.value === time24);
    return slot?.label || time24;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t.schedule.editJob : t.schedule.addJob}</DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t.job.client}</Label>
              <Select 
                value={formData.clientId} 
                onValueChange={(v) => { handleClientChange(v); setErrors(prev => ({ ...prev, clientId: '' })); }}
              >
                <SelectTrigger className={`h-9 ${errors.clientId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t.job.selectClient} />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {clients.length === 0 ? (
                    <div className="py-2 px-3 text-sm text-muted-foreground">
                      No clients found. Create clients first.
                    </div>
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
              <div className="space-y-1.5">
                <Label className="text-xs">{t.job.address}</Label>
                <Input value={formData.address} disabled className="bg-muted h-9" />
              </div>
            )}
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.job.date}</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-9 justify-start text-left font-normal text-sm")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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
              
              <div className="space-y-1.5">
                <Label className="text-xs">{t.job.time}</Label>
                <Select value={formData.time} onValueChange={(time) => setFormData(prev => ({ ...prev, time }))}>
                  <SelectTrigger className="h-9">
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
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t.job.duration}</Label>
                <Select value={formData.duration} onValueChange={(duration) => setFormData(prev => ({ ...prev, duration }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {['1h', '1.5h', '2h', '2.5h', '3h', '3.5h', '4h', '5h', '6h', '7h', '8h'].map(d => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1.5">
                <Label className="text-xs">{t.job.assignedEmployee}</Label>
                <Select 
                  value={formData.employeeId} 
                  onValueChange={(v) => { handleEmployeeChange(v); setErrors(prev => ({ ...prev, employeeId: '' })); }}
                >
                  <SelectTrigger className={`h-9 ${errors.employeeId ? 'border-destructive' : ''}`}>
                    <SelectValue placeholder={t.job.selectEmployee} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {employees.length === 0 ? (
                      <div className="py-2 px-3 text-sm text-muted-foreground">
                        No employees found. Add users first.
                      </div>
                    ) : (
                      employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {`${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Unknown'}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
              </div>
            </div>
            
            {/* Job Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Event Type</Label>
              <Select 
                value={formData.jobType} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, jobType: v as 'cleaning' | 'visit' }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="cleaning">🧹 Cleaning Service (Billable)</SelectItem>
                  <SelectItem value="visit">👁️ Visit (Non-billable)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Visit-specific fields */}
            {formData.jobType === 'visit' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Visit Purpose</Label>
                  <Select 
                    value={formData.visitPurpose} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, visitPurpose: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select purpose..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="quote">Quote / Estimate</SelectItem>
                      <SelectItem value="follow-up">Follow-up</SelectItem>
                      <SelectItem value="consultation">Consultation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs">Visit Route / Instructions</Label>
                  <Textarea
                    value={formData.visitRoute}
                    onChange={(e) => setFormData(prev => ({ ...prev, visitRoute: e.target.value }))}
                    placeholder="Enter route, stops, or special instructions for this visit..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </>
            )}

            {/* Service Type - only for cleaning jobs */}
            {formData.jobType === 'cleaning' && (
              <div className="space-y-1.5">
                <Label className="text-xs">{t.job.serviceType}</Label>
                <Select 
                  value={formData.services[0]} 
                  onValueChange={(service) => setFormData(prev => ({ ...prev, services: [service] }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Standard Clean">{t.job.standardClean}</SelectItem>
                    <SelectItem value="Deep Clean">{t.job.deepClean}</SelectItem>
                    <SelectItem value="Move-out Clean">{t.job.moveOutClean}</SelectItem>
                    <SelectItem value="Office Clean">{t.job.officeClean}</SelectItem>
                    <SelectItem value="Daily Clean">{t.job.dailyClean}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label className="text-xs">{t.job.notes}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t.job.notesPlaceholder}
                rows={2}
                className="text-sm"
              />
            </div>
            
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size="sm">
                {t.common.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={clients.length === 0 || employees.length === 0}>
                {isEditing ? t.common.update : t.common.create}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddJobModal;
