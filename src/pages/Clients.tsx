import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AddClientModal, { ClientFormData } from '@/components/modals/AddClientModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Building, Home, MapPin, Phone, MoreHorizontal, Pencil, Trash2, Plus, Loader2 } from 'lucide-react';

interface Location {
  id: string;
  address: string;
  city?: string;
  accessInstructions?: string;
  alarmCode?: string;
  hasPets?: boolean;
  petDetails?: string;
  parkingInfo?: string;
}

interface Client {
  id: string;
  name: string;
  type: 'residential' | 'commercial';
  phone: string;
  email: string;
  notes: string;
  status: 'active' | 'inactive';
  locationsCount: number;
  locations: Location[];
}

const Clients = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  // Fetch clients from Supabase
  const fetchClients = useCallback(async () => {
    if (!user?.profile?.company_id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          email,
          phone,
          client_type,
          notes,
          client_locations (
            id,
            address,
            city,
            access_instructions,
            alarm_code,
            has_pets,
            pet_details,
            parking_info
          )
        `)
        .eq('company_id', user.profile.company_id);

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      console.log('Clients fetched:', clientsData);

      const mappedClients: Client[] = (clientsData || []).map(client => ({
        id: client.id,
        name: client.name,
        type: (client.client_type as 'residential' | 'commercial') || 'residential',
        phone: client.phone || '',
        email: client.email || '',
        notes: client.notes || '',
        status: 'active',
        locationsCount: client.client_locations?.length || 0,
        locations: (client.client_locations || []).map((loc: any) => ({
          id: loc.id,
          address: loc.address,
          city: loc.city,
          accessInstructions: loc.access_instructions,
          alarmCode: loc.alarm_code,
          hasPets: loc.has_pets,
          petDetails: loc.pet_details,
          parkingInfo: loc.parking_info,
        })),
      }));

      setClients(mappedClients);
    } catch (err) {
      console.error('Error:', err);
      toast({ title: 'Error', description: 'Failed to load clients', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [user?.profile?.company_id]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = async (clientData: ClientFormData) => {
    if (!user?.profile?.company_id) return;

    try {
      if (editClient) {
        // Update existing client
        const { error } = await supabase
          .from('clients')
          .update({
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            client_type: clientData.type,
            notes: clientData.notes,
          })
          .eq('id', editClient.id);

        if (error) throw error;
        
        toast({ title: t.common.success, description: 'Client updated successfully' });
      } else {
        // Create new client
        const { error } = await supabase
          .from('clients')
          .insert({
            company_id: user.profile.company_id,
            name: clientData.name,
            email: clientData.email,
            phone: clientData.phone,
            client_type: clientData.type,
            notes: clientData.notes,
          });

        if (error) throw error;
        
        toast({ title: t.common.success, description: 'Client created successfully' });
      }

      fetchClients();
      setEditClient(null);
    } catch (err) {
      console.error('Error saving client:', err);
      toast({ title: 'Error', description: 'Failed to save client', variant: 'destructive' });
    }
  };

  const handleDeleteClient = async () => {
    if (!deleteClient) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deleteClient.id);

      if (error) throw error;

      setClients(prev => prev.filter(c => c.id !== deleteClient.id));
      toast({
        title: t.common.success,
        description: t.clients.clientDeleted,
      });
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Error', description: 'Failed to delete client', variant: 'destructive' });
    } finally {
      setDeleteClient(null);
    }
  };

  const openEditModal = (client: Client) => {
    setEditClient(client);
    setIsAddModalOpen(true);
  };

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: t.clients.name,
      render: (client) => (
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            client.type === 'residential' ? 'bg-success/10' : 'bg-info/10'
          }`}>
            {client.type === 'residential' 
              ? <Home className="h-4 w-4 text-success" />
              : <Building className="h-4 w-4 text-info" />
            }
          </div>
          <div>
            <p className="font-medium">{client.name}</p>
            <p className="text-sm text-muted-foreground">{client.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: t.clients.type,
      render: (client) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
          client.type === 'residential' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
        }`}>
          {t.clients[client.type]}
        </span>
      ),
    },
    {
      key: 'phone',
      header: t.clients.phone,
    },
    {
      key: 'status',
      header: t.clients.status,
      render: (client) => (
        <StatusBadge status={client.status} />
      ),
    },
    {
      key: 'locationsCount',
      header: t.clients.locations,
      render: (client) => (
        <span className="text-muted-foreground">{client.locationsCount} location{client.locationsCount !== 1 ? 's' : ''}</span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      render: (client) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(client); }}>
              <Pencil className="h-4 w-4 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setDeleteClient(client); }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container px-4 py-8 lg:px-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-6">
      <PageHeader 
        title={t.clients.title}
        description="Manage your clients and their cleaning locations"
        action={{
          label: t.clients.addClient,
          icon: UserPlus,
          onClick: () => { setEditClient(null); setIsAddModalOpen(true); },
        }}
      />

      <SearchInput 
        placeholder={t.clients.searchClients}
        value={search}
        onChange={setSearch}
        className="max-w-sm"
      />

      <DataTable 
        columns={columns}
        data={filteredClients}
        onRowClick={setSelectedClient}
        emptyMessage={t.common.noData}
      />

      {/* Client Details Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                selectedClient?.type === 'residential' ? 'bg-success/10' : 'bg-info/10'
              }`}>
                {selectedClient?.type === 'residential' 
                  ? <Home className="h-5 w-5 text-success" />
                  : <Building className="h-5 w-5 text-info" />
                }
              </div>
              {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="locations">{t.clients.locations}</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t.clients.name}</Label>
                    <Input defaultValue={selectedClient.name} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.clients.type}</Label>
                    <Input defaultValue={t.clients[selectedClient.type]} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.clients.phone}</Label>
                    <Input defaultValue={selectedClient.phone} readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input defaultValue={selectedClient.email} readOnly />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.clients.notes}</Label>
                  <Input defaultValue={selectedClient.notes || 'No notes'} readOnly />
                </div>
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                <div className="space-y-4">
                  {selectedClient.locations.length > 0 ? selectedClient.locations.map((location) => (
                    <Card key={location.id} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {location.address}{location.city ? `, ${location.city}` : ''}
                          </CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-2 text-sm">
                        {location.accessInstructions && (
                          <p><span className="text-muted-foreground">Access:</span> {location.accessInstructions}</p>
                        )}
                        {location.parkingInfo && (
                          <p><span className="text-muted-foreground">Parking:</span> {location.parkingInfo}</p>
                        )}
                        {location.hasPets && (
                          <p><span className="text-muted-foreground">Pets:</span> {location.petDetails || 'Yes'}</p>
                        )}
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">No locations added yet</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Client Modal */}
      <AddClientModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddClient}
        editClient={editClient ? {
          name: editClient.name,
          email: editClient.email,
          phone: editClient.phone,
          address: editClient.locations[0]?.address || '',
          type: editClient.type,
          contactPerson: editClient.name,
          notes: editClient.notes,
          isActive: editClient.status === 'active',
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteClient}
        onOpenChange={() => setDeleteClient(null)}
        onConfirm={handleDeleteClient}
        title={t.common.confirmDelete}
        description={`Are you sure you want to delete "${deleteClient?.name}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Clients;