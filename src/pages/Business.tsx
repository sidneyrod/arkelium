import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAccessibleCompanies } from '@/hooks/useAccessibleCompanies';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { 
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
  Zap,
  Sliders,
  Upload,
  Building2
} from 'lucide-react';
import PreferencesTab from '@/components/company/PreferencesTab';
import ActivitiesTab from '@/components/company/ActivitiesTab';

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

const Business = () => {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'activities');
  
  // Company filter state
  const { companies: accessibleCompanies, activeCompanies, getDefaultCompanyId } = useAccessibleCompanies();
  const accessibleCompanyIds = accessibleCompanies.map(c => c.id);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFetching, setIsFetching] = useState(true);
  
  const [branding, setBranding] = useState<CompanyBranding>({
    logo_url: null,
    primary_color: '#1a3d2e',
    secondary_color: '#2d5a45',
    accent_color: '#4ade80'
  });
  
  const [estimateConfig, setEstimateConfig] = useState<EstimateConfig>({
    default_hourly_rate: 35,
    tax_rate: 13,
    invoice_generation_mode: 'manual'
  });
  
  const [extraFees, setExtraFees] = useState<ExtraFee[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  // Business Group Name state
  const [businessGroupName, setBusinessGroupName] = useState<string>('Business Group');
  const [isSavingGroupName, setIsSavingGroupName] = useState(false);
  
  // Fee modal state
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ExtraFee | null>(null);
  const [feeForm, setFeeForm] = useState({ name: '', amount: 0 });
  
  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);
  const [checklistForm, setChecklistForm] = useState({ name: '' });

  // Initialize selected company
  useEffect(() => {
    if (!selectedCompanyId && accessibleCompanyIds.length > 0) {
      const defaultId = getDefaultCompanyId();
      setSelectedCompanyId(defaultId || accessibleCompanyIds[0]);
    }
  }, [accessibleCompanyIds, selectedCompanyId, getDefaultCompanyId]);

  // Fetch business group name
  useEffect(() => {
    const fetchGroupName = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'business_group_name')
        .maybeSingle();
      if (data?.value) setBusinessGroupName(data.value);
    };
    fetchGroupName();
  }, []);

  // Load company data when selectedCompanyId changes
  const loadCompanyData = useCallback(async (companyId: string) => {
    setIsFetching(true);
    try {
      // Fetch branding
      const { data: brandingData } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (brandingData) {
        setBranding({
          id: brandingData.id,
          logo_url: brandingData.logo_url,
          primary_color: brandingData.primary_color || '#1a3d2e',
          secondary_color: brandingData.secondary_color || '#2d5a45',
          accent_color: brandingData.accent_color || '#4ade80'
        });
      } else {
        setBranding({
          logo_url: null,
          primary_color: '#1a3d2e',
          secondary_color: '#2d5a45',
          accent_color: '#4ade80'
        });
      }

      // Fetch estimate config
      const { data: estimateData } = await supabase
        .from('company_estimate_config')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (estimateData) {
        setEstimateConfig({
          id: estimateData.id,
          default_hourly_rate: estimateData.default_hourly_rate || 35,
          tax_rate: estimateData.tax_rate || 13,
          invoice_generation_mode: (estimateData as any).invoice_generation_mode || 'manual'
        });
      } else {
        setEstimateConfig({
          default_hourly_rate: 35,
          tax_rate: 13,
          invoice_generation_mode: 'manual'
        });
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
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      loadCompanyData(selectedCompanyId);
    } else {
      setIsFetching(false);
    }
  }, [selectedCompanyId, loadCompanyData]);

  // Handle save business group name
  const handleSaveGroupName = async () => {
    setIsSavingGroupName(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ 
          key: 'business_group_name', 
          value: businessGroupName, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });
      
      if (error) throw error;
      
      toast({ 
        title: t.common.success, 
        description: 'Group name updated successfully' 
      });
    } catch (error) {
      console.error('Error saving group name:', error);
      toast({
        title: 'Error',
        description: 'Failed to save group name',
        variant: 'destructive'
      });
    } finally {
      setIsSavingGroupName(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompanyId) {
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

      const fileName = `${selectedCompanyId}/logo.${fileExt}`;
      
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
          company_id: selectedCompanyId,
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
    if (!feeForm.name.trim() || !selectedCompanyId) {
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
            company_id: selectedCompanyId,
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
    if (!selectedCompanyId) return;
    
    try {
      const { error } = await supabase
        .from('extra_fees')
        .delete()
        .eq('id', id)
        .eq('company_id', selectedCompanyId);

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
    if (!checklistForm.name.trim() || !selectedCompanyId) {
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
            company_id: selectedCompanyId,
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
    if (!selectedCompanyId) return;
    
    try {
      const { error } = await supabase
        .from('checklist_items')
        .delete()
        .eq('id', id)
        .eq('company_id', selectedCompanyId);

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
    <div className="p-2 lg:p-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-auto p-1 gap-2 bg-muted/50">
          <TabsTrigger value="activities" className="gap-2 px-4 py-2 data-[state=active]:bg-background">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Activities</span>
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

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-4 mt-4">
          <ActivitiesTab 
            companyId={selectedCompanyId} 
            isLoading={isFetching}
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
            <>
              {/* Business Group Name Card */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Business Group Name
                  </CardTitle>
                  <CardDescription className="text-xs">
                    This name appears in the top bar for all users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Input
                      value={businessGroupName}
                      onChange={(e) => setBusinessGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="max-w-sm"
                    />
                    <Button 
                      onClick={handleSaveGroupName} 
                      disabled={isSavingGroupName}
                      size="sm"
                    >
                      {isSavingGroupName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Company Logo Card */}
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
            </>
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
        <PreferencesTab companyId={selectedCompanyId} />
      </Tabs>

      {/* Fee Modal */}
      <Dialog open={feeModalOpen} onOpenChange={setFeeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFee ? 'Edit Fee' : 'Add Extra Fee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fee-name">Fee Name</Label>
              <Input
                id="fee-name"
                value={feeForm.name}
                onChange={(e) => setFeeForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Pet Fee, Green Cleaning..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fee-amount">Amount ($)</Label>
              <Input
                id="fee-amount"
                type="number"
                step="0.01"
                value={feeForm.amount}
                onChange={(e) => setFeeForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeeModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveFee}>{editingFee ? 'Save Changes' : 'Add Fee'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checklist Modal */}
      <Dialog open={checklistModalOpen} onOpenChange={setChecklistModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? 'Edit Item' : 'Add Checklist Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="checklist-name">Item Name</Label>
              <Input
                id="checklist-name"
                value={checklistForm.name}
                onChange={(e) => setChecklistForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Vacuum floors, Clean bathrooms..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChecklistModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChecklist}>{editingChecklist ? 'Save Changes' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Business;
