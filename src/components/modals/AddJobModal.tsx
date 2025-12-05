import { useState } from 'react';
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

interface AddJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (job: Omit<ScheduledJob, 'id'>) => void;
  job?: ScheduledJob;
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

const AddJobModal = ({ open, onOpenChange, onSave, job }: AddJobModalProps) => {
  const { t } = useLanguage();
  const isEditing = !!job;
  
  const [formData, setFormData] = useState({
    clientId: job?.clientId || '',
    clientName: job?.clientName || '',
    address: job?.address || '',
    date: job?.date ? new Date(job.date) : new Date(),
    time: job?.time || '09:00',
    duration: job?.duration || '2h',
    employeeId: job?.employeeId || '',
    employeeName: job?.employeeName || '',
    services: job?.services || ['Standard Clean'],
    notes: job?.notes || '',
    status: job?.status || 'scheduled' as const,
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      date: format(formData.date, 'yyyy-MM-dd'),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? t.schedule.editJob : t.schedule.addJob}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>{t.job.client}</Label>
            <Select value={formData.clientId} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder={t.job.selectClient} />
              </SelectTrigger>
              <SelectContent>
                {mockClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {formData.address && (
            <div className="space-y-2">
              <Label>{t.job.address}</Label>
              <Input value={formData.address} disabled className="bg-muted" />
            </div>
          )}
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.job.date}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.date, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>{t.job.time}</Label>
              <Select value={formData.time} onValueChange={(time) => setFormData(prev => ({ ...prev, time }))}>
                <SelectTrigger>
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
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t.job.duration}</Label>
              <Select value={formData.duration} onValueChange={(duration) => setFormData(prev => ({ ...prev, duration }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1h', '1.5h', '2h', '2.5h', '3h', '3.5h', '4h', '5h', '6h'].map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t.job.assignedEmployee}</Label>
              <Select value={formData.employeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t.job.selectEmployee} />
                </SelectTrigger>
                <SelectContent>
                  {mockEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>{t.job.serviceType}</Label>
            <Select 
              value={formData.services[0]} 
              onValueChange={(service) => setFormData(prev => ({ ...prev, services: [service] }))}
            >
              <SelectTrigger>
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
          
          <div className="space-y-2">
            <Label>{t.job.notes}</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={t.job.notesPlaceholder}
              rows={3}
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">
              {isEditing ? t.common.update : t.common.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddJobModal;
