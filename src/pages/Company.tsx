import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
  Building2, 
  Upload, 
  DollarSign, 
  Palette, 
  Settings2, 
  ImageIcon,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Calendar,
  Loader2,
  FileText,
  Zap,
  Sliders
} from 'lucide-react';
import { CANADIAN_TIMEZONES } from '@/hooks/useTimezone';
import PreferencesTab from '@/components/company/PreferencesTab';
import CompanyListTable, { CompanyListItem } from '@/components/company/CompanyListTable';
import EditCompanyModal, { CompanyFormData } from '@/components/company/EditCompanyModal';

interface CompanyBranding {
  id?: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface EstimateConfig {
  id?: string;
  default_hourly_rate: number;
  tax_rate: number;
  invoice_generation_mode: 'automatic' | 'manual';
}

interface ExtraFee {
  id: string;
  name: string;
  amount: number;
  is_active: boolean;
  is_percentage: boolean;
  display_order: number;
}

interface ChecklistItem {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
}

const Company = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Companies list (full data for table)
  const [companies, setCompanies] = useState<CompanyListItem[]>([]);
  
  // Active company ID (the one being viewed/edited in tabs)
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  
  // Active company profile data (for tabs)
  const [profile, setProfile] = useState<CompanyFormData>({
    trade_name: '',
    legal_name: '',
    address: '',
    city: '',
    province: 'Ontario',
    postal_code: '',
    email: '',
    phone: '',
    website: '',
    timezone: 'America/Toronto'
  });
  const [initialProfile, setInitialProfile] = useState<CompanyFormData | null>(null);
  
  const [branding, setBranding] = useState<CompanyBranding>({
    logo_url: null,
    primary_color: '#1a3d2e',
    secondary_color: '#2d5a45',
    accent_color: '#4ade80'
  });
  const [initialBranding, setInitialBranding] = useState<CompanyBranding | null>(null);
  
  const [estimateConfig, setEstimateConfig] = useState<EstimateConfig>({
    default_hourly_rate: 35,
    tax_rate: 13,
    invoice_generation_mode: 'manual'
  });
  const [initialEstimateConfig, setInitialEstimateConfig] = useState<EstimateConfig | null>(null);
  
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  // Fee modal state
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ExtraFee | null>(null);
  const [feeForm, setFeeForm] = useState({ name: '', amount: 0 });
  
  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);
  const [checklistForm, setChecklistForm] = useState({ name: '' });

  // Company modal state
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyModalMode, setCompanyModalMode] = useState<'create' | 'edit'>('create');
  const [editingCompany, setEditingCompany] = useState<CompanyFormData | null>(null);
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  // Check if there are changes
  const checkForChanges = useCallback(() => {
    if (!initialProfile || !initialBranding || !initialEstimateConfig) return false;
    
    const profileChanged = JSON.stringify(profile) !== JSON.stringify(initialProfile);
    const brandingChanged = JSON.stringify({
      logo_url: branding.logo_url,
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      accent_color: branding.accent_color
    }) !== JSON.stringify({
      logo_url: initialBranding.logo_url,
      primary_color: initialBranding.primary_color,
      secondary_color: initialBranding.secondary_color,
      accent_color: initialBranding.accent_color
    });
    const estimateChanged = JSON.stringify({
      default_hourly_rate: estimateConfig.default_hourly_rate,
      tax_rate: estimateConfig.tax_rate,
      invoice_generation_mode: estimateConfig.invoice_generation_mode
    }) !== JSON.stringify({
      default_hourly_rate: initialEstimateConfig.default_hourly_rate,
      tax_rate: initialEstimateConfig.tax_rate,
      invoice_generation_mode: initialEstimateConfig.invoice_generation_mode
    });
    
    return profileChanged || brandingChanged || estimateChanged;
  }, [profile, branding, estimateConfig, initialProfile, initialBranding, initialEstimateConfig]);

  const { setTabUnsavedChanges } = useWorkspaceStore();

  useEffect(() => {
    const changed = checkForChanges();
    setHasChanges(changed);
    setTabUnsavedChanges('company', changed);
  }, [checkForChanges, setTabUnsavedChanges]);

  // Fetch all companies with full data
  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, trade_name, legal_name, city, email, phone, status, created_at, archived_at')
        .order('status', { ascending: true })
        .order('trade_name');
      
      if (error) throw error;
      
      if (data) {
        setCompanies(data);
        
        // Set initial active company if not set
        if (!activeCompanyId && data.length > 0) {
          // Prefer user's profile company, or first active company
          const userCompany = data.find(c => c.id === user?.profile?.company_id && c.status !== 'archived');
          const firstActiveCompany = data.find(c => c.status !== 'archived');
          const targetCompany = userCompany || firstActiveCompany || data[0];
          setActiveCompanyId(targetCompany.id);
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
  }, [user?.profile?.company_id, activeCompanyId]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load active company data (tabs data)
  const loadActiveCompanyData = useCallback(async (companyId: string) => {
    setIsFetching(true);
    try {
      // Fetch company profile
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle();

      if (companyError) throw companyError;
      
      if (!companyData) {
        console.warn('Company not found:', companyId);
        toast({
          title: 'Warning',
          description: 'Company not accessible. Selecting another company.',
          variant: 'destructive'
        });
        // Try to select another company
        const otherCompany = companies.find(c => c.id !== companyId && c.status !== 'archived');
        if (otherCompany) {
          setActiveCompanyId(otherCompany.id);
        }
        return;
      }

      const profileData: CompanyFormData = {
        trade_name: companyData.trade_name || '',
        legal_name: companyData.legal_name || '',
        address: companyData.address || '',
        city: companyData.city || '',
        province: companyData.province || 'Ontario',
        postal_code: companyData.postal_code || '',
        email: companyData.email || '',
        phone: companyData.phone || '',
        website: companyData.website || '',
        timezone: (companyData as any).timezone || 'America/Toronto'
      };
      setProfile(profileData);
      setInitialProfile(profileData);

      // Fetch branding
      const { data: brandingData } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (brandingData) {
        const brandData: CompanyBranding = {
          id: brandingData.id,
          logo_url: brandingData.logo_url,
          primary_color: brandingData.primary_color || '#1a3d2e',
          secondary_color: brandingData.secondary_color || '#2d5a45',
          accent_color: brandingData.accent_color || '#4ade80'
        };
        setBranding(brandData);
        setInitialBranding(brandData);
      } else {
        const defaultBranding: CompanyBranding = {
          logo_url: null,
          primary_color: '#1a3d2e',
          secondary_color: '#2d5a45',
          accent_color: '#4ade80'
        };
        setBranding(defaultBranding);
        setInitialBranding(defaultBranding);
      }

      // Fetch estimate config
      const { data: estimateData } = await supabase
        .from('company_estimate_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (estimateData) {
        const estConfig: EstimateConfig = {
          id: estimateData.id,
          default_hourly_rate: estimateData.default_hourly_rate || 35,
          tax_rate: estimateData.tax_rate || 13,
          invoice_generation_mode: (estimateData as any).invoice_generation_mode || 'manual'
        };
        setEstimateConfig(estConfig);
        setInitialEstimateConfig(estConfig);
      } else {
        const defaultConfig: EstimateConfig = {
          default_hourly_rate: 35,
          tax_rate: 13,
          invoice_generation_mode: 'manual'
        };
        setEstimateConfig(defaultConfig);
        setInitialEstimateConfig(defaultConfig);
      }

      // Fetch extra fees
      const { data: feesData } = await supabase
        .from('extra_fees')
        .select('*')
        .eq('company_id', companyId)
        .order('display_order');

      setExtraFees(feesData || []);

      // Fetch checklist items
      const { data: checklistData } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('company_id', companyId)
        .order('display_order');

      setChecklistItems(checklistData || []);

    } catch (error) {
      console.error('Error loading company data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load company data',
        variant: 'destructive'
      });
    } finally {
      setIsFetching(false);
    }
  }, [companies]);

  // Load active company data when activeCompanyId changes
  useEffect(() => {
    if (activeCompanyId) {
      loadActiveCompanyData(activeCompanyId);
    } else {
      setIsFetching(false);
    }
  }, [activeCompanyId, loadActiveCompanyData]);

  // Handle selecting a company from the list
  const handleSelectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
  };

  // Open modal to register new company
  const handleOpenRegisterModal = () => {
    setCompanyModalMode('create');
    setEditingCompany(null);
    setCompanyModalOpen(true);
  };

  // Open modal to edit company
  const handleOpenEditModal = (company: CompanyListItem) => {
    setCompanyModalMode('edit');
    // Get full data if it's the active company, otherwise use list data
    if (company.id === activeCompanyId) {
      setEditingCompany({ ...profile });
    } else {
      // Fetch full data for non-active company
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
          }
        });
    }
    setCompanyModalOpen(true);
  };

  // Handle save company (create or edit)
  const handleSaveCompany = async (data: CompanyFormData) => {
    setIsSubmittingCompany(true);
    try {
      if (companyModalMode === 'create') {
        // Use edge function for creating company
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
          }
        });

        if (error) throw error;
        if (result?.error) throw new Error(result.error);

        // Refresh companies list
        await fetchCompanies();
        
        // Select the new company
        if (result?.company?.id) {
          setActiveCompanyId(result.company.id);
        }

        toast({
          title: t.common.success,
          description: 'Company registered successfully'
        });
      } else {
        // Edit existing company - find which company we're editing
        const companyToEdit = companies.find(c => 
          c.trade_name === editingCompany?.trade_name && 
          c.legal_name === editingCompany?.legal_name
        ) || (activeCompanyId ? { id: activeCompanyId } : null);
        
        if (!companyToEdit) throw new Error('Company not found');

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
          .eq('id', companyToEdit.id);

        if (error) throw error;

        // Update local list
        setCompanies(prev => prev.map(c => 
          c.id === companyToEdit.id 
            ? { ...c, trade_name: data.trade_name, legal_name: data.legal_name, city: data.city, email: data.email, phone: data.phone }
            : c
        ));

        // If editing active company, update profile state
        if (companyToEdit.id === activeCompanyId) {
          setProfile(data);
          setInitialProfile(data);
        }

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

  // Handle archive company
  const handleArchiveCompany = async (companyId: string) => {
    if (!confirm('Are you sure you want to archive this company? It can be restored later.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .update({
          status: 'archived',
          archived_at: new Date().toISOString(),
          archived_by: user?.id
        })
        .eq('id', companyId);

      if (error) throw error;

      // Update local list
      setCompanies(prev => prev.map(c => 
        c.id === companyId 
          ? { ...c, status: 'archived', archived_at: new Date().toISOString() }
          : c
      ));
      
      // If archived company was active, switch to another
      if (activeCompanyId === companyId) {
        const otherCompany = companies.find(c => c.id !== companyId && c.status !== 'archived');
        setActiveCompanyId(otherCompany?.id || null);
      }

      toast({
        title: t.common.success,
        description: 'Company archived successfully'
      });
    } catch (error) {
      console.error('Error archiving company:', error);
      toast({
        title: 'Error',
        description: 'Failed to archive company',
        variant: 'destructive'
      });
    }
  };

  // Handle restore company
  const handleRestoreCompany = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          status: 'active',
          archived_at: null,
          archived_by: null
        })
        .eq('id', companyId);

      if (error) throw error;

      // Update local list
      setCompanies(prev => prev.map(c => 
        c.id === companyId 
          ? { ...c, status: 'active', archived_at: null }
          : c
      ));

      toast({
        title: t.common.success,
        description: 'Company restored successfully'
      });
    } catch (error) {
      console.error('Error restoring company:', error);
      toast({
        title: 'Error',
        description: 'Failed to restore company',
        variant: 'destructive'
      });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeCompanyId) {
      toast({
        title: 'Error',
        description: 'No file selected or company not found',
        variant: 'destructive'
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
      
      if (!fileExt || !validExtensions.includes(fileExt)) {
        toast({
          title: 'Error',
          description: 'Invalid file format. Please use PNG, JPG, SVG, or WebP.',
          variant: 'destructive'
        });
        return;
      }

      const fileName = `${activeCompanyId}/logo.${fileExt}`;
      
      await supabase.storage.from('company-assets').remove([fileName]);
      
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600',
          contentType: file.type
        });

      if (uploadError) throw new Error(uploadError.message || 'Upload failed');

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      setBranding(prev => ({ ...prev, logo_url: publicUrl }));
      
      await supabase
        .from('company_branding')
        .upsert({
          id: branding.id,
          company_id: activeCompanyId,
          logo_url: publicUrl,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color
        }, { onConflict: 'company_id' });

      toast({
        title: t.common.success,
        description: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    if (!activeCompanyId || !hasChanges) return;
    
    setIsLoading(true);
    try {
      const { error: profileError } = await supabase
        .from('companies')
        .update({
          trade_name: profile.trade_name,
          legal_name: profile.legal_name,
          address: profile.address,
          city: profile.city,
          province: profile.province,
          postal_code: profile.postal_code,
          email: profile.email,
          phone: profile.phone,
          website: profile.website,
          timezone: profile.timezone
        })
        .eq('id', activeCompanyId);

      if (profileError) throw profileError;

      const { error: brandingError } = await supabase
        .from('company_branding')
        .upsert({
          id: branding.id,
          company_id: activeCompanyId,
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color
        }, { onConflict: 'company_id' });

      if (brandingError) throw brandingError;

      const { error: estimateError } = await supabase
        .from('company_estimate_config')
        .upsert({
          id: estimateConfig.id,
          company_id: activeCompanyId,
          default_hourly_rate: estimateConfig.default_hourly_rate,
          tax_rate: estimateConfig.tax_rate,
          invoice_generation_mode: estimateConfig.invoice_generation_mode
        }, { onConflict: 'company_id' });

      if (estimateError) throw estimateError;

      setInitialProfile({ ...profile });
      setInitialBranding({ ...branding });
      setInitialEstimateConfig({ ...estimateConfig });
      setHasChanges(false);

      // Update companies list
      setCompanies(prev => prev.map(c => 
        c.id === activeCompanyId 
          ? { ...c, trade_name: profile.trade_name, legal_name: profile.legal_name, city: profile.city, email: profile.email, phone: profile.phone }
          : c
      ));

      toast({
        title: t.common.success,
        description: t.company.saved,
      });
    } catch (error) {
      console.error('Error saving company data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save company data',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fee handlers - fixed to use activeCompanyId
  const openFeeModal = (fee?: ExtraFee) => {
    if (fee) {
      setEditingFee(fee);
      setFeeForm({ name: fee.name, amount: fee.amount });
    } else {
      setEditingFee(null);
      setFeeForm({ name: '', amount: 0 });
    }
    setFeeModalOpen(true);
  };

  const handleSaveFee = async () => {
    if (!feeForm.name.trim() || !activeCompanyId) {
      toast({ title: 'Error', description: 'Fee name is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingFee) {
        const { error } = await supabase
          .from('extra_fees')
          .update({ name: feeForm.name, amount: feeForm.amount })
          .eq('id', editingFee.id);

        if (error) throw error;

        setExtraFees(prev => prev.map(f => 
          f.id === editingFee.id ? { ...f, name: feeForm.name, amount: feeForm.amount } : f
        ));
        toast({ title: t.common.success, description: 'Fee updated successfully' });
      } else {
        const maxOrder = extraFees.length > 0 ? Math.max(...extraFees.map(f => f.display_order)) + 1 : 0;
        
        const { data, error } = await supabase
          .from('extra_fees')
          .insert({
            company_id: activeCompanyId,
            name: feeForm.name,
            amount: feeForm.amount,
            is_active: true,
            is_percentage: false,
            display_order: maxOrder
          })
          .select()
          .single();

        if (error) throw error;

        setExtraFees(prev => [...prev, data]);
        toast({ title: t.common.success, description: 'Fee created successfully' });
      }
      setFeeModalOpen(false);
    } catch (error) {
      console.error('Error saving fee:', error);
      toast({ title: 'Error', description: 'Failed to save fee', variant: 'destructive' });
    }
  };

  const handleDeleteFee = async (id: string) => {
    if (!activeCompanyId) return;
    
    try {
      const { error } = await supabase
        .from('extra_fees')
        .delete()
        .eq('id', id)
        .eq('company_id', activeCompanyId);

      if (error) throw error;

      setExtraFees(prev => prev.filter(f => f.id !== id));
      toast({ title: t.common.success, description: 'Fee deleted successfully' });
    } catch (error) {
      console.error('Error deleting fee:', error);
      toast({ title: 'Error', description: 'Failed to delete fee', variant: 'destructive' });
    }
  };

  const handleToggleFee = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('extra_fees')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setExtraFees(prev => prev.map(f => f.id === id ? { ...f, is_active: isActive } : f));
    } catch (error) {
      console.error('Error toggling fee:', error);
    }
  };

  // Checklist handlers - fixed to use activeCompanyId
  const openChecklistModal = (item?: ChecklistItem) => {
    if (item) {
      setEditingChecklist(item);
      setChecklistForm({ name: item.name });
    } else {
      setEditingChecklist(null);
      setChecklistForm({ name: '' });
    }
    setChecklistModalOpen(true);
  };

  const handleSaveChecklist = async () => {
    if (!checklistForm.name.trim() || !activeCompanyId) {
      toast({ title: 'Error', description: 'Item name is required', variant: 'destructive' });
      return;
    }

    try {
      if (editingChecklist) {
        const { error } = await supabase
          .from('checklist_items')
          .update({ name: checklistForm.name })
          .eq('id', editingChecklist.id);

        if (error) throw error;

        setChecklistItems(prev => prev.map(i => 
          i.id === editingChecklist.id ? { ...i, name: checklistForm.name } : i
        ));
        toast({ title: t.common.success, description: 'Item updated successfully' });
      } else {
        const maxOrder = checklistItems.length > 0 ? Math.max(...checklistItems.map(i => i.display_order || 0)) + 1 : 0;
        
        const { data, error } = await supabase
          .from('checklist_items')
          .insert({
            company_id: activeCompanyId,
            name: checklistForm.name,
            is_active: true,
            display_order: maxOrder
          })
          .select()
          .single();

        if (error) throw error;

        setChecklistItems(prev => [...prev, data]);
        toast({ title: t.common.success, description: 'Item created successfully' });
      }
      setChecklistModalOpen(false);
    } catch (error) {
      console.error('Error saving checklist item:', error);
      toast({ title: 'Error', description: 'Failed to save item', variant: 'destructive' });
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    if (!activeCompanyId) return;
    
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id)
        .eq('company_id', activeCompanyId);

      if (error) throw error;

      setChecklistItems(prev => prev.filter(i => i.id !== id));
      toast({ title: t.common.success, description: 'Item deleted successfully' });
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  };

  const handleToggleChecklist = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('checklist_items')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setChecklistItems(prev => prev.map(i => i.id === id ? { ...i, is_active: isActive } : i));
    } catch (error) {
      console.error('Error toggling checklist item:', error);
    }
  };

  const moveChecklistItem = async (index: number, direction: 'up' | 'down') => {
    const items = [...checklistItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    
    const currentItem = items[index];
    const swapItem = items[newIndex];
    
    try {
      await supabase.from('checklist_items').update({ display_order: newIndex }).eq('id', currentItem.id);
      await supabase.from('checklist_items').update({ display_order: index }).eq('id', swapItem.id);

      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      const reordered = items.map((item, i) => ({ ...item, display_order: i }));
      setChecklistItems(reordered);
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  return (
    <div className="p-2 lg:p-3 space-y-2">
      <Tabs defaultValue="profile" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <TabsList className="h-auto p-1 gap-2 bg-muted/50">
            <TabsTrigger value="profile" className="gap-2 px-4 py-2 data-[state=active]:bg-background">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.company.profile}</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-2 px-4 py-2 data-[state=active]:bg-background">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t.company.branding}</span>
            </TabsTrigger>
            <TabsTrigger value="estimates" className="gap-2 px-4 py-2 data-[state=active]:bg-background">
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.company.estimateConfig}</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2 px-4 py-2 data-[state=active]:bg-background">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule Config</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2 px-4 py-2 data-[state=active]:bg-background">
              <Sliders className="h-4 w-4" />
              <span className="hidden sm:inline">Preferences</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <Select value={activeCompanyId || ''} onValueChange={handleSelectCompany}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {companies.filter(c => c.status !== 'archived').map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.trade_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Profile Tab - Companies List */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <CompanyListTable
            companies={companies}
            activeCompanyId={activeCompanyId}
            isLoading={isLoadingCompanies}
            onSelectCompany={handleSelectCompany}
            onEditCompany={handleOpenEditModal}
            onArchiveCompany={handleArchiveCompany}
            onRestoreCompany={handleRestoreCompany}
            onRegisterCompany={handleOpenRegisterModal}
          />
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          {isFetching ? (
            <Card className="border-border/50">
              <CardContent className="py-16 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  {t.company.logo}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t.company.logoDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border shrink-0">
                    {branding.logo_url ? (
                      <img 
                        src={branding.logo_url} 
                        alt="Company logo" 
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <span className="text-xs text-muted-foreground">No logo</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="gap-2 h-8"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {t.company.uploadLogo}
                      </Button>
                      {branding.logo_url && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive h-8"
                          onClick={() => setBranding(prev => ({ ...prev, logo_url: null }))}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Recommended: PNG or SVG format, at least 200x200 pixels
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Estimate Configuration Tab */}
        <TabsContent value="estimates" className="space-y-4 mt-4">
          {isFetching ? (
            <Card className="border-border/50">
              <CardContent className="py-16 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-primary" />
                    {t.company.pricing}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Configure default pricing for estimates and contracts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label htmlFor="defaultRate" className="text-xs">{t.company.defaultHourlyRate}</Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                        <Input 
                          id="defaultRate" 
                          type="number"
                          step="0.01"
                          value={estimateConfig.default_hourly_rate}
                          onChange={(e) => setEstimateConfig(prev => ({ ...prev, default_hourly_rate: parseFloat(e.target.value) || 0 }))}
                          className="pl-6 h-8 text-sm" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="taxRate" className="text-xs">{t.company.taxRate}</Label>
                      <div className="relative">
                        <Input 
                          id="taxRate" 
                          type="number"
                          step="0.01"
                          value={estimateConfig.tax_rate}
                          onChange={(e) => setEstimateConfig(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                          className="pr-6 h-8 text-sm" 
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Extra Fees Management */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Plus className="h-4 w-4 text-primary" />
                        Extra Service Fees
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Manage additional fees for estimates and contracts
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openFeeModal()} className="h-8 gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Fee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extraFees.map((fee) => (
                      <div 
                        key={fee.id} 
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={fee.is_active}
                            onCheckedChange={(checked) => handleToggleFee(fee.id, checked)}
                          />
                          <span className={`text-sm ${!fee.is_active && 'text-muted-foreground'}`}>{fee.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">${fee.amount.toFixed(2)}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFeeModal(fee)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteFee(fee.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {extraFees.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No extra fees configured</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Schedule Configuration Tab */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          {isFetching ? (
            <Card className="border-border/50">
              <CardContent className="py-16 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Invoice Generation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Choose how invoices are generated when jobs are completed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        estimateConfig.invoice_generation_mode === 'automatic' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border/50 hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setEstimateConfig(prev => ({ ...prev, invoice_generation_mode: 'automatic' }))}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          estimateConfig.invoice_generation_mode === 'automatic' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <Zap className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Automatic</h4>
                          <p className="text-xs text-muted-foreground">Generate on job completion</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Invoice is automatically created when a job is marked as completed.
                      </p>
                    </div>
                    
                    <div 
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        estimateConfig.invoice_generation_mode === 'manual' 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border/50 hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setEstimateConfig(prev => ({ ...prev, invoice_generation_mode: 'manual' }))}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          estimateConfig.invoice_generation_mode === 'manual' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Manual</h4>
                          <p className="text-xs text-muted-foreground">Review before generating</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Completed jobs appear in "Completed Services" for admin review.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        Job Completion Checklist
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Manage checklist items used during job completion
                      </CardDescription>
                    </div>
                    <Button size="sm" onClick={() => openChecklistModal()} className="h-8 gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {checklistItems
                      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
                      .map((item, index) => (
                        <div 
                          key={item.id} 
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0"
                                onClick={() => moveChecklistItem(index, 'up')}
                                disabled={index === 0}
                              >
                                <GripVertical className="h-3 w-3 rotate-90" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0"
                                onClick={() => moveChecklistItem(index, 'down')}
                                disabled={index === checklistItems.length - 1}
                              >
                                <GripVertical className="h-3 w-3 -rotate-90" />
                              </Button>
                            </div>
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={(checked) => handleToggleChecklist(item.id, checked)}
                            />
                            <span className={`text-sm ${!item.is_active && 'text-muted-foreground'}`}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openChecklistModal(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteChecklist(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {checklistItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No checklist items configured</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <PreferencesTab companyId={activeCompanyId} />
      </Tabs>

      {/* Fee Modal */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Edit Fee' : 'Add Extra Fee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Fee Name</Label>
              <Input
                value={feeForm.name}
                onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })}
                placeholder="e.g., Pet Fee"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={feeForm.amount}
                onChange={(e) => setFeeForm({ ...feeForm, amount: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFee}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist Modal */}
      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? 'Edit Checklist Item' : 'Add Checklist Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={checklistForm.name}
                onChange={(e) => setChecklistForm({ ...checklistForm, name: e.target.value })}
                placeholder="e.g., Vacuum floors"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChecklist}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Modal (Create/Edit) */}
      <EditCompanyModal
        open={companyModalOpen}
        onOpenChange={setCompanyModalOpen}
        company={editingCompany}
        isLoading={isSubmittingCompany}
        onSave={handleSaveCompany}
        mode={companyModalMode}
      />
    </div>
  );
};

export default Company;
