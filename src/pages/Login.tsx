import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Sun, Moon, Eye, EyeOff, Building2 } from 'lucide-react';
import { z } from 'zod';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Login = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { login, signup, signInWithGoogle, isAuthenticated } = useAuth();
  const { branding, profile } = useCompanyStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): string | null => {
    try {
      emailSchema.parse(email);
    } catch (e: any) {
      return e.errors?.[0]?.message || 'Invalid email';
    }

    try {
      passwordSchema.parse(password);
    } catch (e: any) {
      return e.errors?.[0]?.message || 'Invalid password';
    }

    if (activeTab === 'signup' && password !== confirmPassword) {
      return 'Passwords do not match';
    }

    return null;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    
    const result = await signup(email, password, firstName, lastName);
    
    if (result.success) {
      toast({
        title: t.common.success,
        description: 'Account created successfully! You can now sign in.',
      });
      setActiveTab('signin');
      setPassword('');
      setConfirmPassword('');
    } else {
      setError(result.error || 'Failed to create account');
    }
    
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    
    const result = await signInWithGoogle();
    
    if (!result.success) {
      setError(result.error || 'Failed to sign in with Google');
      setIsLoading(false);
    }
    // If successful, user will be redirected by OAuth flow
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

      {/* Subtle watermark - company logo blended into background */}
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

      {/* Theme & Language Controls - Fixed top right */}
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

      {/* Centered Login Card */}
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
                <Building2 className="h-9 w-9 text-primary/70" />
              </div>
            )}
          </div>

          {/* Company Name Header - Simple */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold text-foreground tracking-tight">
              {profile.companyName}
            </h1>
          </div>

          {/* Tabs for Sign In / Sign Up */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">{t.auth.signIn}</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
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
                  className="w-full h-10 text-sm font-semibold bg-[hsl(156,55%,40%)] hover:bg-[hsl(156,55%,35%)] dark:bg-[hsl(156,50%,45%)] dark:hover:bg-[hsl(156,50%,40%)] text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
                  disabled={isLoading}
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

                {/* Google Sign In */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full h-10 text-sm font-medium"
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground/90">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground/90">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm font-medium text-foreground/90">
                    {t.auth.email}
                  </Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm font-medium text-foreground/90">
                    {t.auth.password}
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
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
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-password" className="text-sm font-medium text-foreground/90">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {t.common.loading}
                    </span>
                  ) : 'Create Account'}
                </Button>

                {/* Google Sign Up */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignIn}
                  className="w-full h-10 text-sm font-medium"
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>

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

export default Login;
