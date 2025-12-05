import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Palette, 
  Globe, 
  Link2, 
  Bell, 
  Building2,
  Moon,
  Sun,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <div className="container px-4 py-8 lg:px-8 space-y-8">
      <PageHeader 
        title={t.settings.title}
        description="Customize your application preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appearance */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              {t.settings.appearance}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>{t.settings.theme}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'light' 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <div className="h-10 w-10 rounded-lg bg-white border border-border flex items-center justify-center">
                    <Sun className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{t.settings.light}</p>
                    <p className="text-xs text-muted-foreground">Clean & bright</p>
                  </div>
                  {theme === 'light' && (
                    <Check className="h-5 w-5 text-primary ml-auto" />
                  )}
                </button>

                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    theme === 'dark' 
                      ? "border-primary bg-primary/5" 
                      : "border-border/50 hover:border-border"
                  )}
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Moon className="h-5 w-5 text-slate-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{t.settings.dark}</p>
                    <p className="text-xs text-muted-foreground">Easy on eyes</p>
                  </div>
                  {theme === 'dark' && (
                    <Check className="h-5 w-5 text-primary ml-auto" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              {t.settings.language}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  language === 'en' 
                    ? "border-primary bg-primary/5" 
                    : "border-border/50 hover:border-border"
                )}
              >
                <span className="text-2xl">🇬🇧</span>
                <div className="text-left">
                  <p className="font-medium">English</p>
                  <p className="text-xs text-muted-foreground">Default</p>
                </div>
                {language === 'en' && (
                  <Check className="h-5 w-5 text-primary ml-auto" />
                )}
              </button>

              <button
                onClick={() => setLanguage('fr')}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                  language === 'fr' 
                    ? "border-primary bg-primary/5" 
                    : "border-border/50 hover:border-border"
                )}
              >
                <span className="text-2xl">🇫🇷</span>
                <div className="text-left">
                  <p className="font-medium">Français</p>
                  <p className="text-xs text-muted-foreground">French</p>
                </div>
                {language === 'fr' && (
                  <Check className="h-5 w-5 text-primary ml-auto" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              {t.settings.notifications}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t.settings.emailNotifications}</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t.settings.pushNotifications}</Label>
                <p className="text-sm text-muted-foreground">Browser push notifications</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Job Reminders</Label>
                <p className="text-sm text-muted-foreground">Reminder 30 min before jobs</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">Invoice and payment updates</p>
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
              {t.settings.integrations}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#2CA01C] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">QB</span>
                </div>
                <div>
                  <p className="font-medium">{t.settings.quickbooks}</p>
                  <p className="text-sm text-muted-foreground">Accounting software</p>
                </div>
              </div>
              <Button variant="outline" size="sm">{t.settings.connect}</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#13B5EA] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">X</span>
                </div>
                <div>
                  <p className="font-medium">{t.settings.xero}</p>
                  <p className="text-sm text-muted-foreground">Accounting software</p>
                </div>
              </div>
              <Button variant="outline" size="sm">{t.settings.connect}</Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-success/10 border border-success/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-[#635BFF] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">S</span>
                </div>
                <div>
                  <p className="font-medium">{t.settings.stripe}</p>
                  <p className="text-sm text-success">{t.settings.connected}</p>
                </div>
              </div>
              <Check className="h-5 w-5 text-success" />
            </div>
          </CardContent>
        </Card>

        {/* Company Preferences */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              {t.settings.companyPreferences}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <Label>Auto-generate invoices</Label>
                  <p className="text-xs text-muted-foreground">After job completion</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <Label>Client photo requests</Label>
                  <p className="text-xs text-muted-foreground">Before/after photos</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <Label>GPS tracking</Label>
                  <p className="text-xs text-muted-foreground">Employee location</p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
                <div className="space-y-0.5">
                  <Label>Auto-assign jobs</Label>
                  <p className="text-xs text-muted-foreground">Based on availability</p>
                </div>
                <Switch />
              </div>
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

export default Settings;
