import { useState, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCompanyStore } from '@/stores/activeCompanyStore';
import PageHeader from '@/components/ui/page-header';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Building2 } from 'lucide-react';
import CompanyListTable, { CompanyListItem } from '@/components/company/CompanyListTable';
import EditCompanyModal, { CompanyFormData } from '@/components/company/EditCompanyModal';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

const Companies = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const { 
    activeCompanyId, 
    setActiveCompany, 
    setCompanies: setGlobalCompanies 
  } = useActiveCompanyStore();
  
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  
  // Company modal state
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState<'create' | 'edit'>('create');
  const [editingCompany, setEditingCompany] = useState<CompanyFormData | null>(null);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompanyListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all companies
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, company_code, trade_name, legal_name, city, email, phone, status, created_at')
        .order('company_code', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        setCompanies(data as CompanyListItem[]);
        
        // Sync to global store (for TopBar)
        const activeCompanies = data.filter(c => c.status !== 'archived');
        setGlobalCompanies(activeCompanies.map(c => ({ 
          id: c.id, 
          company_code: c.company_code, 
          trade_name: c.trade_name 
        })));
        
        // Set initial active company if not set
        if (!activeCompanyId && data.length > 0) {
          const userCompany = data.find(c => c.id === user?.profile?.company_id);
          const targetCompany = userCompany || data[0];
          setActiveCompany(targetCompany.id, targetCompany.company_code, targetCompany.trade_name);
        }
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load companies',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingCompanies(false);
    }
  }, [user?.profile?.company_id, activeCompanyId, setActiveCompany, setGlobalCompanies]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  // Handle selecting a company from the list
  const handleSelectCompany = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    if (company) {
      setActiveCompany(company.id, company.company_code, company.trade_name);
    }
  };

  // Open modal to register new company
  const handleOpenRegisterModal = () => {
    setCompanyModalMode('create');
    setEditingCompany(null);
    setEditingCompanyId(null);
    setCompanyModalOpen(true);
  };

  // Open modal to edit company
  const handleOpenEditModal = (company: CompanyListItem) => {
    setCompanyModalMode('edit');
    setEditingCompanyId(company.id);
    
    // Fetch full data for the company
    supabase
      .from('companies')
      .select('*')
      .eq('id', company.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEditingCompany({
            trade_name: data.trade_name || '',
            legal_name: data.legal_name || '',
            address: data.address || '',
            city: data.city || '',
            province: data.province || 'Ontario',
            postal_code: data.postal_code || '',
            email: data.email || '',
            phone: data.phone || '',
            website: data.website || '',
            timezone: (data as any).timezone || 'America/Toronto'
          });
          setCompanyModalOpen(true);
        }
      });
  };

  // Handle save company (create or edit)
  const handleSaveCompany = async (data: CompanyFormData) => {
    setIsSubmittingCompany(true);
    try {
      if (companyModalMode === 'create') {
        const { data: result, error } = await supabase.functions.invoke('setup-company', {
          body: {
            companyName: data.trade_name,
            legalName: data.legal_name,
            email: data.email || undefined,
            phone: data.phone || undefined,
            province: data.province,
            address: data.address || undefined,
            city: data.city || undefined,
            postalCode: data.postal_code || undefined,
            website: data.website || undefined,
            timezone: data.timezone,
            activities: data.activities || [],
          }
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        await fetchCompanies();
        
        if (result?.company?.id) {
          const newCompany = result.company;
          setActiveCompany(newCompany.id, newCompany.company_code, newCompany.trade_name);
        }

        toast({
          title: t.common.success,
          description: 'Company registered successfully'
        });
      } else {
        if (!editingCompanyId) throw new Error('Company not found');

        const { error } = await supabase
          .from('companies')
          .update({
            trade_name: data.trade_name,
            legal_name: data.legal_name,
            address: data.address,
            city: data.city,
            province: data.province,
            postal_code: data.postal_code,
            email: data.email,
            phone: data.phone,
            website: data.website,
            timezone: data.timezone
          })
          .eq('id', editingCompanyId);

        if (error) throw error;

        setCompanies(prev => prev.map(c => 
          c.id === editingCompanyId 
            ? { ...c, trade_name: data.trade_name, legal_name: data.legal_name, city: data.city, email: data.email, phone: data.phone }
            : c
        ));

        toast({
          title: t.common.success,
          description: 'Company updated successfully'
        });
      }

      setCompanyModalOpen(false);
    } catch (error) {
      console.error('Error saving company:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save company',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  // Handle delete company with validation
  const handleDeleteCompany = async (companyId: string) => {
    try {
      const company = companies.find(c => c.id === companyId);
      if (!company) return;

      const { data: checkResult, error: checkError } = await supabase
        .rpc('check_company_can_delete', { p_company_id: companyId });

      if (checkError) {
        console.error('Error checking company dependencies:', checkError);
        toast({
          title: 'Error',
          description: 'Failed to verify if company can be deleted',
          variant: 'destructive'
        });
        return;
      }

      const result = checkResult as { can_delete: boolean; reason: string | null; dependencies: Record<string, number> | null };

      if (!result?.can_delete) {
        const deps = result?.dependencies;
        const depsList = deps ? Object.entries(deps)
          .filter(([_, count]) => (count as number) > 0)
          .map(([key, count]) => `${count} ${key.replace('_', ' ')}`)
          .join(', ') : '';
        
        toast({
          title: 'Cannot Delete Company',
          description: `This company has associated data: ${depsList}. Remove all data first.`,
          variant: 'destructive'
        });
        return;
      }

      setCompanyToDelete(company);
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error('Error checking company:', error);
      toast({
        title: 'Error',
        description: 'Failed to check company status',
        variant: 'destructive'
      });
    }
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;

    setIsDeleting(true);
    try {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyToDelete.id);

      if (deleteError) throw deleteError;

      setCompanies(prev => prev.filter(c => c.id !== companyToDelete.id));
      
      if (activeCompanyId === companyToDelete.id) {
        const otherCompany = companies.find(c => c.id !== companyToDelete.id);
        if (otherCompany) {
          setActiveCompany(otherCompany.id, otherCompany.company_code, otherCompany.trade_name);
        }
      }

      toast({
        title: 'Company Deleted',
        description: `"${companyToDelete.trade_name}" has been permanently removed.`,
      });

      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete company. Make sure you have admin permissions.',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
      setCompanyToDelete(null);
    }
  };

  return (
    <div className="p-2 lg:p-3 space-y-4">
      <PageHeader 
        title="Companies" 
        description="Manage your business companies"
      />

      <CompanyListTable
        companies={companies}
        activeCompanyId={activeCompanyId}
        isLoading={isLoadingCompanies}
        onSelectCompany={handleSelectCompany}
        onEditCompany={handleOpenEditModal}
        onDeleteCompany={handleDeleteCompany}
        onRegisterCompany={handleOpenRegisterModal}
      />

      <EditCompanyModal
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        mode={companyModalMode}
        company={editingCompany}
        onSave={handleSaveCompany}
        isLoading={isSubmittingCompany}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDeleteCompany}
        title={`Delete "${companyToDelete?.trade_name}"?`}
        description={`This will permanently delete company #${companyToDelete?.company_code} and all its configurations. This action cannot be undone.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete Company'}
        variant="destructive"
      />
    </div>
  );
};

export default Companies;
