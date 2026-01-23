import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BookingClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface BookingLocation {
  id: string;
  client_id: string;
  address: string;
  city?: string;
}

export interface BookingEmployee {
  id: string;
  first_name: string;
  last_name: string;
}

interface BookingReferenceData {
  clients: BookingClient[];
  locations: BookingLocation[];
  employees: BookingEmployee[];
}

/**
 * Hook para carregar dados de referência (clients, employees, locations) 
 * com cache estável que NÃO dispara re-fetch ao voltar foco do navegador.
 * 
 * Isso elimina o "flicker" ao trocar de aba/janela.
 */
export function useBookingReferenceData(companyId: string | null, enabled: boolean = true) {
  return useQuery<BookingReferenceData>({
    queryKey: ['booking-reference-data', companyId],
    queryFn: async () => {
      if (!companyId) {
        return { clients: [], locations: [], employees: [] };
      }

      const [clientsRes, employeesRes, locationsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, name, email, phone')
          .eq('company_id', companyId),
        supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .eq('company_id', companyId),
        supabase
          .from('client_locations')
          .select('id, client_id, address, city')
          .eq('company_id', companyId),
      ]);

      return {
        clients: clientsRes.data || [],
        locations: locationsRes.data || [],
        employees: employeesRes.data || [],
      };
    },
    enabled: enabled && !!companyId,
    staleTime: 30 * 60 * 1000, // 30 minutos - dados ficam "frescos" por muito tempo
    gcTime: 60 * 60 * 1000, // 1 hora no cache
    refetchOnWindowFocus: false, // CRÍTICO: não re-fetch ao voltar foco
    refetchOnMount: false, // Não re-fetch se já tem dados
    refetchOnReconnect: false,
  });
}
