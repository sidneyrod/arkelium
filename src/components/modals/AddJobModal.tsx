import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
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
}

// Mock data - replace with actual data from stores
const mockClients = [
  { id: '1', name: 'Sarah Mitchell', address: '245 Oak Street' },
  { id: '2', name: 'Thompson Corp', address: '890 Business Ave' },
  { id: '3', name: 'Emily Chen', address: '112 Maple Drive' },
];

const mockEmployees = [
  { id: '1', name: 'Maria G.' },
  { id: '2', name: 'John D.' },
  { id: '3', name: 'Ana R.' },
  { id: '4', name: 'David C.' },
];

const AddJobModal = ({ open, onOpenChange, onSave, job, preselectedDate }: AddJobModalProps) => {
  const { t } = useLanguage();
  const isEditing = !!job;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    clientId: job?.clientId || '',
    clientName: job?.clientName || '',
    address: job?.address || '',
    date: job?.date ? new Date(job.date) : preselectedDate || new Date(),
    time: job?.time || '09:00',
    duration: job?.duration || '2h',
    employeeId: job?.employeeId || '',
    employeeName: job?.employeeName || '',
    services: job?.services || ['Standard Clean'],
    notes: job?.notes || '',
    status: job?.status || 'scheduled' as const,
  });

  // Update date when preselectedDate changes
  useEffect(() => {
    if (preselectedDate && !job) {
      setFormData(prev => ({ ...prev, date: preselectedDate }));
    }
  }, [preselectedDate, job]);

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
        });
      } else {
        setFormData({
          clientId: '',
          clientName: '',
          address: '',
          date: preselectedDate || new Date(),
          time: '09:00',
          duration: '2h',
          employeeId: '',
          employeeName: '',
          services: ['Standard Clean'],
          notes: '',
          status: 'scheduled',
        });
      }
      setErrors({});
    }
  }, [open, job, preselectedDate]);

  const handleClientChange = (clientId: string) => {
    const client = mockClients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientId,
        clientName: client.name,
        address: client.address,
      }));
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = mockEmployees.find(e => e.id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeId,
        employeeName: employee.name,
      }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date }));
      // Auto-close calendar after selection
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
    
    // Use the exact date from formData, formatted consistently
    const jobData = {
      ...formData,
      date: format(formData.date, 'yyyy-MM-dd'),
    };
    
    onSave(jobData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t.schedule.editJob : t.schedule.addJob}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">{t.job.client}</Label>
            <Select value={formData.clientId} onValueChange={(v) => { handleClientChange(v); setErrors(prev => ({ ...prev, clientId: '' })); }}>
              <SelectTrigger className={`h-9 ${errors.clientId ? 'border-destructive' : ''}`}>
                <SelectValue placeholder={t.job.selectClient} />
              </SelectTrigger>
              <SelectContent>
                {mockClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map(time => (
                    <SelectItem key={time} value={time}>{time}</SelectItem>
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
                <SelectContent>
                  {['1h', '1.5h', '2h', '2.5h', '3h', '3.5h', '4h', '5h', '6h'].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-xs">{t.job.assignedEmployee}</Label>
              <Select value={formData.employeeId} onValueChange={(v) => { handleEmployeeChange(v); setErrors(prev => ({ ...prev, employeeId: '' })); }}>
                <SelectTrigger className={`h-9 ${errors.employeeId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t.job.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  {mockEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId}</p>}
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-xs">{t.job.serviceType}</Label>
            <Select 
              value={formData.services[0]} 
              onValueChange={(service) => setFormData(prev => ({ ...prev, services: [service] }))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard Clean">{t.job.standardClean}</SelectItem>
                <SelectItem value="Deep Clean">{t.job.deepClean}</SelectItem>
                <SelectItem value="Move-out Clean">{t.job.moveOutClean}</SelectItem>
                <SelectItem value="Office Clean">{t.job.officeClean}</SelectItem>
                <SelectItem value="Daily Clean">{t.job.dailyClean}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
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
            <Button type="submit" size="sm">
              {isEditing ? t.common.update : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobModal;