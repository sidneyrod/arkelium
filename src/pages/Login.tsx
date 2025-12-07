import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Sun, Moon, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import arkeliumLogo from '@/assets/arkelium-logo.png';

// Validation schemas
const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

const Login = () => {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a] overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#0a0a0a]" />
      
      {/* Decorative gold accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#D4A84B]/5 via-transparent to-transparent" />

      {/* Theme & Language Controls */}
      <div className="absolute top-6 right-8 lg:right-16 flex items-center gap-3 z-10">
        <Select value={language} onValueChange={(val: 'en' | 'fr') => setLanguage(val)}>
          <SelectTrigger className="w-16 h-9 bg-[#1a1a1a]/80 backdrop-blur-sm border-[#333] hover:bg-[#222] transition-colors text-xs text-[#999]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-[#333]">
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="fr">FR</SelectItem>
          </SelectContent>
        </Select>
        
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleTheme} 
          className="h-9 w-9 bg-[#1a1a1a]/80 backdrop-blur-sm border-[#333] hover:bg-[#222] transition-all text-[#999]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-[380px] mx-8 lg:mx-16 z-10">
        <div className="rounded-2xl bg-[#111111]/95 backdrop-blur-xl border border-[#222] shadow-2xl shadow-black/50 p-8 lg:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center">
              <img 
                src={arkeliumLogo} 
                alt="Arkelium" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Platform Name */}
          <div className="text-center mb-8">
            <h1 className="text-xl font-semibold text-[#D4A84B] tracking-widest">
              ARKELIUM
            </h1>
            <p className="text-xs text-[#666] mt-2 tracking-wide">
              Cleaning Management Platform
            </p>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-[#888]">
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-[#0a0a0a] border-[#333] focus:border-[#D4A84B]/50 focus:ring-[#D4A84B]/20 transition-all placeholder:text-[#444] text-[#ccc]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-[#888]">
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
                  className="pr-10 h-11 bg-[#0a0a0a] border-[#333] focus:border-[#D4A84B]/50 focus:ring-[#D4A84B]/20 transition-all placeholder:text-[#444] text-[#ccc]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-[#888] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
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
                  className="h-4 w-4 border-[#444] data-[state=checked]:bg-[#D4A84B] data-[state=checked]:border-[#D4A84B]"
                />
                <Label htmlFor="remember" className="text-xs font-normal text-[#666] cursor-pointer hover:text-[#888] transition-colors">
                  {t.auth.rememberMe}
                </Label>
              </div>
              
              <Link 
                to="/forgot-password" 
                className="text-xs text-[#D4A84B]/80 hover:text-[#D4A84B] transition-colors"
              >
                {t.auth.forgotPassword}
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-[#D4A84B] to-[#B08A30] hover:from-[#C49A3C] hover:to-[#9A7A28] text-[#0a0a0a] shadow-lg shadow-[#D4A84B]/20 hover:shadow-[#D4A84B]/30 transition-all duration-200"
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
          </form>

          {/* Footer Note */}
          <p className="text-[10px] text-[#444] text-center mt-8">
            Access is controlled by your administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
