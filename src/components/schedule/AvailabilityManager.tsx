import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Edit, User } from 'lucide-react';
import { CleanerAvailability, DayOfWeek, useScheduleStore } from '@/stores/scheduleStore';
import { cn } from '@/lib/utils';

const timeOptions = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const AvailabilityManager = () => {
  const { t } = useLanguage();
  const { availabilities, setAvailability } = useScheduleStore();
  const [editingAvailability, setEditingAvailability] = useState<CleanerAvailability | null>(null);
  const [editForm, setEditForm] = useState<{
    availableDays: DayOfWeek[];
    startTime: string;
    endTime: string;
  }>({ availableDays: [], startTime: '08:00', endTime: '17:00' });

  const daysOfWeek: { key: DayOfWeek; labelKey: keyof typeof t.days; shortKey: keyof typeof t.days }[] = [
    { key: 'monday', labelKey: 'monday', shortKey: 'mon' },
    { key: 'tuesday', labelKey: 'tuesday', shortKey: 'tue' },
    { key: 'wednesday', labelKey: 'wednesday', shortKey: 'wed' },
    { key: 'thursday', labelKey: 'thursday', shortKey: 'thu' },
    { key: 'friday', labelKey: 'friday', shortKey: 'fri' },
    { key: 'saturday', labelKey: 'saturday', shortKey: 'sat' },
    { key: 'sunday', labelKey: 'sunday', shortKey: 'sun' },
  ];

  const handleEdit = (availability: CleanerAvailability) => {
    setEditingAvailability(availability);
    setEditForm({
      availableDays: availability.availableDays,
      startTime: availability.startTime,
      endTime: availability.endTime,
    });
  };

  const toggleDay = (day: DayOfWeek) => {
    setEditForm(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const handleSave = () => {
    if (editingAvailability) {
      setAvailability({
        employeeId: editingAvailability.employeeId,
        employeeName: editingAvailability.employeeName,
        ...editForm,
        exceptions: editingAvailability.exceptions,
      });
      setEditingAvailability(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            {t.schedule.availability}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {availabilities.map((availability) => (
            <div 
              key={availability.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {availability.employeeName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{availability.employeeName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {availability.startTime} - {availability.endTime}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex gap-1">
                      {daysOfWeek.map(day => (
                        <Badge 
                          key={day.key}
                          variant={availability.availableDays.includes(day.key) ? 'default' : 'outline'}
                          className={cn(
                            "px-1.5 py-0 text-[10px]",
                            !availability.availableDays.includes(day.key) && "opacity-40"
                          )}
                        >
                          {t.days[day.shortKey]}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(availability)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {availabilities.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t.schedule.noAvailabilityData}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingAvailability} onOpenChange={() => setEditingAvailability(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t.schedule.editAvailability} - {editingAvailability?.employeeName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="space-y-3">
              <Label>{t.schedule.availableDays}</Label>
              <div className="grid grid-cols-4 gap-2">
                {daysOfWeek.map(day => (
                  <div
                    key={day.key}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors",
                      editForm.availableDays.includes(day.key)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border hover:bg-muted/50"
                    )}
                    onClick={() => toggleDay(day.key)}
                  >
                    <span className="text-xs font-medium">{t.days[day.shortKey]}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t.schedule.startTime}</Label>
                <Select 
                  value={editForm.startTime} 
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, startTime: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{t.schedule.endTime}</Label>
                <Select 
                  value={editForm.endTime} 
                  onValueChange={(v) => setEditForm(prev => ({ ...prev, endTime: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map(time => (
                      <SelectItem key={time} value={time}>{time}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEditingAvailability(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave}>
              {t.schedule.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvailabilityManager;
