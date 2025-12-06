import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/stores/companyStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sun, Moon, Sparkles, Eye, EyeOff, Building2 } from 'lucide-react';

const Login = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { login } = useAuth();
  const { branding, profile } = useCompanyStore();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    const result = await login(email, password, rememberMe);
    
    if (result.success) {
      toast({
        title: t.common.success,
        description: t.auth.loginSuccess,
      });
      navigate('/');
    } else {
      setError(result.error || t.auth.invalidCredentials);
    }
    
    setIsLoading(false);
  };

  // Dynamic primary color from branding
  const primaryColor = branding.primaryColor || '#1a3d2e';

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Left Side - Premium Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Soft gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/8 to-primary/3 dark:from-primary/15 dark:via-primary/5 dark:to-background" />
        
        {/* Secondary gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-primary/10 dark:via-primary/3 dark:to-primary/8" />
        
        {/* Decorative plus pattern - very subtle */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M21 19v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        {/* Radial glow effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent dark:from-primary/15" />
        
        {/* Logo Watermark - Dynamic from Company */}
        <div className="absolute inset-0 flex items-center justify-center">
          {branding.logoUrl ? (
            <div className="relative w-[70%] max-w-[400px] aspect-square flex items-center justify-center">
              {/* Glow behind logo */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl scale-110" />
              <img 
                src={branding.logoUrl} 
                alt={profile.companyName}
                className="w-full h-full object-contain opacity-[0.10] dark:opacity-[0.08] select-none pointer-events-none"
                style={{ filter: 'grayscale(10%)' }}
              />
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              {/* Glow effect for placeholder */}
              <div className="absolute w-64 h-64 bg-gradient-to-br from-primary/15 to-primary/5 rounded-full blur-3xl" />
              <div className="relative w-40 h-40 rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center opacity-60 dark:opacity-50">
                <Building2 className="w-20 h-20 text-primary/40" strokeWidth={1} />
              </div>
            </div>
          )}
        </div>

        {/* Company Info - Centered below logo area */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="mt-[320px] text-center">
            <h1 className="text-3xl font-semibold text-foreground/80 tracking-tight">
              {profile.companyName}
            </h1>
            <p className="text-base text-muted-foreground/70 mt-2 font-light">
              Professional Workspace
            </p>
          </div>
        </div>

        {/* Bottom credits */}
        <div className="absolute bottom-6 left-8 right-8">
          <p className="text-xs text-muted-foreground/50 font-light">
            © {new Date().getFullYear()} {profile.companyName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form with Glassmorphism */}
      <div className="flex-1 flex flex-col lg:w-1/2 bg-gradient-to-br from-background via-background to-muted/20">
        {/* Theme & Language Controls */}
        <div className="flex items-center justify-end gap-2 p-4 sm:p-6">
          <Select value={language} onValueChange={(val: 'en' | 'fr') => setLanguage(val)}>
            <SelectTrigger className="w-20 h-9 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-colors">
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
            className="h-9 w-9 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-all hover:scale-105"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Login Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8 pb-12">
          {/* Glassmorphism Card */}
          <div className="w-full max-w-[380px] rounded-2xl bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border/50 shadow-2xl shadow-primary/5 dark:shadow-primary/10 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              {/* Mobile Logo */}
              <div className="lg:hidden mx-auto mb-5">
                {branding.logoUrl ? (
                  <div className="h-16 w-16 mx-auto rounded-xl overflow-hidden flex items-center justify-center bg-muted/30">
                    <img 
                      src={branding.logoUrl} 
                      alt="Company logo" 
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-14 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                    <Building2 className="h-7 w-7 text-primary/70" />
                  </div>
                )}
              </div>
              
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                {profile.companyName} <span className="text-primary">Workspace</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-2 font-light">
                {t.auth.welcomeBack || "Welcome back! Sign in to your account"}
              </p>
            </div>
            
            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
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
                  className="h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                  {t.auth.password}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-11 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && (
                  <p className="text-sm text-destructive mt-2 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember" 
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="border-border/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                    {t.auth.rememberMe}
                  </Label>
                </div>
                
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary/80 hover:text-primary transition-colors hover:underline underline-offset-2"
                >
                  {t.auth.forgotPassword}
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                disabled={isLoading}
                style={{ 
                  backgroundColor: primaryColor,
                }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t.common.loading}
                  </span>
                ) : t.auth.signIn}
              </Button>
            </form>

            {/* Divider with subtle accent */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card/80 px-3 text-xs text-muted-foreground/60">
                  Secure login
                </span>
              </div>
            </div>

            {/* Footer info */}
            <p className="text-center text-xs text-muted-foreground/50">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden px-6 pb-6">
          <p className="text-center text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} {profile.companyName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
