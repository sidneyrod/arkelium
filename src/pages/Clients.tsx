import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AddClientModal, { ClientFormData } from '@/components/modals/AddClientModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Building, Home, MapPin, Phone, CreditCard, Key, PawPrint, Car, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  type: 'residential' | 'commercial';
  phone: string;
  email: string;
  address: string;
  contactPerson: string;
  notes: string;
  status: 'active' | 'inactive';
  locationsCount: number;
  locations?: Location[];
}

interface Location {
  id: string;
  address: string;
  accessInstructions?: string;
  alarmCode?: string;
  hasPets?: boolean;
  parkingInfo?: string;
}

const initialClients: Client[] = [
  { 
    id: '1', 
    name: 'Sarah Mitchell', 
    type: 'residential', 
    phone: '(416) 555-0201', 
    email: 'sarah@email.com',
    address: '245 Oak Street, Toronto',
    contactPerson: 'Sarah Mitchell',
    notes: 'Prefers morning appointments',
    status: 'active', 
    locationsCount: 2,
    locations: [
      { id: '1', address: '245 Oak Street, Toronto', accessInstructions: 'Ring doorbell twice', alarmCode: '****', hasPets: true, parkingInfo: 'Street parking available' },
      { id: '2', address: '78 Pine Avenue, Toronto', accessInstructions: 'Key under mat', alarmCode: '****', hasPets: false, parkingInfo: 'Driveway' },
    ]
  },
  { id: '2', name: 'Thompson Corporation', type: 'commercial', phone: '(416) 555-0202', email: 'contact@thompson.com', address: '890 Business Ave', contactPerson: 'John Thompson', notes: '', status: 'active', locationsCount: 3 },
  { id: '3', name: 'Emily Chen', type: 'residential', phone: '(416) 555-0203', email: 'emily@email.com', address: '112 Maple Drive', contactPerson: 'Emily Chen', notes: '', status: 'active', locationsCount: 1 },
  { id: '4', name: 'Metro Office Solutions', type: 'commercial', phone: '(416) 555-0204', email: 'info@metrooffice.com', address: '456 Tower Blvd', contactPerson: 'Michael Brown', notes: 'After hours cleaning only', status: 'active', locationsCount: 5 },
  { id: '5', name: 'Robert Johnson', type: 'residential', phone: '(416) 555-0205', email: 'robert@email.com', address: '321 Elm Street', contactPerson: 'Robert Johnson', notes: '', status: 'inactive', locationsCount: 1 },
];

const Clients = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddClient = (clientData: ClientFormData) => {
    if (editClient) {
      setClients(prev => prev.map(c => 
        c.id === editClient.id 
          ? { ...c, ...clientData, status: clientData.isActive ? 'active' : 'inactive' } 
          : c
      ));
      setEditClient(null);
    } else {
      const newClient: Client = {
        id: Date.now().toString(),
        ...clientData,
        status: clientData.isActive ? 'active' : 'inactive',
        locationsCount: 0,
        locations: [],
      };
      setClients(prev => [...prev, newClient]);
    }
  };

  const handleDeleteClient = () => {
    if (deleteClient) {
      setClients(prev => prev.filter(c => c.id !== deleteClient.id));
      toast({
        title: t.common.success,
        description: t.clients.clientDeleted,
      });
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
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Information</TabsTrigger>
                <TabsTrigger value="locations">{t.clients.locations}</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
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
                  {selectedClient.locations?.map((location) => (
                    <Card key={location.id} className="border-border/50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          {location.address}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Key className="h-3.5 w-3.5" />
                          <span>{t.clients.accessInstructions}: {location.accessInstructions || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono">{t.clients.alarmCode}: {location.alarmCode || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <PawPrint className="h-3.5 w-3.5" />
                          <span>{t.clients.pets}: {location.hasPets ? 'Yes' : 'No'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Car className="h-3.5 w-3.5" />
                          <span>{t.clients.parking}: {location.parkingInfo || 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )) || (
                    <p className="text-muted-foreground text-center py-8">No locations added yet.</p>
                  )}
                  <Button variant="outline" className="w-full">Add Location</Button>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>{t.clients.billingAddress}</Label>
                  <Input defaultValue={selectedClient.address} readOnly />
                </div>
                <div className="space-y-2">
                  <Label>{t.clients.paymentMethod}</Label>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">No payment method on file</span>
                    <Button variant="outline" size="sm" className="ml-auto">Add</Button>
                  </div>
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
          type: editClient.type,
          address: editClient.address,
          contactPerson: editClient.contactPerson,
          phone: editClient.phone,
          email: editClient.email,
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
