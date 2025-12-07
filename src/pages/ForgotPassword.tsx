import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sun, Moon, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import ArkeliumIcon from '@/components/ArkeliumIcon';

const emailSchema = z.string().email('Please enter a valid email address');

const ForgotPassword = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { resetPassword } = useAuth();
  
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
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 px-6 lg:px-12">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-primary/5 dark:from-primary/5 dark:via-transparent dark:to-primary/8" />
      
      {/* Decorative plus pattern - very subtle */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M31 29v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E")`
        }}
      />

      {/* Theme & Language Controls */}
      <div className="absolute top-4 right-6 lg:right-12 flex items-center gap-2 z-10">
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

      {/* Centered Card - IDENTICAL dimensions to Login (max-w-[360px], px-8 py-6) */}
      <div className="w-full max-w-[360px] mx-auto z-10">
        <div className="rounded-2xl bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border/40 shadow-2xl shadow-primary/5 dark:shadow-primary/10 px-8 py-6">
          {/* Arkelium Icon - Perfectly Centered, Circular, No Container Box */}
          <div className="flex justify-center mb-4">
            {isSubmitted ? (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                <CheckCircle className="h-7 w-7 text-primary" />
              </div>
            ) : (
              <ArkeliumIcon size="lg" />
            )}
          </div>

          {/* Platform Name Header - Small secondary text */}
          <div className="text-center mb-5">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {isSubmitted ? t.auth.checkEmail : t.auth.resetPassword}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {isSubmitted 
                ? t.auth.resetInstructions 
                : t.auth.enterEmailToReset
              }
            </p>
          </div>
          
          {/* Form */}
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-foreground/90">
                  {t.auth.email}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-9 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50 text-sm"
                />
                {error && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {error}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-9 text-xs font-semibold bg-[hsl(156,55%,40%)] hover:bg-[hsl(156,55%,35%)] dark:bg-[hsl(156,50%,45%)] dark:hover:bg-[hsl(156,50%,40%)] text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? t.common.loading : t.auth.sendResetLink}
              </Button>

              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.auth.backToLogin}
              </Link>
            </form>
          ) : (
            <div className="space-y-3">
              <p className="text-center text-xs text-muted-foreground">
                {t.auth.resetEmailSentTo} <span className="font-medium text-foreground">{email}</span>
              </p>
              
              <Button 
                variant="outline" 
                className="w-full h-9 text-xs" 
                onClick={() => setIsSubmitted(false)}
              >
                {t.auth.tryDifferentEmail}
              </Button>

              <Link 
                to="/login" 
                className="flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t.auth.backToLogin}
              </Link>
            </div>
          )}

          {/* Footer info */}
          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-center text-[10px] text-muted-foreground/50">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>

        {/* Copyright below card */}
        <p className="text-center text-[10px] text-muted-foreground/40 mt-3">
          © {new Date().getFullYear()} Arkelium. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
