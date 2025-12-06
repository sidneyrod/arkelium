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
import { Sun, Moon, Eye, EyeOff, Building2 } from 'lucide-react';

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
    <div className="h-screen bg-background flex w-full overflow-hidden">
      {/* Left Side - Premium Branding Panel with Watermark */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Soft gradient background - cleaner, no solid blocks */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent dark:from-primary/10 dark:via-primary/3 dark:to-background" />
        
        {/* Secondary radial gradient for depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent dark:from-primary/8" />
        
        {/* Decorative plus pattern - very subtle */}
        <div 
          className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M21 19v-2h-2v2h-2v2h2v2h2v-2h2v-2h-2z'/%3E%3C/g%3E%3C/svg%3E")`
          }}
        />
        
        {/* Logo Watermark - Dynamic from Company, clean subtle appearance */}
        <div className="absolute inset-0 flex items-center justify-center">
          {branding.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt={profile.companyName}
              className="w-[55%] max-w-[320px] h-auto object-contain opacity-[0.08] dark:opacity-[0.06] select-none pointer-events-none"
              style={{ filter: 'grayscale(20%)' }}
            />
          ) : (
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center opacity-50 dark:opacity-40">
              <Building2 className="w-16 h-16 text-primary/30" strokeWidth={1} />
            </div>
          )}
        </div>

        {/* Company Info - Centered below logo area */}
        <div className="absolute inset-x-0 bottom-1/4 flex flex-col items-center pointer-events-none px-8">
          <h1 className="text-2xl font-semibold text-foreground/70 tracking-tight text-center">
            {profile.companyName}
          </h1>
          <p className="text-sm text-muted-foreground/60 mt-1.5 font-light">
            Professional Workspace
          </p>
        </div>

        {/* Bottom credits */}
        <div className="absolute bottom-4 left-6 right-6">
          <p className="text-xs text-muted-foreground/40 font-light">
            © {new Date().getFullYear()} {profile.companyName}
          </p>
        </div>
      </div>

      {/* Right Side - Login Form with Glassmorphism */}
      <div className="flex-1 flex flex-col lg:w-1/2 bg-gradient-to-br from-background via-background to-muted/10">
        {/* Theme & Language Controls */}
        <div className="flex items-center justify-end gap-2 p-4">
          <Select value={language} onValueChange={(val: 'en' | 'fr') => setLanguage(val)}>
            <SelectTrigger className="w-18 h-8 bg-background/60 backdrop-blur-sm border-border/50 hover:bg-background/80 transition-colors text-xs">
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

        {/* Login Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-8">
          {/* Glassmorphism Card */}
          <div className="w-full max-w-[360px] rounded-2xl bg-card/80 dark:bg-card/60 backdrop-blur-xl border border-border/50 shadow-xl shadow-primary/5 dark:shadow-primary/10 p-7 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              {/* Mobile Logo */}
              <div className="lg:hidden mx-auto mb-4">
                {branding.logoUrl ? (
                  <div className="h-14 w-14 mx-auto rounded-xl overflow-hidden flex items-center justify-center bg-muted/30">
                    <img 
                      src={branding.logoUrl} 
                      alt="Company logo" 
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 mx-auto rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary/70" />
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-semibold text-foreground tracking-tight">
                {profile.companyName} <span className="text-primary">Workspace</span>
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 font-light">
                {t.auth.welcomeBack || "Welcome back! Sign in to your account"}
              </p>
            </div>
            
            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
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
              </div>
              
              <div className="space-y-1.5">
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
                    className="pr-10 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
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
                  <p className="text-sm text-destructive mt-1.5 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-destructive" />
                    {error}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
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
                className="w-full h-10 text-sm font-medium shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
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

            {/* Footer info */}
            <div className="mt-5 pt-4 border-t border-border/30">
              <p className="text-center text-xs text-muted-foreground/50">
                Protected by enterprise-grade security
              </p>
            </div>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden px-6 pb-4">
          <p className="text-center text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} {profile.companyName}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;