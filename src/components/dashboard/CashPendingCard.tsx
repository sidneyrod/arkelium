import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import { useCompanyPreferences } from '@/hooks/useCompanyPreferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Banknote, User, Calendar, ArrowRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toSafeLocalDate } from '@/lib/dates';

interface CashCollection {
  id: string;
  amount: number;
  cash_handling: 'kept_by_cleaner' | 'delivered_to_office';
  compensation_status: 'pending' | 'settled' | 'not_applicable';
  service_date: string;
  handled_at: string;
  cleaner: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  client: {
    name: string;
  } | null;
  job_id: string;
}

const CashPendingCard = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { activeCompanyId } = useActiveCompanyStore();
  const { preferences, isLoading: prefsLoading } = useCompanyPreferences();
  const [pendingCash, setPendingCash] = useState<CashCollection[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const labels = {
    en: {
      title: 'Cash Pending Compensation',
      noPending: 'No pending cash compensation',
      keptByCleaner: 'Kept by cleaner',
      pending: 'Pending',
      totalPending: 'Total Pending',
      viewAll: 'View in Payroll',
    },
    fr: {
      title: 'Espèces en attente de compensation',
      noPending: 'Aucune compensation en attente',
      keptByCleaner: 'Gardé par nettoyeur',
      pending: 'En attente',
      totalPending: 'Total en attente',
      viewAll: 'Voir dans Paie',
    }
  };

  const t = labels[language] || labels.en;

  useEffect(() => {
    const fetchPendingCash = async () => {
      // Don't fetch if feature is disabled
      if (!activeCompanyId || !preferences.enableCashKeptByEmployee) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('cash_collections')
          .select(`
            id,
            amount,
            cash_handling,
            compensation_status,
            service_date,
            handled_at,
            job_id,
            cleaner:cleaner_id (first_name, last_name),
            client:client_id (name)
          `)
          .eq('company_id', activeCompanyId)
          .eq('compensation_status', 'pending')
          .eq('cash_handling', 'kept_by_cleaner')
          .order('handled_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching pending cash:', error);
          return;
        }

        const collections = (data || []) as unknown as CashCollection[];
        setPendingCash(collections);
        
        // Calculate total pending
        const total = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
        setTotalPending(total);
      } catch (err) {
        console.error('Error in fetchPendingCash:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingCash();
  }, [activeCompanyId, preferences.enableCashKeptByEmployee]);

  // If the feature is disabled, don't render the card
  if (!prefsLoading && !preferences.enableCashKeptByEmployee) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-warning/30 bg-warning/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-warning" />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingCash.length === 0) {
    return null; // Don't show card if no pending cash
  }

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-warning" />
            {t.title}
          </CardTitle>
          <Badge variant="outline" className="bg-warning/20 text-warning border-warning/30 font-bold">
            ${totalPending.toFixed(2)} CAD
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-[180px] pr-2">
          <div className="space-y-2">
            {pendingCash.map((collection) => {
              const cleanerName = collection.cleaner 
                ? `${collection.cleaner.first_name || ''} ${collection.cleaner.last_name || ''}`.trim()
                : 'Unknown';
              
              return (
                <div 
                  key={collection.id}
                  className="p-3 rounded-lg bg-card border border-border/50 hover:border-warning/30 transition-colors cursor-pointer"
                  onClick={() => navigate(`/schedule?view=day&date=${collection.service_date}`)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {collection.client?.name || 'Unknown Client'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{cleanerName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{format(toSafeLocalDate(collection.service_date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-warning">
                        ${collection.amount.toFixed(2)}
                      </span>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30">
                          {t.pending}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-warning/30 text-warning hover:bg-warning/10"
          onClick={() => navigate('/payroll?tab=cash')}
        >
          {t.viewAll}
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default CashPendingCard;
