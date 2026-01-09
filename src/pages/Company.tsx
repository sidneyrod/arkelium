import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  Save,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Calendar,
  Loader2,
  Globe,
  FileText,
  Zap,
  Clock,
  Sliders
} from 'lucide-react';
import { CANADIAN_TIMEZONES } from '@/hooks/useTimezone';
import PreferencesTab from '@/components/company/PreferencesTab';

const canadianProvinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Northwest Territories', 'Nunavut', 'Yukon'
];

interface CompanyProfile {
  trade_name: string;
  legal_name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  email: string;
  phone: string;
  website: string;
  timezone: string;
}

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
  const [hasChanges, setHasChanges] = useState(false);
  
  // Company data from database
  const [profile, setProfile] = useState<CompanyProfile>({
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
  const [initialProfile, setInitialProfile] = useState<CompanyProfile | null>(null);
  
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

  // Company selection state
  const [companiesList, setCompaniesList] = useState<{ id: string; trade_name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  // Register company modal state
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState<CompanyProfile>({
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

  // Edit company modal state
  const [editCompanyModalOpen, setEditCompanyModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const companyId = selectedCompanyId || user?.profile?.company_id;

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
    // Update workspace tab to show unsaved indicator
    setTabUnsavedChanges('company', changed);
  }, [checkForChanges, setTabUnsavedChanges]);

  // Fetch companies list
  useEffect(() => {
    const fetchCompaniesList = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('id, trade_name')
          .order('trade_name');
        
        if (error) throw error;
        
        if (data) {
          setCompaniesList(data);
          // Set initial selection to user's company
          if (user?.profile?.company_id && !selectedCompanyId) {
            setSelectedCompanyId(user.profile.company_id);
          }
        }
      } catch (error) {
        console.error('Error fetching companies list:', error);
      }
    };

    fetchCompaniesList();
  }, [user?.profile?.company_id]);

  // Handle company selection change
  const handleCompanyChange = async (newCompanyId: string) => {
    setSelectedCompanyId(newCompanyId);
    setIsFetching(true);
  };

  // Handle register new company
  const handleRegisterCompany = async () => {
    if (!newCompanyForm.trade_name.trim() || !newCompanyForm.legal_name.trim()) {
      toast({
        title: 'Error',
        description: 'Company Name and Legal Name are required',
        variant: 'destructive'
      });
      return;
    }

    setIsRegistering(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert({
          trade_name: newCompanyForm.trade_name,
          legal_name: newCompanyForm.legal_name,
          address: newCompanyForm.address,
          city: newCompanyForm.city,
          province: newCompanyForm.province,
          postal_code: newCompanyForm.postal_code,
          email: newCompanyForm.email,
          phone: newCompanyForm.phone,
          website: newCompanyForm.website,
          timezone: newCompanyForm.timezone
        })
        .select()
        .single();

      if (error) throw error;

      // Add to list and select it
      if (data) {
        setCompaniesList(prev => [...prev, { id: data.id, trade_name: data.trade_name }]);
        setSelectedCompanyId(data.id);
      }

      setRegisterModalOpen(false);
      setNewCompanyForm({
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

      toast({
        title: t.common.success,
        description: 'Company registered successfully'
      });
    } catch (error) {
      console.error('Error registering company:', error);
      toast({
        title: 'Error',
        description: 'Failed to register company',
        variant: 'destructive'
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle delete company
  const handleDeleteCompany = async (companyIdToDelete: string) => {
    if (!confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', companyIdToDelete);

      if (error) throw error;

      setCompaniesList(prev => prev.filter(c => c.id !== companyIdToDelete));
      
      // If deleted company was selected, switch to another one
      if (selectedCompanyId === companyIdToDelete) {
        const remaining = companiesList.filter(c => c.id !== companyIdToDelete);
        setSelectedCompanyId(remaining.length > 0 ? remaining[0].id : null);
      }

      toast({
        title: t.common.success,
        description: 'Company deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting company:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete company',
        variant: 'destructive'
      });
    }
  };

  // Handle edit company save
  const handleEditCompanySave = async () => {
    if (!selectedCompanyId) return;
    
    setIsEditing(true);
    try {
      const { error } = await supabase
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
        .eq('id', selectedCompanyId);

      if (error) throw error;

      // Update the list with new trade name
      setCompaniesList(prev => prev.map(c => 
        c.id === selectedCompanyId ? { ...c, trade_name: profile.trade_name } : c
      ));

      setEditCompanyModalOpen(false);
      toast({
        title: t.common.success,
        description: 'Company updated successfully'
      });
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to update company',
        variant: 'destructive'
      });
    } finally {
      setIsEditing(false);
    }
  };

  // Fetch all company data
  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) {
        setIsFetching(false);
        return;
      }

      try {
        // Fetch company profile
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', companyId)
          .single();

        if (companyError) throw companyError;

        if (companyData) {
          const profileData: CompanyProfile = {
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
        }

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
          setInitialBranding(branding);
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
          setInitialEstimateConfig(estimateConfig);
        }

        // Fetch extra fees
        const { data: feesData } = await supabase
          .from('extra_fees')
          .select('*')
          .eq('company_id', companyId)
          .order('display_order');

        if (feesData) {
          setExtraFees(feesData);
        }

        // Fetch checklist items
        const { data: checklistData } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('company_id', companyId)
          .order('display_order');

        if (checklistData) {
          setChecklistItems(checklistData);
        }

      } catch (error) {
        console.error('Error fetching company data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load company data',
          variant: 'destructive'
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchCompanyData();
  }, [companyId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) {
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

      const fileName = `${companyId}/logo.${fileExt}`;
      
      // Try to remove existing file first (ignore errors)
      await supabase.storage
        .from('company-assets')
        .remove([fileName]);
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600',
          contentType: file.type
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(uploadError.message || 'Upload failed');
      }

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      // Update branding with new logo URL
      setBranding(prev => ({ ...prev, logo_url: publicUrl }));
      
      // Also save to database immediately
      const { error: brandingError } = await supabase
        .from('company_branding')
        .upsert({
          id: branding.id,
          company_id: companyId,
          logo_url: publicUrl,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color
        }, { onConflict: 'company_id' });

      if (brandingError) {
        console.error('Branding update error:', brandingError);
      }

      toast({
        title: t.common.success,
        description: 'Logo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload logo. Please check storage permissions.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    if (!companyId || !hasChanges) return;
    
    setIsLoading(true);
    try {
      // Update company profile
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
        .eq('id', companyId);

      if (profileError) throw profileError;

      // Upsert branding
      const { error: brandingError } = await supabase
        .from('company_branding')
        .upsert({
          id: branding.id,
          company_id: companyId,
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          accent_color: branding.accent_color
        }, { onConflict: 'company_id' });

      if (brandingError) throw brandingError;

      // Upsert estimate config
      const { error: estimateError } = await supabase
        .from('company_estimate_config')
        .upsert({
          id: estimateConfig.id,
          company_id: companyId,
          default_hourly_rate: estimateConfig.default_hourly_rate,
          tax_rate: estimateConfig.tax_rate,
          invoice_generation_mode: estimateConfig.invoice_generation_mode
        }, { onConflict: 'company_id' });

      if (estimateError) throw estimateError;

      // Update initial states to match current
      setInitialProfile({ ...profile });
      setInitialBranding({ ...branding });
      setInitialEstimateConfig({ ...estimateConfig });
      setHasChanges(false);

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

  // Fee handlers
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
    if (!feeForm.name.trim() || !companyId) {
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
            company_id: companyId,
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
    try {
      const { error } = await supabase
        .from('extra_fees')
        .delete()
        .eq('id', id)
        .eq('company_id', user?.profile?.company_id);

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

  // Checklist handlers
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
    if (!checklistForm.name.trim() || !companyId) {
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
            company_id: companyId,
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
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id)
        .eq('company_id', user?.profile?.company_id);

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
      await supabase
        .from('checklist_items')
        .update({ display_order: newIndex })
        .eq('id', currentItem.id);
        
      await supabase
        .from('checklist_items')
        .update({ display_order: index })
        .eq('id', swapItem.id);

      [items[index], items[newIndex]] = [items[newIndex], items[index]];
      const reordered = items.map((item, i) => ({ ...item, display_order: i }));
      setChecklistItems(reordered);
    } catch (error) {
      console.error('Error reordering items:', error);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
            <Select value={selectedCompanyId || ''} onValueChange={handleCompanyChange}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {companiesList.map(company => (
                  <SelectItem key={company.id} value={company.id}>{company.trade_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              onClick={() => setRegisterModalOpen(true)}
              className="gap-1 h-8"
            >
              <Plus className="h-4 w-4" />
              Register Company
            </Button>
          </div>
        </div>

        {/* Profile Tab - Companies List */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardContent className="pt-4">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Company Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Legal Name</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">City</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Email</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Phone</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {companiesList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                          No companies registered yet
                        </td>
                      </tr>
                    ) : (
                      companiesList.map((company) => {
                        const companyDetails = company.id === selectedCompanyId ? profile : null;
                        return (
                          <tr key={company.id} className={`hover:bg-muted/30 ${company.id === selectedCompanyId ? 'bg-primary/5' : ''}`}>
                            <td className="px-4 py-3 text-sm font-medium">{company.trade_name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{companyDetails?.legal_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{companyDetails?.city || '-'}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{companyDetails?.email || '-'}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{companyDetails?.phone || '-'}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => {
                                    setSelectedCompanyId(company.id);
                                    setEditCompanyModalOpen(true);
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteCompany(company.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4 mt-4">
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
        </TabsContent>

        {/* Estimate Configuration Tab */}
        <TabsContent value="estimates" className="space-y-4 mt-4">
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
        </TabsContent>

        {/* Schedule Configuration Tab */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          {/* Invoice Generation Mode */}
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
                    Invoice is automatically created when a job is marked as completed. Best for streamlined operations.
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
                    Completed jobs appear in "Completed Services" for admin review before invoice generation.
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
        </TabsContent>

        {/* Preferences Tab */}
        <PreferencesTab companyId={companyId} />
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

      {/* Register Company Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Register New Company
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="new-trade-name">Company Name *</Label>
                <Input
                  id="new-trade-name"
                  value={newCompanyForm.trade_name}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, trade_name: e.target.value }))}
                  placeholder="Trade name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-legal-name">Legal Name *</Label>
                <Input
                  id="new-legal-name"
                  value={newCompanyForm.legal_name}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, legal_name: e.target.value }))}
                  placeholder="Legal business name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-address">Address</Label>
                <Input
                  id="new-address"
                  value={newCompanyForm.address}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="new-city">City</Label>
                <Input
                  id="new-city"
                  value={newCompanyForm.city}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-province">Province</Label>
                <Select 
                  value={newCompanyForm.province} 
                  onValueChange={(value) => setNewCompanyForm(prev => ({ ...prev, province: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {canadianProvinces.map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-postal-code">Postal Code</Label>
                <Input
                  id="new-postal-code"
                  value={newCompanyForm.postal_code}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, postal_code: e.target.value }))}
                  placeholder="A1A 1A1"
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newCompanyForm.email}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone</Label>
                <Input
                  id="new-phone"
                  value={newCompanyForm.phone}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(416) 555-0100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-website">Website</Label>
                <Input
                  id="new-website"
                  value={newCompanyForm.website}
                  onChange={(e) => setNewCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-timezone">Timezone</Label>
                <Select 
                  value={newCompanyForm.timezone} 
                  onValueChange={(value) => setNewCompanyForm(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CANADIAN_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRegisterCompany} disabled={isRegistering}>
              {isRegistering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isRegistering ? 'Registering...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal */}
      <Dialog open={editCompanyModalOpen} onOpenChange={setEditCompanyModalOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Company
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-trade-name">Company Name *</Label>
                <Input
                  id="edit-trade-name"
                  value={profile.trade_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, trade_name: e.target.value }))}
                  placeholder="Trade name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-legal-name">Legal Name *</Label>
                <Input
                  id="edit-legal-name"
                  value={profile.legal_name}
                  onChange={(e) => setProfile(prev => ({ ...prev, legal_name: e.target.value }))}
                  placeholder="Legal business name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={profile.address}
                  onChange={(e) => setProfile(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={profile.city}
                  onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-province">Province</Label>
                <Select 
                  value={profile.province} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, province: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {canadianProvinces.map(province => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-postal-code">Postal Code</Label>
                <Input
                  id="edit-postal-code"
                  value={profile.postal_code}
                  onChange={(e) => setProfile(prev => ({ ...prev, postal_code: e.target.value }))}
                  placeholder="A1A 1A1"
                />
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={profile.phone}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(416) 555-0100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={profile.website}
                  onChange={(e) => setProfile(prev => ({ ...prev, website: e.target.value }))}
                  placeholder="https://www.company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-timezone">Timezone</Label>
                <Select 
                  value={profile.timezone} 
                  onValueChange={(value) => setProfile(prev => ({ ...prev, timezone: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {CANADIAN_TIMEZONES.map(tz => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCompanyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCompanySave} disabled={isEditing}>
              {isEditing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Company;
