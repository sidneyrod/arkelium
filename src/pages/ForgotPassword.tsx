import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/stores/companyStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sun, Moon, ArrowLeft, Mail, CheckCircle, Building2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');

const ForgotPassword = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { resetPassword } = useAuth();
  const { branding, profile } = useCompanyStore();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate email
    try {
      emailSchema.parse(email);
    } catch (e: any) {
      setError(e.errors?.[0]?.message || 'Invalid email');
      return;
    }
    
    setIsLoading(true);
    
    const result = await resetPassword(email);
    
    if (result.success) {
      setIsSubmitted(true);
      toast({
        title: t.common.success,
        description: t.auth.resetEmailSent,
      });
    } else {
      setError(result.error || 'Failed to send reset email');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 dark:from-primary/5 dark:via-transparent dark:to-primary/8" />
      
      {/* Decorative plus pattern - very subtle */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M31 29v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Subtle watermark */}
      {branding.logoUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img 
            src={branding.logoUrl} 
            alt=""
            className="w-[50%] max-w-[600px] h-auto object-contain opacity-[0.02] dark:opacity-[0.015] select-none"
            style={{ filter: 'blur(2px)' }}
          />
        </div>
      )}

      {/* Theme & Language Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <Select value={language} onValueChange={(val: 'en' | 'fr') => setLanguage(val)}>
          <SelectTrigger className="w-16 h-8 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-colors text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover/95 backdrop-blur-sm">
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="fr">FR</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleTheme} 
          className="h-8 w-8 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all hover:scale-105"
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Centered Card - Same size as Login */}
      <div className="w-full max-w-[420px] mx-8 z-10">
        <div className="rounded-2xl bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border/40 shadow-2xl shadow-primary/5 dark:shadow-primary/10 p-8">
          {/* Avatar / Logo at top - Circular */}
          <div className="flex justify-center mb-5">
            {branding.logoUrl ? (
              <div className="h-20 w-20 rounded-full overflow-hidden flex items-center justify-center bg-muted/30 border-2 border-border/30 shadow-lg">
                <img 
                  src={branding.logoUrl} 
                  alt={profile.companyName} 
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center shadow-lg">
                {isSubmitted ? (
                  <CheckCircle className="h-9 w-9 text-primary" />
                ) : (
                  <Mail className="h-9 w-9 text-primary/70" />
                )}
              </div>
            )}
          </div>

          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {isSubmitted ? t.auth.checkEmail : t.auth.resetPassword}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSubmitted 
                ? t.auth.resetInstructions 
                : t.auth.enterEmailToReset
              }
            </p>
          </div>
          
          {/* Form */}
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                  {t.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
                {error && (
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {error}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 text-sm font-semibold bg-[hsl(156,55%,40%)] hover:bg-[hsl(156,55%,35%)] dark:bg-[hsl(156,50%,45%)] dark:hover:bg-[hsl(156,50%,40%)] text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? t.common.loading : t.auth.sendResetLink}
              </Button>

              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.auth.backToLogin}
              </Link>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {t.auth.resetEmailSentTo} <span className="font-medium text-foreground">{email}</span>
              </p>
              
              <Button 
                variant="outline" 
                className="w-full h-10" 
                onClick={() => setIsSubmitted(false)}
              >
                {t.auth.tryDifferentEmail}
              </Button>

              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t.auth.backToLogin}
              </Link>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-5 pt-4 border-t border-border/20">
            <p className="text-center text-xs text-muted-foreground/50">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>

        {/* Copyright below card */}
        <p className="text-center text-xs text-muted-foreground/40 mt-4">
          © {new Date().getFullYear()} {profile.companyName}
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
