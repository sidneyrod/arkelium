import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AddClientModal, { ClientFormData } from '@/components/modals/AddClientModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Building, Home, MapPin, Phone, CreditCard, Key, PawPrint, Car, MoreHorizontal, Pencil, Trash2, Plus } from 'lucide-react';

interface Location {
  id: string;
  address: string;
  accessInstructions?: string;
  alarmCode?: string;
  hasPets?: boolean;
  petDetails?: string;
  parkingInfo?: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank' | 'other';
  label: string;
  lastFour?: string;
  expiry?: string;
}

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
  locations: Location[];
  paymentMethods: PaymentMethod[];
  billingAddress?: string;
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
      { id: '1', address: '245 Oak Street, Toronto', accessInstructions: 'Ring doorbell twice', alarmCode: '1234', hasPets: true, petDetails: '1 dog, friendly', parkingInfo: 'Street parking available' },
      { id: '2', address: '78 Pine Avenue, Toronto', accessInstructions: 'Key under mat', alarmCode: '5678', hasPets: false, parkingInfo: 'Driveway' },
    ],
    paymentMethods: [
      { id: '1', type: 'card', label: 'Visa', lastFour: '4242', expiry: '12/25' }
    ],
    billingAddress: '245 Oak Street, Toronto'
  },
  { id: '2', name: 'Thompson Corporation', type: 'commercial', phone: '(416) 555-0202', email: 'contact@thompson.com', address: '890 Business Ave', contactPerson: 'John Thompson', notes: '', status: 'active', locationsCount: 3, locations: [], paymentMethods: [] },
  { id: '3', name: 'Emily Chen', type: 'residential', phone: '(416) 555-0203', email: 'emily@email.com', address: '112 Maple Drive', contactPerson: 'Emily Chen', notes: '', status: 'active', locationsCount: 1, locations: [], paymentMethods: [] },
  { id: '4', name: 'Metro Office Solutions', type: 'commercial', phone: '(416) 555-0204', email: 'info@metrooffice.com', address: '456 Tower Blvd', contactPerson: 'Michael Brown', notes: 'After hours cleaning only', status: 'active', locationsCount: 5, locations: [], paymentMethods: [] },
  { id: '5', name: 'Robert Johnson', type: 'residential', phone: '(416) 555-0205', email: 'robert@email.com', address: '321 Elm Street', contactPerson: 'Robert Johnson', notes: '', status: 'inactive', locationsCount: 1, locations: [], paymentMethods: [] },
];

const Clients = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  
  // Location modal state
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationForm, setLocationForm] = useState<Partial<Location>>({});
  
  // Payment method modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [paymentForm, setPaymentForm] = useState<Partial<PaymentMethod>>({});
  
  // Billing address modal
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingAddress, setBillingAddress] = useState('');

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
        paymentMethods: [],
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

  // Location handlers
  const openLocationModal = (location?: Location) => {
    if (location) {
      setEditingLocation(location);
      setLocationForm(location);
    } else {
      setEditingLocation(null);
      setLocationForm({ address: '', accessInstructions: '', alarmCode: '', hasPets: false, petDetails: '', parkingInfo: '' });
    }
    setLocationModalOpen(true);
  };

  const handleSaveLocation = () => {
    if (!selectedClient || !locationForm.address?.trim()) {
      toast({ title: 'Error', description: 'Address is required', variant: 'destructive' });
      return;
    }
    
    setClients(prev => prev.map(c => {
      if (c.id !== selectedClient.id) return c;
      
      let updatedLocations: Location[];
      if (editingLocation) {
        updatedLocations = c.locations.map(l => l.id === editingLocation.id ? { ...l, ...locationForm } as Location : l);
      } else {
        updatedLocations = [...c.locations, { ...locationForm, id: Date.now().toString() } as Location];
      }
      
      return { ...c, locations: updatedLocations, locationsCount: updatedLocations.length };
    }));
    
    // Update selected client
    setSelectedClient(prev => {
      if (!prev) return prev;
      let updatedLocations: Location[];
      if (editingLocation) {
        updatedLocations = prev.locations.map(l => l.id === editingLocation.id ? { ...l, ...locationForm } as Location : l);
      } else {
        updatedLocations = [...prev.locations, { ...locationForm, id: Date.now().toString() } as Location];
      }
      return { ...prev, locations: updatedLocations, locationsCount: updatedLocations.length };
    });
    
    toast({ title: t.common.success, description: editingLocation ? 'Location updated' : 'Location added' });
    setLocationModalOpen(false);
  };

  const handleDeleteLocation = (locationId: string) => {
    if (!selectedClient) return;
    
    setClients(prev => prev.map(c => {
      if (c.id !== selectedClient.id) return c;
      const updatedLocations = c.locations.filter(l => l.id !== locationId);
      return { ...c, locations: updatedLocations, locationsCount: updatedLocations.length };
    }));
    
    setSelectedClient(prev => {
      if (!prev) return prev;
      const updatedLocations = prev.locations.filter(l => l.id !== locationId);
      return { ...prev, locations: updatedLocations, locationsCount: updatedLocations.length };
    });
    
    toast({ title: t.common.success, description: 'Location deleted' });
  };

  // Payment method handlers
  const openPaymentModal = (payment?: PaymentMethod) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm(payment);
    } else {
      setEditingPayment(null);
      setPaymentForm({ type: 'card', label: '', lastFour: '', expiry: '' });
    }
    setPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    if (!selectedClient || !paymentForm.label?.trim()) {
      toast({ title: 'Error', description: 'Label is required', variant: 'destructive' });
      return;
    }
    
    setClients(prev => prev.map(c => {
      if (c.id !== selectedClient.id) return c;
      
      let updatedPayments: PaymentMethod[];
      if (editingPayment) {
        updatedPayments = c.paymentMethods.map(p => p.id === editingPayment.id ? { ...p, ...paymentForm } as PaymentMethod : p);
      } else {
        updatedPayments = [...c.paymentMethods, { ...paymentForm, id: Date.now().toString() } as PaymentMethod];
      }
      
      return { ...c, paymentMethods: updatedPayments };
    }));
    
    setSelectedClient(prev => {
      if (!prev) return prev;
      let updatedPayments: PaymentMethod[];
      if (editingPayment) {
        updatedPayments = prev.paymentMethods.map(p => p.id === editingPayment.id ? { ...p, ...paymentForm } as PaymentMethod : p);
      } else {
        updatedPayments = [...prev.paymentMethods, { ...paymentForm, id: Date.now().toString() } as PaymentMethod];
      }
      return { ...prev, paymentMethods: updatedPayments };
    });
    
    toast({ title: t.common.success, description: editingPayment ? 'Payment method updated' : 'Payment method added' });
    setPaymentModalOpen(false);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!selectedClient) return;
    
    setClients(prev => prev.map(c => {
      if (c.id !== selectedClient.id) return c;
      return { ...c, paymentMethods: c.paymentMethods.filter(p => p.id !== paymentId) };
    }));
    
    setSelectedClient(prev => {
      if (!prev) return prev;
      return { ...prev, paymentMethods: prev.paymentMethods.filter(p => p.id !== paymentId) };
    });
    
    toast({ title: t.common.success, description: 'Payment method deleted' });
  };

  // Billing address handler
  const openBillingModal = () => {
    setBillingAddress(selectedClient?.billingAddress || selectedClient?.address || '');
    setBillingModalOpen(true);
  };

  const handleSaveBilling = () => {
    if (!selectedClient) return;
    
    setClients(prev => prev.map(c => 
      c.id === selectedClient.id ? { ...c, billingAddress } : c
    ));
    
    setSelectedClient(prev => prev ? { ...prev, billingAddress } : prev);
    
    toast({ title: t.common.success, description: 'Billing address updated' });
    setBillingModalOpen(false);
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
                  {selectedClient.locations.length > 0 ? selectedClient.locations.map((location) => (
                    <Card key={location.id} className="border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            {location.address}
                          </CardTitle>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openLocationModal(location)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteLocation(location.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Key className="h-3.5 w-3.5" />
                          <span>{t.clients.accessInstructions}: {location.accessInstructions || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="font-mono">{t.clients.alarmCode}: {location.alarmCode ? '****' : 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <PawPrint className="h-3.5 w-3.5" />
                          <span>{t.clients.pets}: {location.hasPets ? `Yes${location.petDetails ? ` - ${location.petDetails}` : ''}` : 'No'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Car className="h-3.5 w-3.5" />
                          <span>{t.clients.parking}: {location.parkingInfo || 'N/A'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  )) : (
                    <p className="text-muted-foreground text-center py-8">No locations added yet.</p>
                  )}
                  <Button variant="outline" className="w-full gap-2" onClick={() => openLocationModal()}>
                    <Plus className="h-4 w-4" />
                    Add Location
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>{t.clients.billingAddress}</Label>
                    <Button variant="ghost" size="sm" className="h-7" onClick={openBillingModal}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <Input value={selectedClient.billingAddress || selectedClient.address} readOnly />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t.clients.paymentMethod}</Label>
                  </div>
                  
                  {selectedClient.paymentMethods.length > 0 ? selectedClient.paymentMethods.map((payment) => (
                    <div key={payment.id} className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{payment.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.type === 'card' && payment.lastFour && `•••• ${payment.lastFour}`}
                          {payment.expiry && ` • Exp: ${payment.expiry}`}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPaymentModal(payment)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeletePayment(payment.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <span className="text-muted-foreground">No payment method on file</span>
                    </div>
                  )}
                  
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => openPaymentModal()}>
                    <Plus className="h-4 w-4" />
                    Add Payment Method
                  </Button>
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

      {/* Location Modal */}
      <Dialog open={locationModalOpen} onOpenChange={setLocationModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingLocation ? 'Edit Location' : 'Add Location'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={locationForm.address || ''}
                onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                placeholder="123 Main Street, City"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.clients.accessInstructions}</Label>
              <Input
                value={locationForm.accessInstructions || ''}
                onChange={(e) => setLocationForm({ ...locationForm, accessInstructions: e.target.value })}
                placeholder="e.g., Ring doorbell, key under mat..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t.clients.alarmCode}</Label>
              <Input
                type="password"
                value={locationForm.alarmCode || ''}
                onChange={(e) => setLocationForm({ ...locationForm, alarmCode: e.target.value })}
                placeholder="****"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t.clients.pets}</Label>
              <Switch
                checked={locationForm.hasPets || false}
                onCheckedChange={(checked) => setLocationForm({ ...locationForm, hasPets: checked })}
              />
            </div>
            {locationForm.hasPets && (
              <div className="space-y-2">
                <Label>Pet Details</Label>
                <Input
                  value={locationForm.petDetails || ''}
                  onChange={(e) => setLocationForm({ ...locationForm, petDetails: e.target.value })}
                  placeholder="e.g., 2 dogs, friendly"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{t.clients.parking}</Label>
              <Input
                value={locationForm.parkingInfo || ''}
                onChange={(e) => setLocationForm({ ...locationForm, parkingInfo: e.target.value })}
                placeholder="e.g., Street parking, driveway..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocationModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLocation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Method Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPayment ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={paymentForm.type || 'card'} onValueChange={(v: 'card' | 'bank' | 'other') => setPaymentForm({ ...paymentForm, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Label *</Label>
              <Input
                value={paymentForm.label || ''}
                onChange={(e) => setPaymentForm({ ...paymentForm, label: e.target.value })}
                placeholder="e.g., Visa, Mastercard, TD Bank..."
              />
            </div>
            {paymentForm.type === 'card' && (
              <>
                <div className="space-y-2">
                  <Label>Last 4 Digits</Label>
                  <Input
                    maxLength={4}
                    value={paymentForm.lastFour || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, lastFour: e.target.value })}
                    placeholder="4242"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input
                    value={paymentForm.expiry || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, expiry: e.target.value })}
                    placeholder="MM/YY"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Address Modal */}
      <Dialog open={billingModalOpen} onOpenChange={setBillingModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Billing Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Billing Address</Label>
              <Input
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                placeholder="Enter billing address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBillingModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBilling}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clients;