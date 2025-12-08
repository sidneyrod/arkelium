import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/components/ui/page-header';
import SearchInput from '@/components/ui/search-input';
import DataTable, { Column } from '@/components/ui/data-table';
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
  clientEmail?: string;
  clientPhone?: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface CompanyData {
  id: string;
  trade_name: string;
  legal_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
}

interface BrandingData {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

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
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [brandingData, setBrandingData] = useState<BrandingData | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editContract, setEditContract] = useState<Contract | null>(null);
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);
  const [isSendingSms, setIsSendingSms] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch clients from database
  useEffect(() => {
    const fetchClients = async () => {
      if (!user?.profile?.company_id) return;
      
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, email, phone')
        .eq('company_id', user.profile.company_id);
      
      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }
      
      setClients(data || []);
    };

    fetchClients();
  }, [user?.profile?.company_id]);

  // Fetch contracts from database
  useEffect(() => {
    const fetchContracts = async () => {
      if (!user?.profile?.company_id) return;
      
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id,
          client_id,
          status,
          frequency,
          services,
          monthly_value,
          start_date,
          clients(id, name, email, phone),
          client_locations(address, city)
        `)
        .eq('company_id', user.profile.company_id);
      
      if (error) {
        console.error('Error fetching contracts:', error);
        setIsLoading(false);
        return;
      }
      
      const mappedContracts: Contract[] = (data || []).map((contract: any) => ({
        id: contract.id,
        clientId: contract.client_id,
        clientName: contract.clients?.name || 'Unknown',
        clientEmail: contract.clients?.email,
        clientPhone: contract.clients?.phone,
        location: contract.client_locations?.address 
          ? `${contract.client_locations.address}, ${contract.client_locations.city || ''}`
          : 'No location',
        frequency: contract.frequency === 'bi-weekly' ? 'biweekly' : (contract.frequency || 'weekly') as Contract['frequency'],
        services: contract.services || [],
        status: contract.status as Contract['status'],
        value: contract.monthly_value || 0,
        avgDuration: '3h',
        startDate: contract.start_date || '',
        hoursPerWeek: 4,
        hourlyRate: 45,
      }));
      
      setContracts(mappedContracts);
      setIsLoading(false);
    };

    fetchContracts();
  }, [user?.profile?.company_id]);

  // Fetch company and branding data for PDF generation
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!user?.profile?.company_id) return;
      
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id, trade_name, legal_name, email, phone, address, city, province, postal_code')
        .eq('id', user.profile.company_id)
        .single();
      
      if (companyError) {
        console.error('Error fetching company:', companyError);
        return;
      }
      
      setCompanyData(company);
      
      const { data: branding, error: brandingError } = await supabase
        .from('company_branding')
        .select('logo_url, primary_color, secondary_color, accent_color')
        .eq('company_id', user.profile.company_id)
        .single();
      
      if (!brandingError && branding) {
        setBrandingData(branding);
      }
    };

    fetchCompanyData();
  }, [user?.profile?.company_id]);

  const filteredContracts = contracts.filter(contract =>
    contract.clientName.toLowerCase().includes(search.toLowerCase()) ||
    contract.location.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddContract = async (contractData: ContractFormData) => {
    if (!user?.profile?.company_id) return;
    
    const client = clients.find(c => c.id === contractData.clientId);
    
    if (!client) {
      toast({
        title: t.common.error,
        description: 'Please select a valid client before creating a contract.',
        variant: 'destructive',
      });
      return;
    }
    
    if (editContract) {
      // Update existing contract
      const { error } = await supabase
        .from('contracts')
        .update({
          client_id: contractData.clientId,
          status: contractData.status,
          frequency: contractData.billingFrequency,
          services: contractData.cleaningScope.split(',').map(s => s.trim()).filter(Boolean),
          monthly_value: contractData.hoursPerWeek * contractData.hourlyRate,
          start_date: contractData.startDate?.toISOString().split('T')[0],
          notes: contractData.specialNotes,
        })
        .eq('id', editContract.id);
      
      if (error) {
        toast({
          title: t.common.error,
          description: 'Failed to update contract.',
          variant: 'destructive',
        });
        return;
      }
      
      setContracts(prev => prev.map(c => 
        c.id === editContract.id 
          ? { 
              ...c, 
              clientId: contractData.clientId,
              clientName: client?.name || c.clientName,
              clientEmail: client?.email,
              clientPhone: client?.phone,
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
      toast({
        title: t.common.success,
        description: 'Contract updated successfully.',
      });
    } else {
      // Create new contract
      const contractNumber = `CNT-${Date.now()}`;
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          company_id: user.profile.company_id,
          client_id: contractData.clientId,
          contract_number: contractNumber,
          status: contractData.status,
          frequency: contractData.billingFrequency,
          services: contractData.cleaningScope.split(',').map(s => s.trim()).filter(Boolean),
          monthly_value: contractData.hoursPerWeek * contractData.hourlyRate,
          start_date: contractData.startDate?.toISOString().split('T')[0],
          notes: contractData.specialNotes,
        })
        .select()
        .single();
      
      if (error) {
        toast({
          title: t.common.error,
          description: 'Failed to create contract.',
          variant: 'destructive',
        });
        return;
      }
      
      const newContract: Contract = {
        id: data.id,
        clientId: contractData.clientId,
        clientName: client?.name || 'Unknown',
        clientEmail: client?.email,
        clientPhone: client?.phone,
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
      toast({
        title: t.common.success,
        description: 'Contract created successfully.',
      });
    }
  };

  const handleDeleteContract = async () => {
    if (deleteContract) {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', deleteContract.id);
      
      if (error) {
        toast({
          title: t.common.error,
          description: 'Failed to delete contract.',
          variant: 'destructive',
        });
        return;
      }
      
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
      clientEmail: contract.clientEmail,
      clientPhone: contract.clientPhone,
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
    if (!contract.clientId || contract.clientName === 'Unknown') {
      toast({
        title: t.common.error,
        description: 'Cannot generate PDF: No valid client linked to this contract.',
        variant: 'destructive',
      });
      return;
    }

    if (!companyData) {
      toast({
        title: t.common.error,
        description: 'Company data not loaded. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const pdfData = buildContractPdfData(contract);
      
      // Build company profile from database data
      const companyProfile = {
        companyName: companyData.trade_name || companyData.legal_name,
        legalName: companyData.legal_name,
        email: companyData.email || '',
        phone: companyData.phone || '',
        address: companyData.address || '',
        city: companyData.city || '',
        province: companyData.province || 'Ontario',
        postalCode: companyData.postal_code || '',
        website: '',
        businessNumber: '',
        gstHstNumber: '',
      };
      
      // Build branding from database data
      const branding = {
        logoUrl: brandingData?.logo_url || '',
        primaryColor: brandingData?.primary_color || '#1a3d2e',
        secondaryColor: brandingData?.secondary_color || '#2d5a45',
        accentColor: brandingData?.accent_color || '#4ade80',
      };
      
      const htmlContent = generateContractPdf(pdfData, companyProfile, branding, language);
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
    if (!contract.clientId || contract.clientName === 'Unknown') {
      toast({
        title: t.common.error,
        description: 'Cannot send email: No valid client linked to this contract.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingEmail(contract.id);
    
    // Simulate API call - in production, this would call a backend endpoint
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSendingEmail(null);
    toast({
      title: t.common.success,
      description: `Contract sent to ${contract.clientName} via email.`,
    });
  };

  const handleSendSms = async (contract: Contract) => {
    if (!contract.clientId || contract.clientName === 'Unknown') {
      toast({
        title: t.common.error,
        description: 'Cannot send SMS: No valid client linked to this contract.',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingSms(contract.id);
    
    // Simulate API call - in production, this would call a backend endpoint
    await new Promise(resolve => setTimeout(resolve, 1500));
    
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
        emptyMessage={isLoading ? 'Loading...' : t.common.noData}
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
        clients={clients}
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
