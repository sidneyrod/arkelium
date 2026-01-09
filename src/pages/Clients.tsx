import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import PaginatedDataTable, { Column } from '@/components/ui/paginated-data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import AddClientModal, { ClientFormData } from '@/components/modals/AddClientModal';
import AddLocationModal, { LocationFormData } from '@/components/modals/AddLocationModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Building, Home, MapPin, Phone, MoreHorizontal, Pencil, Trash2, Plus, Loader2, AlertTriangle, Star } from 'lucide-react';
import { useScheduleValidation } from '@/hooks/useScheduleValidation';
import { useServerPagination } from '@/hooks/useServerPagination';

interface Location {
  id: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  accessInstructions?: string;
  alarmCode?: string;
  hasPets?: boolean;
  petDetails?: string;
  parkingInfo?: string;
  isPrimary?: boolean;
  notes?: string;
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
  // Address fields
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

const Clients = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  
  // Read URL params for filters
  const urlStatus = searchParams.get('status');
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || 'all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  
  // Location management state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<LocationFormData | null>(null);
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  const { validateClientDuplicate, canDeleteClient } = useScheduleValidation();

  // Debounce search for server-side filtering
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Server-side paginated fetch
  const fetchClients = useCallback(async (from: number, to: number) => {
    if (!user?.profile?.company_id) {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        client_type,
        notes,
        address,
        city,
        province,
        postal_code,
        country,
        client_locations (
          id,
          address,
          city,
          province,
          postal_code,
          access_instructions,
          alarm_code,
          has_pets,
          pet_details,
          parking_info,
          is_primary,
          notes
        )
      `, { count: 'exact' })
      .eq('company_id', user.profile.company_id);

    // Server-side search
    if (debouncedSearch) {
      query = query.or(`name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('name', { ascending: true })
      .range(from, to);

    const { data: clientsData, error: clientsError, count } = await query;

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      throw clientsError;
    }

    const mappedClients: Client[] = (clientsData || []).map((client: any) => ({
      id: client.id,
      name: client.name,
      type: (client.client_type as 'residential' | 'commercial') || 'residential',
      phone: client.phone || '',
      email: client.email || '',
      notes: client.notes || '',
      status: 'active' as const,
      locationsCount: client.client_locations?.length || 0,
      locations: (client.client_locations || []).map((loc: any) => ({
        id: loc.id,
        address: loc.address,
        city: loc.city,
        province: loc.province,
        postalCode: loc.postal_code,
        accessInstructions: loc.access_instructions,
        alarmCode: loc.alarm_code,
        hasPets: loc.has_pets,
        petDetails: loc.pet_details,
        parkingInfo: loc.parking_info,
        isPrimary: loc.is_primary,
        notes: loc.notes,
      })),
      address: client.address || '',
      city: client.city || '',
      province: client.province || '',
      postalCode: client.postal_code || '',
      country: client.country || 'Canada',
    }));

    return { data: mappedClients, count: count || 0 };
  }, [user?.profile?.company_id, debouncedSearch]);

  const {
    data: clients,
    isLoading,
    pagination,
    setPage,
    setPageSize,
    refresh,
  } = useServerPagination<Client>(fetchClients, { pageSize: 25 });

  // Refresh when search changes
  useEffect(() => {
    refresh();
  }, [debouncedSearch]);

  const handleAddClient = async (clientData: ClientFormData) => {
    if (!user?.profile?.company_id) return;

    try {
      // Validate for duplicates
      const duplicateCheck = await validateClientDuplicate(
        {
          email: clientData.email,
          name: clientData.name,
          phone: clientData.phone,
        },
        user.profile.company_id,
        editClient?.id
      );
      
      if (!duplicateCheck.isValid) {
        toast({ title: 'Error', description: duplicateCheck.message, variant: 'destructive' });
        return;
      }

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
            address: clientData.address,
            city: clientData.city,
            province: clientData.province,
            postal_code: clientData.postalCode,
            country: clientData.country,
          })
          .eq('id', editClient.id)
          .eq('company_id', user.profile.company_id);

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
            address: clientData.address,
            city: clientData.city,
            province: clientData.province,
            postal_code: clientData.postalCode,
            country: clientData.country,
          });

        if (error) throw error;
        
        toast({ title: t.common.success, description: 'Client created successfully' });
      }

      await refresh();
      setEditClient(null);
    } catch (err) {
      console.error('Error saving client:', err);
      toast({ title: 'Error', description: 'Failed to save client', variant: 'destructive' });
    }
  };

  const handleDeleteClick = async (client: Client) => {
    if (!user?.profile?.company_id) return;
    
    // Check if client can be deleted
    const deleteCheck = await canDeleteClient(client.id, user.profile.company_id);
    
    if (!deleteCheck.isValid) {
      setDeleteWarning(deleteCheck.message || null);
    } else {
      setDeleteWarning(null);
    }
    
    setDeleteClient(client);
  };

  const handleDeleteClient = async () => {
    if (!deleteClient) return;

    // If there's a warning, don't allow deletion
    if (deleteWarning) {
      toast({ 
        title: 'Not allowed', 
        description: deleteWarning, 
        variant: 'destructive' 
      });
      setDeleteClient(null);
      setDeleteWarning(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deleteClient.id)
        .eq('company_id', user?.profile?.company_id);

      if (error) throw error;

      await refresh();
      toast({
        title: t.common.success,
        description: t.clients.clientDeleted,
      });
    } catch (err) {
      console.error('Delete error:', err);
      toast({ title: 'Error', description: 'Failed to delete client', variant: 'destructive' });
    } finally {
      setDeleteClient(null);
      setDeleteWarning(null);
    }
  };

  const openEditModal = (client: Client) => {
    setEditClient(client);
    setIsAddModalOpen(true);
  };

  // Location CRUD handlers
  const handleAddLocation = async (locationData: LocationFormData) => {
    if (!selectedClient || !user?.profile?.company_id) return;
    
    setLocationLoading(true);
    try {
      if (locationData.isPrimary) {
        // Reset other locations to non-primary
        await supabase
          .from('client_locations')
          .update({ is_primary: false })
          .eq('client_id', selectedClient.id)
          .eq('company_id', user.profile.company_id);
      }

      if (editLocation?.id) {
        // Update existing location
        const { error } = await supabase
          .from('client_locations')
          .update({
            address: locationData.address,
            city: locationData.city,
            province: locationData.province,
            postal_code: locationData.postalCode,
            access_instructions: locationData.accessInstructions,
            alarm_code: locationData.alarmCode,
            parking_info: locationData.parkingInfo,
            has_pets: locationData.hasPets,
            pet_details: locationData.petDetails,
            is_primary: locationData.isPrimary,
            notes: locationData.notes,
          })
          .eq('id', editLocation.id)
          .eq('company_id', user.profile.company_id);

        if (error) throw error;
        toast({ title: t.common.success, description: t.clients.locationUpdated });
      } else {
        // Create new location
        const { error } = await supabase
          .from('client_locations')
          .insert({
            company_id: user.profile.company_id,
            client_id: selectedClient.id,
            address: locationData.address,
            city: locationData.city,
            province: locationData.province,
            postal_code: locationData.postalCode,
            access_instructions: locationData.accessInstructions,
            alarm_code: locationData.alarmCode,
            parking_info: locationData.parkingInfo,
            has_pets: locationData.hasPets,
            pet_details: locationData.petDetails,
            is_primary: locationData.isPrimary,
            notes: locationData.notes,
          });

        if (error) throw error;
        toast({ title: t.common.success, description: t.clients.locationCreated });
      }

      // Refresh client data
      await refreshSelectedClient();
      setIsLocationModalOpen(false);
      setEditLocation(null);
    } catch (err) {
      console.error('Error saving location:', err);
      toast({ title: t.common.error, description: 'Failed to save location', variant: 'destructive' });
    } finally {
      setLocationLoading(false);
    }
  };

  const handleDeleteLocation = async () => {
    if (!deleteLocation || !user?.profile?.company_id) return;
    
    try {
      const { error } = await supabase
        .from('client_locations')
        .delete()
        .eq('id', deleteLocation.id)
        .eq('company_id', user.profile.company_id);

      if (error) throw error;

      await refreshSelectedClient();
      toast({ title: t.common.success, description: t.clients.locationDeleted });
    } catch (err) {
      console.error('Error deleting location:', err);
      toast({ title: t.common.error, description: 'Failed to delete location', variant: 'destructive' });
    } finally {
      setDeleteLocation(null);
    }
  };

  const handleSetPrimaryLocation = async (location: Location) => {
    if (!selectedClient || !user?.profile?.company_id) return;
    
    try {
      // Reset all locations to non-primary
      await supabase
        .from('client_locations')
        .update({ is_primary: false })
        .eq('client_id', selectedClient.id)
        .eq('company_id', user.profile.company_id);

      // Set the selected location as primary
      const { error } = await supabase
        .from('client_locations')
        .update({ is_primary: true })
        .eq('id', location.id)
        .eq('company_id', user.profile.company_id);

      if (error) throw error;

      await refreshSelectedClient();
      toast({ title: t.common.success, description: 'Primary location updated' });
    } catch (err) {
      console.error('Error setting primary location:', err);
      toast({ title: t.common.error, description: 'Failed to update location', variant: 'destructive' });
    }
  };

  const openEditLocationModal = (location: Location) => {
    setEditLocation({
      id: location.id,
      address: location.address,
      city: location.city || '',
      province: location.province || 'Ontario',
      postalCode: location.postalCode || '',
      accessInstructions: location.accessInstructions || '',
      alarmCode: location.alarmCode || '',
      parkingInfo: location.parkingInfo || '',
      hasPets: location.hasPets || false,
      petDetails: location.petDetails || '',
      isPrimary: location.isPrimary || false,
      notes: location.notes || '',
    });
    setIsLocationModalOpen(true);
  };

  const refreshSelectedClient = async () => {
    if (!selectedClient || !user?.profile?.company_id) return;

    const { data, error } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        email,
        phone,
        client_type,
        notes,
        address,
        city,
        province,
        postal_code,
        country,
        client_locations (
          id,
          address,
          city,
          province,
          postal_code,
          access_instructions,
          alarm_code,
          has_pets,
          pet_details,
          parking_info,
          is_primary,
          notes
        )
      `)
      .eq('id', selectedClient.id)
      .eq('company_id', user.profile.company_id)
      .single();

    if (error || !data) return;

    const updatedClient: Client = {
      id: data.id,
      name: data.name,
      type: (data.client_type as 'residential' | 'commercial') || 'residential',
      phone: data.phone || '',
      email: data.email || '',
      notes: data.notes || '',
      status: 'active',
      locationsCount: data.client_locations?.length || 0,
      locations: (data.client_locations || []).map((loc: any) => ({
        id: loc.id,
        address: loc.address,
        city: loc.city,
        province: loc.province,
        postalCode: loc.postal_code,
        accessInstructions: loc.access_instructions,
        alarmCode: loc.alarm_code,
        hasPets: loc.has_pets,
        petDetails: loc.pet_details,
        parkingInfo: loc.parking_info,
        isPrimary: loc.is_primary,
        notes: loc.notes,
      })),
      address: data.address || '',
      city: data.city || '',
      province: data.province || '',
      postalCode: data.postal_code || '',
      country: data.country || 'Canada',
    };

    setSelectedClient(updatedClient);
    await refresh();
  };

  const columns: Column<Client>[] = [
    {
      key: 'name',
      header: t.clients.name,
      render: (client) => (
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
            client.type === 'residential' ? 'bg-cyan-500/15' : 'bg-amber-500/15'
          }`}>
            {client.type === 'residential' 
              ? <Home className="h-4 w-4 text-cyan-500" />
              : <Building className="h-4 w-4 text-amber-500" />
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
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${
          client.type === 'residential' 
            ? 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30' 
            : 'bg-amber-500/15 text-amber-500 border-amber-500/30'
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
      <div className="p-2 lg:p-3 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-2 lg:p-3 space-y-2">
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

      <PaginatedDataTable 
        columns={columns}
        data={clients}
        isLoading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
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
                  {/* Add Location Button */}
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => { setEditLocation(null); setIsLocationModalOpen(true); }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t.clients.addLocation}
                    </Button>
                  </div>

                  {selectedClient.locations.length > 0 ? selectedClient.locations.map((location) => (
                    <Card key={location.id} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {location.address}{location.city ? `, ${location.city}` : ''}
                            {location.isPrimary && (
                              <Badge variant="secondary" className="ml-2 gap-1">
                                <Star className="h-3 w-3" />
                                Primary
                              </Badge>
                            )}
                          </CardTitle>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover">
                              <DropdownMenuItem onClick={() => openEditLocationModal(location)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t.common.edit}
                              </DropdownMenuItem>
                              {!location.isPrimary && (
                                <DropdownMenuItem onClick={() => handleSetPrimaryLocation(location)}>
                                  <Star className="h-4 w-4 mr-2" />
                                  {t.clients.setAsPrimary}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => setDeleteLocation(location)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t.common.delete}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        {location.notes && (
                          <p><span className="text-muted-foreground">Notes:</span> {location.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-center text-muted-foreground py-8">{t.clients.noLocations}</p>
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
          id: editClient.id,
          name: editClient.name,
          email: editClient.email,
          phone: editClient.phone,
          address: editClient.address,
          city: editClient.city,
          province: editClient.province,
          country: editClient.country,
          postalCode: editClient.postalCode,
          type: editClient.type,
          contactPerson: '',
          notes: editClient.notes,
          isActive: editClient.status === 'active',
        } : null}
      />

      {/* Add/Edit Location Modal */}
      <AddLocationModal
        open={isLocationModalOpen}
        onOpenChange={(open) => { setIsLocationModalOpen(open); if (!open) setEditLocation(null); }}
        onSubmit={handleAddLocation}
        editLocation={editLocation}
        isLoading={locationLoading}
      />

      {/* Delete Client Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteClient}
        onOpenChange={() => setDeleteClient(null)}
        onConfirm={handleDeleteClient}
        title={t.common.confirmDelete}
        description={`Are you sure you want to delete "${deleteClient?.name}"? This action cannot be undone.`}
      />

      {/* Delete Location Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteLocation}
        onOpenChange={() => setDeleteLocation(null)}
        onConfirm={handleDeleteLocation}
        title={t.clients.deleteLocation}
        description={t.clients.confirmDeleteLocation}
      />
    </div>
  );
};

export default Clients;