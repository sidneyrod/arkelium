import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Clock, Edit, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface CleanerWithAvailability {
  id: string;
  first_name: string;
  last_name: string;
  availability: {
    day_of_week: number;
    start_time: string | null;
    end_time: string | null;
    is_available: boolean;
  }[];
}

const timeOptions = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

const dayIndexToKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const AvailabilityManager = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [cleaners, setCleaners] = useState<CleanerWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCleaner, setEditingCleaner] = useState<CleanerWithAvailability | null>(null);
  const [editForm, setEditForm] = useState<{
    availableDays: number[];
    startTime: string;
    endTime: string;
  }>({ availableDays: [], startTime: '08:00', endTime: '17:00' });
  const [saving, setSaving] = useState(false);

  const daysOfWeek = [
    { index: 1, labelKey: 'monday' as const, shortKey: 'mon' as const },
    { index: 2, labelKey: 'tuesday' as const, shortKey: 'tue' as const },
    { index: 3, labelKey: 'wednesday' as const, shortKey: 'wed' as const },
    { index: 4, labelKey: 'thursday' as const, shortKey: 'thu' as const },
    { index: 5, labelKey: 'friday' as const, shortKey: 'fri' as const },
    { index: 6, labelKey: 'saturday' as const, shortKey: 'sat' as const },
    { index: 0, labelKey: 'sunday' as const, shortKey: 'sun' as const },
  ];

  const fetchCleanersWithAvailability = async () => {
    if (!user?.profile?.company_id) return;

    try {
      setLoading(true);
      
      // Get all cleaners
      const { data: cleanerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('company_id', user.profile.company_id)
        .eq('role', 'cleaner');

      if (!cleanerRoles?.length) {
        setCleaners([]);
        return;
      }

      const cleanerIds = cleanerRoles.map(r => r.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', cleanerIds);

      // Get availability
      const { data: availability } = await supabase
        .from('cleaner_availability')
        .select('cleaner_id, day_of_week, start_time, end_time, is_available')
        .eq('company_id', user.profile.company_id)
        .in('cleaner_id', cleanerIds);

      const cleanersWithAvail = profiles?.map(profile => ({
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        availability: availability?.filter(a => a.cleaner_id === profile.id) || []
      })) || [];

      setCleaners(cleanersWithAvail);
    } catch (err) {
      console.error('Error fetching cleaners:', err);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCleanersWithAvailability();
  }, [user?.profile?.company_id]);

  const handleEdit = (cleaner: CleanerWithAvailability) => {
    setEditingCleaner(cleaner);
    const availableDays = cleaner.availability
      .filter(a => a.is_available)
      .map(a => a.day_of_week);
    const firstAvail = cleaner.availability.find(a => a.start_time);
    setEditForm({
      availableDays,
      startTime: firstAvail?.start_time?.slice(0, 5) || '08:00',
      endTime: firstAvail?.end_time?.slice(0, 5) || '17:00',
    });
  };

  const toggleDay = (dayIndex: number) => {
    setEditForm(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(dayIndex)
        ? prev.availableDays.filter(d => d !== dayIndex)
        : [...prev.availableDays, dayIndex]
    }));
  };

  const handleSave = async () => {
    if (!editingCleaner || !user?.profile?.company_id) return;

    setSaving(true);
    try {
      // Delete existing availability for this cleaner
      await supabase
        .from('cleaner_availability')
        .delete()
        .eq('cleaner_id', editingCleaner.id)
        .eq('company_id', user.profile.company_id);

      // Insert new availability for each day of the week
      const newAvailability = [];
      for (let day = 0; day <= 6; day++) {
        const isAvailable = editForm.availableDays.includes(day);
        newAvailability.push({
          cleaner_id: editingCleaner.id,
          company_id: user.profile.company_id,
          day_of_week: day,
          is_available: isAvailable,
          start_time: isAvailable ? editForm.startTime : null,
          end_time: isAvailable ? editForm.endTime : null,
        });
      }

      const { error } = await supabase
        .from('cleaner_availability')
        .insert(newAvailability);

      if (error) throw error;

      toast.success('Availability updated');
      setEditingCleaner(null);
      fetchCleanersWithAvailability();
    } catch (err) {
      console.error('Error saving availability:', err);
      toast.error('Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  const getCleanerName = (cleaner: CleanerWithAvailability) => {
    return `${cleaner.first_name} ${cleaner.last_name}`.trim() || 'Unnamed';
  };

  const getInitials = (cleaner: CleanerWithAvailability) => {
    const first = cleaner.first_name?.[0] || '';
    const last = cleaner.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getTimeRange = (cleaner: CleanerWithAvailability) => {
    const availableSlots = cleaner.availability.filter(a => a.is_available && a.start_time);
    if (!availableSlots.length) return 'Not set';
    const first = availableSlots[0];
    return `${first.start_time?.slice(0, 5)} - ${first.end_time?.slice(0, 5)}`;
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

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
          {cleaners.map((cleaner) => (
            <div 
              key={cleaner.id}
              className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {getInitials(cleaner)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{getCleanerName(cleaner)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {getTimeRange(cleaner)}
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex gap-1">
                      {daysOfWeek.map(day => {
                        const isAvailable = cleaner.availability.some(
                          a => a.day_of_week === day.index && a.is_available
                        );
                        return (
                          <Badge 
                            key={day.index}
                            variant={isAvailable ? 'default' : 'outline'}
                            className={cn(
                              "px-1.5 py-0 text-[10px]",
                              !isAvailable && "opacity-40"
                            )}
                          >
                            {t.days[day.shortKey]}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleEdit(cleaner)}>
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {cleaners.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {t.schedule.noAvailabilityData}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingCleaner} onOpenChange={() => setEditingCleaner(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {t.schedule.editAvailability} - {editingCleaner && getCleanerName(editingCleaner)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="space-y-3">
              <Label>{t.schedule.availableDays}</Label>
              <div className="grid grid-cols-4 gap-2">
                {daysOfWeek.map(day => (
                  <div
                    key={day.index}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-colors",
                      editForm.availableDays.includes(day.index)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border hover:bg-muted/50"
                    )}
                    onClick={() => toggleDay(day.index)}
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
            <Button variant="outline" onClick={() => setEditingCleaner(null)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t.schedule.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvailabilityManager;