import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Clock, Search, User, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface CleanerAvailability {
  id: string;
  cleaner_id: string;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  is_available: boolean;
  cleaner?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface GroupedAvailability {
  cleanerId: string;
  cleanerName: string;
  cleanerEmail: string | null;
  availability: {
    day: number;
    dayName: string;
    isAvailable: boolean;
    startTime: string | null;
    endTime: string | null;
  }[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Availability = () => {
  const { user } = useAuth();
  const [availabilities, setAvailabilities] = useState<GroupedAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAvailabilities();
  }, [user?.profile?.company_id]);

  const fetchAvailabilities = async () => {
    let companyId = user?.profile?.company_id;
    
    if (!companyId) {
      const { data: companyIdData } = await supabase.rpc('get_user_company_id');
      companyId = companyIdData;
    }
    
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('cleaner_availability')
        .select(`
          *,
          cleaner:profiles!cleaner_availability_cleaner_id_fkey(first_name, last_name, email)
        `)
        .eq('company_id', companyId)
        .order('cleaner_id')
        .order('day_of_week');

      if (error) throw error;

      // Group by cleaner
      const grouped = (data || []).reduce<Record<string, GroupedAvailability>>((acc, curr) => {
        const cleanerId = curr.cleaner_id;
        if (!acc[cleanerId]) {
          acc[cleanerId] = {
            cleanerId,
            cleanerName: `${curr.cleaner?.first_name || ''} ${curr.cleaner?.last_name || ''}`.trim() || 'Unknown',
            cleanerEmail: curr.cleaner?.email || null,
            availability: []
          };
        }
        acc[cleanerId].availability.push({
          day: curr.day_of_week,
          dayName: DAYS_OF_WEEK[curr.day_of_week],
          isAvailable: curr.is_available ?? false,
          startTime: curr.start_time,
          endTime: curr.end_time
        });
        return acc;
      }, {});

      setAvailabilities(Object.values(grouped));
    } catch (error) {
      console.error('Error fetching availabilities:', error);
      toast.error('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  };

  const filteredAvailabilities = availabilities.filter(a =>
    a.cleanerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.cleanerEmail && a.cleanerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="Availability"
        description="Manage employee weekly availability schedules"
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by employee name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Availability Cards */}
      {filteredAvailabilities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No availability data found</p>
              <p className="text-sm mt-1">Configure cleaner availability in their user profile</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredAvailabilities.map((cleaner) => (
            <Card key={cleaner.cleanerId}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{cleaner.cleanerName}</CardTitle>
                    {cleaner.cleanerEmail && (
                      <p className="text-sm text-muted-foreground">{cleaner.cleanerEmail}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const dayData = cleaner.availability.find(a => a.day === index);
                    const isAvailable = dayData?.isAvailable ?? false;
                    
                    return (
                      <div
                        key={day}
                        className={`p-3 rounded-lg border text-center ${
                          isAvailable 
                            ? 'bg-green-500/10 border-green-500/20' 
                            : 'bg-muted/50 border-border'
                        }`}
                      >
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {day.slice(0, 3)}
                        </p>
                        {isAvailable ? (
                          <>
                            <Check className="h-4 w-4 mx-auto text-green-500 mb-1" />
                            {dayData?.startTime && dayData?.endTime && (
                              <p className="text-xs text-muted-foreground">
                                {dayData.startTime} - {dayData.endTime}
                              </p>
                            )}
                          </>
                        ) : (
                          <X className="h-4 w-4 mx-auto text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Availability;
