import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyStore } from '@/stores/companyStore';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
import StatusBadge from '@/components/ui/status-badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import AddContractModal, { ContractFormData } from '@/components/modals/AddContractModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { toast } from '@/hooks/use-toast';
import { generateContractPdf, openPdfPreview, ContractPdfData } from '@/utils/pdfGenerator';
import { 
  FilePlus, 
  MapPin, 
  Clock, 
  DollarSign, 
  CheckSquare, 
  History, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  FileText,
  Mail,
  MessageSquare,
  Download,
  Loader2
} from 'lucide-react';

interface Contract {
  id: string;
  clientId: string;
  clientName: string;
  location: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'oneTime';
  services: string[];
  status: 'draft' | 'pending' | 'active' | 'completed' | 'cancelled';
  value: number;
  avgDuration: string;
  startDate: string;
  hoursPerWeek: number;
  hourlyRate: number;
}

const mockClients = [
  { id: '1', name: 'Sarah Mitchell' },
  { id: '2', name: 'Thompson Corporation' },
  { id: '3', name: 'Emily Chen' },
  { id: '4', name: 'Metro Office Solutions' },
  { id: '5', name: 'Robert Johnson' },
];

const initialContracts: Contract[] = [
  { id: '1', clientId: '1', clientName: 'Sarah Mitchell', location: '245 Oak Street', frequency: 'weekly', services: ['Deep Clean', 'Kitchen', 'Bathrooms'], status: 'active', value: 180, avgDuration: '3h', startDate: '2024-01-15', hoursPerWeek: 4, hourlyRate: 45 },
  { id: '2', clientId: '2', clientName: 'Thompson Corp', location: '890 Business Ave', frequency: 'biweekly', services: ['Office Clean', 'Windows', 'Floors'], status: 'active', value: 450, avgDuration: '6h', startDate: '2024-02-01', hoursPerWeek: 6, hourlyRate: 50 },
  { id: '3', clientId: '3', clientName: 'Emily Chen', location: '112 Maple Drive', frequency: 'monthly', services: ['Standard Clean'], status: 'active', value: 120, avgDuration: '2h', startDate: '2024-03-10', hoursPerWeek: 2, hourlyRate: 45 },
  { id: '4', clientId: '4', clientName: 'Metro Office', location: '456 Tower Blvd', frequency: 'weekly', services: ['Daily Clean', 'Sanitization'], status: 'pending', value: 850, avgDuration: '8h', startDate: '2024-06-01', hoursPerWeek: 10, hourlyRate: 55 },
  { id: '5', clientId: '5', clientName: 'Robert Johnson', location: '78 Pine Avenue', frequency: 'oneTime', services: ['Move-out Clean'], status: 'completed', value: 350, avgDuration: '5h', startDate: '2024-05-20', hoursPerWeek: 5, hourlyRate: 45 },
];

const frequencyColors: Record<string, string> = {
  weekly: 'bg-primary/10 text-primary',
  biweekly: 'bg-info/10 text-info',
  monthly: 'bg-success/10 text-success',
  oneTime: 'bg-warning/10 text-warning',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning',
  active: 'bg-success/10 text-success',
  completed: 'bg-info/10 text-info',
  cancelled: 'bg-destructive/10 text-destructive',
};

const Contracts = () => {
  const { t, language } = useLanguage();
  const { profile, branding } = useCompanyStore();
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Contract[]>(initialContracts);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [isSendingSms, setIsSendingSms] = useState<string | null>(null);

  const filteredContracts = contracts.filter(contract =>
    contract.clientName.toLowerCase().includes(search.toLowerCase()) ||
    contract.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddContract = (contractData: ContractFormData) => {
    const client = mockClients.find(c => c.id === contractData.clientId);
    
    if (editContract) {
      setContracts(prev => prev.map(c => 
        c.id === editContract.id 
          ? { 
              ...c, 
              clientId: contractData.clientId,
              clientName: client?.name || c.clientName,
              location: contractData.serviceLocation,
              frequency: (contractData.billingFrequency === 'bi-weekly' ? 'biweekly' : contractData.billingFrequency === 'monthly' ? 'monthly' : 'weekly') as Contract['frequency'],
              services: contractData.cleaningScope.split(',').map(s => s.trim()).filter(Boolean),
              status: contractData.status,
              value: contractData.hoursPerWeek * contractData.hourlyRate,
              hoursPerWeek: contractData.hoursPerWeek,
              hourlyRate: contractData.hourlyRate,
              startDate: contractData.startDate?.toISOString().split('T')[0] || c.startDate,
            } 
          : c
      ));
      setEditContract(null);
    } else {
      const newContract: Contract = {
        id: Date.now().toString(),
        clientId: contractData.clientId,
        clientName: client?.name || 'Unknown',
        location: contractData.serviceLocation,
        frequency: contractData.billingFrequency === 'bi-weekly' ? 'biweekly' : contractData.billingFrequency === 'monthly' ? 'monthly' : 'weekly',
        services: contractData.cleaningScope.split(',').map(s => s.trim()).filter(Boolean),
        status: contractData.status,
        value: contractData.hoursPerWeek * contractData.hourlyRate,
        avgDuration: `${contractData.hoursPerWeek}h`,
        startDate: contractData.startDate?.toISOString().split('T')[0] || '',
        hoursPerWeek: contractData.hoursPerWeek,
        hourlyRate: contractData.hourlyRate,
      };
      setContracts(prev => [...prev, newContract]);
    }
  };

  const handleDeleteContract = () => {
    if (deleteContract) {
      setContracts(prev => prev.filter(c => c.id !== deleteContract.id));
      toast({
        title: t.common.success,
        description: t.contracts.contractDeleted,
      });
      setDeleteContract(null);
    }
  };

  const openEditModal = (contract: Contract) => {
    setEditContract(contract);
    setIsAddModalOpen(true);
  };

  const buildContractPdfData = (contract: Contract): ContractPdfData => {
    return {
      contractId: contract.id,
      clientName: contract.clientName,
      clientAddress: contract.location,
      clientEmail: undefined,
      clientPhone: undefined,
      contractType: contract.frequency === 'oneTime' ? 'one-time' : 'recurring',
      startDate: contract.startDate,
      endDate: undefined,
      hoursPerWeek: contract.hoursPerWeek,
      hourlyRate: contract.hourlyRate,
      billingFrequency: contract.frequency === 'biweekly' ? 'Bi-Weekly' : 
                        contract.frequency === 'monthly' ? 'Monthly' : 
                        contract.frequency === 'weekly' ? 'Weekly' : 'One-Time',
      cleaningDays: [],
      timeWindow: '09:00 - 17:00',
      serviceLocation: contract.location,
      cleaningScope: contract.services.join(', '),
      specialNotes: undefined,
      totalValue: contract.value,
    };
  };

  const handleViewPdf = (contract: Contract) => {
    try {
      const pdfData = buildContractPdfData(contract);
      const htmlContent = generateContractPdf(pdfData, profile, branding, language);
      openPdfPreview(htmlContent, `contract-${contract.id}-${contract.clientName}`);
      
      toast({
        title: t.common.success,
        description: `Contract PDF for ${contract.clientName} is ready.`,
      });
    } catch (error) {
      toast({
        title: t.common.error,
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async (contract: Contract) => {
    setIsSendingEmail(contract.id);
    
    // Simulate API call - in production, this would call a backend endpoint
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // TODO: Replace with actual backend API call
    // const pdfData = buildContractPdfData(contract);
    // await sendContractEmail(contract.clientEmail, pdfData);
    
    setIsSendingEmail(null);
    toast({
      title: t.common.success,
      description: `Contract sent to ${contract.clientName} via email.`,
    });
  };

  const handleSendSms = async (contract: Contract) => {
    setIsSendingSms(contract.id);
    
    // Simulate API call - in production, this would call a backend endpoint
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // TODO: Replace with actual backend API call
    // await sendContractSms(contract.clientPhone, contract.id);
    
    setIsSendingSms(null);
    toast({
      title: t.common.success,
      description: `Contract link sent to ${contract.clientName} via SMS.`,
    });
  };

  const columns: Column<Contract>[] = [
    {
      key: 'clientName',
      header: t.contracts.client,
      render: (contract) => (
        <div>
          <p className="font-medium">{contract.clientName}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {contract.location}
          </p>
        </div>
      ),
    },
    {
      key: 'frequency',
      header: t.contracts.frequency,
      render: (contract) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${frequencyColors[contract.frequency]}`}>
          {t.contracts[contract.frequency]}
        </span>
      ),
    },
    {
      key: 'services',
      header: t.contracts.services,
      render: (contract) => (
        <div className="flex flex-wrap gap-1">
          {contract.services.slice(0, 2).map((service, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{service}</Badge>
          ))}
          {contract.services.length > 2 && (
            <Badge variant="secondary" className="text-xs">+{contract.services.length - 2}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'value',
      header: t.contracts.value,
      render: (contract) => (
        <span className="font-medium">${contract.value}</span>
      ),
    },
    {
      key: 'status',
      header: t.contracts.status,
      render: (contract) => (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[contract.status]}`}>
          {t.contracts[contract.status]}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t.common.actions,
      render: (contract) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewPdf(contract); }}>
              <FileText className="h-4 w-4 mr-2" />
              {t.contracts.viewPdf}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); handleSendEmail(contract); }}
              disabled={isSendingEmail === contract.id}
            >
              {isSendingEmail === contract.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              {t.contracts.sendEmail}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); handleSendSms(contract); }}
              disabled={isSendingSms === contract.id}
            >
              {isSendingSms === contract.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              {t.contracts.sendSms}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(contract); }}>
              <Pencil className="h-4 w-4 mr-2" />
              {t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); setDeleteContract(contract); }}
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
        title={t.contracts.title}
        description="Manage service contracts and agreements"
        action={{
          label: t.contracts.addContract,
          icon: FilePlus,
          onClick: () => { setEditContract(null); setIsAddModalOpen(true); },
        }}
      />

      <SearchInput 
        placeholder="Search contracts..."
        value={search}
        onChange={setSearch}
        className="max-w-sm"
      />

      <DataTable 
        columns={columns}
        data={filteredContracts}
        onRowClick={setSelectedContract}
        emptyMessage={t.common.noData}
      />

      {/* Contract Details Dialog */}
      <Dialog open={!!selectedContract} onOpenChange={() => setSelectedContract(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contract Details</DialogTitle>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-6 mt-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedContract.clientName}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedContract.location}
                  </p>
                </div>
                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[selectedContract.status]}`}>
                  {t.contracts[selectedContract.status]}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <Card className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.contracts.value}</p>
                        <p className="text-xl font-semibold">${selectedContract.value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                        <Clock className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.contracts.duration}</p>
                        <p className="text-xl font-semibold">{selectedContract.avgDuration}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${frequencyColors[selectedContract.frequency]}`}>
                        <History className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t.contracts.frequency}</p>
                        <p className="text-xl font-semibold capitalize">{t.contracts[selectedContract.frequency]}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-primary" />
                    {t.contracts.services}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedContract.services.map((service, i) => (
                      <Badge key={i} variant="secondary">{service}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => handleViewPdf(selectedContract)}>
                  <Download className="h-4 w-4 mr-2" />
                  {t.contracts.viewPdf}
                </Button>
                <Button variant="outline" onClick={() => handleSendEmail(selectedContract)}>
                  <Mail className="h-4 w-4 mr-2" />
                  {t.contracts.sendEmail}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Contract Modal */}
      <AddContractModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSubmit={handleAddContract}
        clients={mockClients}
        editContract={editContract ? {
          id: editContract.id,
          clientId: editContract.clientId,
          status: editContract.status,
          type: editContract.frequency === 'oneTime' ? 'one-time' : 'recurring',
          startDate: editContract.startDate ? new Date(editContract.startDate) : null,
          endDate: null,
          hoursPerWeek: editContract.hoursPerWeek,
          hourlyRate: editContract.hourlyRate,
          billingFrequency: editContract.frequency === 'biweekly' ? 'bi-weekly' : editContract.frequency === 'monthly' ? 'monthly' : 'weekly',
          cleaningDays: [],
          timeWindow: '09:00 - 17:00',
          serviceLocation: editContract.location,
          cleaningScope: editContract.services.join(', '),
          specialNotes: '',
          generatePdfAutomatically: true,
          allowPdfDownload: true,
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteContract}
        onOpenChange={() => setDeleteContract(null)}
        onConfirm={handleDeleteContract}
        title={t.common.confirmDelete}
        description={`Are you sure you want to delete the contract for "${deleteContract?.clientName}"? This action cannot be undone.`}
      />
    </div>
  );
};

export default Contracts;
