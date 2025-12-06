import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyStore, ExtraFee, ChecklistItem } from '@/stores/companyStore';
import PageHeader from '@/components/ui/page-header';
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
  Eye
} from 'lucide-react';

const canadianProvinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Northwest Territories', 'Nunavut', 'Yukon'
];

const Company = () => {
  const { t } = useLanguage();
  const { 
    profile, 
    branding, 
    estimateConfig, 
    scheduleConfig,
    updateProfile, 
    updateBranding, 
    updateEstimateConfig,
    addExtraFee,
    updateExtraFee,
    deleteExtraFee,
    addChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems
  } = useCompanyStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Fee modal state
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ExtraFee | null>(null);
  const [feeForm, setFeeForm] = useState({ name: '', amount: 0 });
  
  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<ChecklistItem | null>(null);
  const [checklistForm, setChecklistForm] = useState({ name: '' });
  
  // Login preview state
  const [previewLoginOpen, setPreviewLoginOpen] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateBranding({ logoUrl: reader.result as string });
        toast({
          title: t.common.success,
          description: 'Logo uploaded successfully',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({
      title: t.common.success,
      description: t.company.saved,
    });
    setIsLoading(false);
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

  const handleSaveFee = () => {
    if (!feeForm.name.trim()) {
      toast({ title: 'Error', description: 'Fee name is required', variant: 'destructive' });
      return;
    }
    
    // Check for duplicates
    const exists = estimateConfig.extraFees.some(
      f => f.name.toLowerCase() === feeForm.name.toLowerCase() && f.id !== editingFee?.id
    );
    if (exists) {
      toast({ title: 'Error', description: 'A fee with this name already exists', variant: 'destructive' });
      return;
    }

    if (editingFee) {
      updateExtraFee(editingFee.id, feeForm);
      toast({ title: t.common.success, description: 'Fee updated successfully' });
    } else {
      addExtraFee({ ...feeForm, isActive: true });
      toast({ title: t.common.success, description: 'Fee created successfully' });
    }
    setFeeModalOpen(false);
  };

  const handleDeleteFee = (id: string) => {
    deleteExtraFee(id);
    toast({ title: t.common.success, description: 'Fee deleted successfully' });
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

  const handleSaveChecklist = () => {
    if (!checklistForm.name.trim()) {
      toast({ title: 'Error', description: 'Item name is required', variant: 'destructive' });
      return;
    }

    if (editingChecklist) {
      updateChecklistItem(editingChecklist.id, checklistForm);
      toast({ title: t.common.success, description: 'Item updated successfully' });
    } else {
      addChecklistItem({ ...checklistForm, isActive: true });
      toast({ title: t.common.success, description: 'Item created successfully' });
    }
    setChecklistModalOpen(false);
  };

  const handleDeleteChecklist = (id: string) => {
    deleteChecklistItem(id);
    toast({ title: t.common.success, description: 'Item deleted successfully' });
  };

  const moveChecklistItem = (index: number, direction: 'up' | 'down') => {
    const items = [...scheduleConfig.checklistItems].sort((a, b) => a.order - b.order);
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    
    [items[index], items[newIndex]] = [items[newIndex], items[index]];
    const reordered = items.map((item, i) => ({ ...item, order: i + 1 }));
    reorderChecklistItems(reordered);
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-4">
      <PageHeader 
        title={t.company.title}
        description="Manage your company information, branding, and configuration"
      />

      <Tabs defaultValue="profile" className="space-y-4">
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
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {t.company.businessInfo}
              </CardTitle>
              <CardDescription className="text-xs">
                Your company's legal and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="companyName" className="text-xs">{t.company.companyName}</Label>
                  <Input 
                    id="companyName" 
                    value={profile.companyName}
                    onChange={(e) => updateProfile({ companyName: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="legalName" className="text-xs">{t.company.legalName}</Label>
                  <Input 
                    id="legalName" 
                    value={profile.legalName}
                    onChange={(e) => updateProfile({ legalName: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                  <Label htmlFor="address" className="text-xs">{t.company.address}</Label>
                  <Input 
                    id="address" 
                    value={profile.address}
                    onChange={(e) => updateProfile({ address: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="city" className="text-xs">{t.company.city}</Label>
                  <Input 
                    id="city" 
                    value={profile.city}
                    onChange={(e) => updateProfile({ city: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="province" className="text-xs">{t.company.province}</Label>
                  <Select 
                    value={profile.province} 
                    onValueChange={(value) => updateProfile({ province: value })}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {canadianProvinces.map(province => (
                        <SelectItem key={province} value={province}>{province}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="postalCode" className="text-xs">{t.company.postalCode}</Label>
                  <Input 
                    id="postalCode" 
                    value={profile.postalCode}
                    onChange={(e) => updateProfile({ postalCode: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <Separator className="my-2" />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs">{t.auth.email}</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfile({ email: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs">{t.company.phone}</Label>
                  <Input 
                    id="phone" 
                    value={profile.phone}
                    onChange={(e) => updateProfile({ phone: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="website" className="text-xs">{t.company.website}</Label>
                  <Input 
                    id="website" 
                    value={profile.website}
                    onChange={(e) => updateProfile({ website: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <Separator className="my-2" />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="bn" className="text-xs">{t.company.businessNumber}</Label>
                  <Input 
                    id="bn" 
                    value={profile.businessNumber}
                    onChange={(e) => updateProfile({ businessNumber: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="gst" className="text-xs">{t.company.gstHst}</Label>
                  <Input 
                    id="gst" 
                    value={profile.gstHstNumber}
                    onChange={(e) => updateProfile({ gstHstNumber: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
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
                  {branding.logoUrl ? (
                    <img 
                      src={branding.logoUrl} 
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
                    {branding.logoUrl && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive h-8"
                        onClick={() => updateBranding({ logoUrl: null })}
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
              
              {/* Login Preview */}
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">Login Screen Preview</h4>
                  <p className="text-xs text-muted-foreground">See how your logo appears on the login page</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setPreviewLoginOpen(true)} className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estimate Configuration Tab */}
        <TabsContent value="estimates" className="space-y-4 mt-4">
          {/* Pricing & Taxes */}
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
                      value={estimateConfig.defaultHourlyRate}
                      onChange={(e) => updateEstimateConfig({ defaultHourlyRate: parseFloat(e.target.value) || 0 })}
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
                      value={estimateConfig.taxRate}
                      onChange={(e) => updateEstimateConfig({ taxRate: parseFloat(e.target.value) || 0 })}
                      className="pr-6 h-8 text-sm" 
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="overtimeRate" className="text-xs">{t.company.overtimeRate}</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <Input 
                      id="overtimeRate" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.overtimeRate}
                      onChange={(e) => updateEstimateConfig({ overtimeRate: parseFloat(e.target.value) || 0 })}
                      className="pl-6 h-8 text-sm" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="holidayRate" className="text-xs">{t.company.holidayRate}</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                    <Input 
                      id="holidayRate" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.holidayRate}
                      onChange={(e) => updateEstimateConfig({ holidayRate: parseFloat(e.target.value) || 0 })}
                      className="pl-6 h-8 text-sm" 
                    />
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
                {estimateConfig.extraFees.map((fee) => (
                  <div 
                    key={fee.id} 
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={fee.isActive}
                        onCheckedChange={(checked) => updateExtraFee(fee.id, { isActive: checked })}
                      />
                      <span className={`text-sm ${!fee.isActive && 'text-muted-foreground'}`}>{fee.name}</span>
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
                {estimateConfig.extraFees.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No extra fees configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Configuration Tab */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
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
                {scheduleConfig.checklistItems
                  .sort((a, b) => a.order - b.order)
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
                            disabled={index === scheduleConfig.checklistItems.length - 1}
                          >
                            <GripVertical className="h-3 w-3 -rotate-90" />
                          </Button>
                        </div>
                        <Switch
                          checked={item.isActive}
                          onCheckedChange={(checked) => updateChecklistItem(item.id, { isActive: checked })}
                        />
                        <span className={`text-sm ${!item.isActive && 'text-muted-foreground'}`}>{item.name}</span>
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
                {scheduleConfig.checklistItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No checklist items configured</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={isLoading} className="gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? t.common.loading : t.common.save}
        </Button>
      </div>

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

      {/* Login Preview Modal */}
      <Dialog open={previewLoginOpen} onOpenChange={setPreviewLoginOpen}>
        <DialogContent className="sm:max-w-4xl h-[80vh] p-0 overflow-hidden">
          <div className="flex h-full">
            {/* Left side preview - matches actual login */}
            <div className="flex-1 bg-gradient-to-br from-primary/15 via-primary/5 to-background flex flex-col items-center justify-center p-8 relative">
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06]" 
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              />
              {branding.logoUrl ? (
                <div className="relative flex flex-col items-center">
                  <img 
                    src={branding.logoUrl} 
                    alt={profile.companyName}
                    className="w-48 h-48 object-contain opacity-25 dark:opacity-20"
                  />
                  <h3 className="mt-4 text-xl font-semibold text-foreground/70">{profile.companyName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Welcome to your workspace</p>
                </div>
              ) : (
                <div className="text-center relative">
                  <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center mx-auto">
                    <Building2 className="h-12 w-12 text-primary/50" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground/70">{profile.companyName}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Welcome to your workspace</p>
                </div>
              )}
            </div>
            {/* Right side form preview */}
            <div className="flex-1 flex items-center justify-center p-8 bg-background">
              <div className="w-full max-w-xs space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold">{profile.companyName}</h2>
                  <p className="text-sm text-muted-foreground">Welcome back! Sign in to your account</p>
                </div>
                <div className="space-y-3">
                  <div className="h-9 bg-muted rounded-md" />
                  <div className="h-9 bg-muted rounded-md" />
                  <div className="h-9 bg-primary rounded-md" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Company;