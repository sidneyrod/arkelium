import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompanyStore } from '@/stores/companyStore';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { 
  Building2, 
  Upload, 
  DollarSign, 
  Palette, 
  Settings2, 
  ImageIcon,
  Save
} from 'lucide-react';

const canadianProvinces = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 
  'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 
  'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Northwest Territories', 'Nunavut', 'Yukon'
];

const Company = () => {
  const { t } = useLanguage();
  const { profile, branding, estimateConfig, updateProfile, updateBranding, updateEstimateConfig } = useCompanyStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader 
        title={t.company.title}
        description="Manage your company information, branding, and estimate configuration"
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="h-4 w-4" />
            {t.company.profile}
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            {t.company.branding}
          </TabsTrigger>
          <TabsTrigger value="estimates" className="gap-2">
            <Settings2 className="h-4 w-4" />
            {t.company.estimateConfig}
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {t.company.businessInfo}
              </CardTitle>
              <CardDescription>
                Your company's legal and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t.company.companyName}</Label>
                  <Input 
                    id="companyName" 
                    value={profile.companyName}
                    onChange={(e) => updateProfile({ companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legalName">{t.company.legalName}</Label>
                  <Input 
                    id="legalName" 
                    value={profile.legalName}
                    onChange={(e) => updateProfile({ legalName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t.company.address}</Label>
                <Input 
                  id="address" 
                  value={profile.address}
                  onChange={(e) => updateProfile({ address: e.target.value })}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">{t.company.city}</Label>
                  <Input 
                    id="city" 
                    value={profile.city}
                    onChange={(e) => updateProfile({ city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">{t.company.province}</Label>
                  <Select 
                    value={profile.province} 
                    onValueChange={(value) => updateProfile({ province: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      {canadianProvinces.map(province => (
                        <SelectItem key={province} value={province}>{province}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">{t.company.postalCode}</Label>
                  <Input 
                    id="postalCode" 
                    value={profile.postalCode}
                    onChange={(e) => updateProfile({ postalCode: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">{t.auth.email}</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={profile.email}
                    onChange={(e) => updateProfile({ email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t.company.phone}</Label>
                  <Input 
                    id="phone" 
                    value={profile.phone}
                    onChange={(e) => updateProfile({ phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">{t.company.website}</Label>
                <Input 
                  id="website" 
                  value={profile.website}
                  onChange={(e) => updateProfile({ website: e.target.value })}
                />
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bn">{t.company.businessNumber}</Label>
                  <Input 
                    id="bn" 
                    value={profile.businessNumber}
                    onChange={(e) => updateProfile({ businessNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst">{t.company.gstHst}</Label>
                  <Input 
                    id="gst" 
                    value={profile.gstHstNumber}
                    onChange={(e) => updateProfile({ gstHstNumber: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                {t.company.logo}
              </CardTitle>
              <CardDescription>
                {t.company.logoDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-6">
                <div className="h-32 w-32 rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border">
                  {branding.logoUrl ? (
                    <img 
                      src={branding.logoUrl} 
                      alt="Company logo" 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <span className="text-xs text-muted-foreground">No logo</span>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {t.company.uploadLogo}
                  </Button>
                  {branding.logoUrl && (
                    <Button 
                      variant="ghost" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => updateBranding({ logoUrl: null })}
                    >
                      Remove Logo
                    </Button>
                  )}
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Recommended: PNG or SVG format, at least 200x200 pixels
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estimate Configuration Tab */}
        <TabsContent value="estimates" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                {t.company.pricing}
              </CardTitle>
              <CardDescription>
                Configure default pricing for estimates and contracts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="defaultRate">{t.company.defaultHourlyRate}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="defaultRate" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.defaultHourlyRate}
                      onChange={(e) => updateEstimateConfig({ defaultHourlyRate: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxRate">{t.company.taxRate}</Label>
                  <div className="relative">
                    <Input 
                      id="taxRate" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.taxRate}
                      onChange={(e) => updateEstimateConfig({ taxRate: parseFloat(e.target.value) || 0 })}
                      className="pr-8" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <Separator />

              <h4 className="text-sm font-medium">Extra Service Fees</h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="petsFee">{t.company.petsFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="petsFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.petsFee}
                      onChange={(e) => updateEstimateConfig({ petsFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childrenFee">{t.company.childrenFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="childrenFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.childrenFee}
                      onChange={(e) => updateEstimateConfig({ childrenFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="greenCleaningFee">{t.company.greenCleaningFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="greenCleaningFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.greenCleaningFee}
                      onChange={(e) => updateEstimateConfig({ greenCleaningFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cleanFridgeFee">{t.company.cleanFridgeFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="cleanFridgeFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.cleanFridgeFee}
                      onChange={(e) => updateEstimateConfig({ cleanFridgeFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cleanOvenFee">{t.company.cleanOvenFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="cleanOvenFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.cleanOvenFee}
                      onChange={(e) => updateEstimateConfig({ cleanOvenFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cleanCabinetsFee">{t.company.cleanCabinetsFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="cleanCabinetsFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.cleanCabinetsFee}
                      onChange={(e) => updateEstimateConfig({ cleanCabinetsFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cleanWindowsFee">{t.company.cleanWindowsFee}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="cleanWindowsFee" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.cleanWindowsFee}
                      onChange={(e) => updateEstimateConfig({ cleanWindowsFee: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <h4 className="text-sm font-medium">Special Rates</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="overtimeRate">{t.company.overtimeRate}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="overtimeRate" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.overtimeRate}
                      onChange={(e) => updateEstimateConfig({ overtimeRate: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holidayRate">{t.company.holidayRate}</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input 
                      id="holidayRate" 
                      type="number"
                      step="0.01"
                      value={estimateConfig.holidayRate}
                      onChange={(e) => updateEstimateConfig({ holidayRate: parseFloat(e.target.value) || 0 })}
                      className="pl-8" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSave} disabled={isLoading} className="gap-2">
          <Save className="h-4 w-4" />
          {isLoading ? t.common.loading : t.common.save}
        </Button>
      </div>
    </div>
  );
};

export default Company;
