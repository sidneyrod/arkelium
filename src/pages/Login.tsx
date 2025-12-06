import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/stores/companyStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sun, Moon, Sparkles, Eye, EyeOff } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Left Side - Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-gradient-to-tl from-primary/5 via-transparent to-transparent" />
        </div>
        
        {/* Logo Watermark */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          {branding.logoUrl ? (
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              <img 
                src={branding.logoUrl} 
                alt="Company logo" 
                className="w-full h-full object-contain opacity-20 dark:opacity-15 filter grayscale"
              />
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            </div>
          ) : (
            <div className="relative w-full max-w-sm aspect-square flex flex-col items-center justify-center">
              {/* Modern placeholder with gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-full blur-3xl scale-150" />
                <div className="relative h-32 w-32 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center">
                  <Sparkles className="h-16 w-16 text-primary/40" />
                </div>
              </div>
              <div className="mt-8 text-center">
                <h2 className="text-2xl font-semibold text-foreground/60">{profile.companyName}</h2>
                <p className="text-sm text-muted-foreground mt-2">Professional Cleaning Services</p>
              </div>
            </div>
          )}
        </div>

        {/* Company name at bottom */}
        <div className="absolute bottom-8 left-8 right-8">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {profile.companyName}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col lg:w-1/2">
        {/* Theme & Language Controls */}
        <div className="flex items-center justify-end gap-2 p-4">
          <Select value={language} onValueChange={(val: 'en' | 'fr') => setLanguage(val)}>
            <SelectTrigger className="w-20 h-9 bg-background/80 backdrop-blur-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Login Form Container */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-8 pb-8">
          <Card className="w-full max-w-sm border-border/50 shadow-lg bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-3 pb-4">
              {/* Mobile Logo */}
              <div className="lg:hidden mx-auto">
                {branding.logoUrl ? (
                  <div className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center">
                    <img 
                      src={branding.logoUrl} 
                      alt="Company logo" 
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-xl font-semibold">{profile.companyName}</CardTitle>
                <CardDescription className="text-muted-foreground text-sm">
                  {t.auth.welcomeBack}
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm">{t.auth.email}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm">{t.auth.password}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10 h-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive mt-1.5">{error}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="remember" 
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    />
                    <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                      {t.auth.rememberMe}
                    </Label>
                  </div>
                  
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                  >
                    {t.auth.forgotPassword}
                  </Link>
                </div>

                <Button type="submit" className="w-full h-10" disabled={isLoading}>
                  {isLoading ? t.common.loading : t.auth.signIn}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;