import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Building2, Upload, DollarSign, Bell, Link2 } from 'lucide-react';

const Company = () => {
  const { t } = useLanguage();

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader 
        title={t.company.title}
        description="Manage your company information and preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Business Information */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {t.company.businessInfo}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">{t.company.companyName}</Label>
              <Input id="companyName" defaultValue="CleanPro Services Inc." />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bn">{t.company.businessNumber}</Label>
                <Input id="bn" defaultValue="123456789" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">{t.company.gstHst}</Label>
                <Input id="gst" defaultValue="RT0001" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">{t.company.address}</Label>
              <Input id="address" defaultValue="123 Business Street, Toronto, ON M5V 1A1" />
            </div>
            <div className="space-y-2">
              <Label>{t.company.logo}</Label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">C</span>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Logo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Taxes */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              {t.company.pricing}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="baseRate">{t.company.baseRate}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="baseRate" defaultValue="45.00" className="pl-8" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">{t.company.taxRate}</Label>
                <div className="relative">
                  <Input id="taxRate" defaultValue="13" className="pr-8" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Additional Rates</h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="overtime">Overtime Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="overtime" defaultValue="67.50" className="pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="holiday">Holiday Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input id="holiday" defaultValue="90.00" className="pl-8" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              {t.company.notifications}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminded before scheduled jobs</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify on payment received or overdue</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />
              {t.company.integrations}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#2CA01C] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">QB</span>
                </div>
                <div>
                  <p className="font-medium">QuickBooks</p>
                  <p className="text-sm text-muted-foreground">Accounting</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#13B5EA] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">X</span>
                </div>
                <div>
                  <p className="font-medium">Xero</p>
                  <p className="text-sm text-muted-foreground">Accounting</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#635BFF] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
                <div>
                  <p className="font-medium">Stripe</p>
                  <p className="text-sm text-muted-foreground">Payments</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Connect</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg">{t.common.save}</Button>
      </div>
    </div>
  );
};

export default Company;
