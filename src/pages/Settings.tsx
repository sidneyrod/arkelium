import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import PageHeader from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { 
  Palette, 
  Globe, 
  Moon,
  Sun,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-2 lg:p-3 space-y-4">
      <PageHeader 
        title={t.settings.title}
        description="Customize your application preferences"
      />

      {/* Appearance + Language - SAME ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Appearance Card - Compact */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Palette className="h-4 w-4 text-primary" />
              {t.settings.appearance}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {/* Light Button */}
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  "relative flex items-center gap-2.5 p-3 rounded-lg border transition-all",
                  theme === 'light' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border/50 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="h-8 w-8 rounded-md bg-white border border-border/50 flex items-center justify-center shrink-0">
                  <Sun className="h-4 w-4 text-amber-500" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{t.settings.light}</p>
                  <p className="text-[10px] text-muted-foreground">Clean & bright</p>
                </div>
                {theme === 'light' && (
                  <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                )}
              </button>

              {/* Dark Button */}
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  "relative flex items-center gap-2.5 p-3 rounded-lg border transition-all",
                  theme === 'dark' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border/50 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="h-8 w-8 rounded-md bg-slate-800 flex items-center justify-center shrink-0">
                  <Moon className="h-4 w-4 text-slate-300" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">{t.settings.dark}</p>
                  <p className="text-[10px] text-muted-foreground">Easy on eyes</p>
                </div>
                {theme === 'dark' && (
                  <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Language Card - Compact */}
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Globe className="h-4 w-4 text-primary" />
              {t.settings.language}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {/* English Button */}
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  "relative flex items-center gap-2.5 p-3 rounded-lg border transition-all",
                  language === 'en' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border/50 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0 text-sm font-semibold">
                  GB
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">English</p>
                  <p className="text-[10px] text-muted-foreground">Default</p>
                </div>
                {language === 'en' && (
                  <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                )}
              </button>

              {/* French Button */}
              <button
                onClick={() => setLanguage('fr')}
                className={cn(
                  "relative flex items-center gap-2.5 p-3 rounded-lg border transition-all",
                  language === 'fr' 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-border/50 hover:border-border hover:bg-muted/50"
                )}
              >
                <div className="h-8 w-8 rounded-md bg-muted/50 flex items-center justify-center shrink-0 text-sm font-semibold">
                  FR
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-medium truncate">Français</p>
                  <p className="text-[10px] text-muted-foreground">French</p>
                </div>
                {language === 'fr' && (
                  <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Settings - Full Width */}
      <NotificationSettings />
    </div>
  );
};

export default Settings;
