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
import arkeliumSymbol from '@/assets/arkelium-symbol.png';

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

  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 flex overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-[#0a1210] via-[#0d1a15] to-[#081410]' 
        : 'bg-gradient-to-br from-[#f5f7f9] via-[#edf8f5] to-[#f0f7f4]'
    }`}>
      
      {/* Left Side - Arkelium Symbol Brand Area */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative items-center justify-center">
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-br from-emerald-950/20 via-transparent to-emerald-900/10'
            : 'bg-gradient-to-br from-emerald-100/40 via-transparent to-emerald-50/30'
        }`} />
        
        {/* Arkelium Symbol - Large, elegant, centered */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <img 
            src={arkeliumSymbol}
            alt="Arkelium"
            className="w-[65%] max-w-[500px] object-contain select-none"
            style={{
              opacity: isDark ? 0.08 : 0.1,
              filter: isDark 
                ? 'brightness(0.9)' 
                : 'grayscale(0.2) brightness(0.95)',
            }}
          />
        </div>
        
        {/* Bottom branding text */}
        <div className={`absolute bottom-8 left-8 text-xs font-medium tracking-wide ${
          isDark ? 'text-emerald-500/40' : 'text-emerald-600/50'
        }`}>
          Powered by Arkelium
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex items-center justify-center relative">
        {/* Mobile watermark - visible only on small screens */}
        <div className="lg:hidden absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src={arkeliumSymbol}
            alt=""
            aria-hidden="true"
            className="w-[100vw] h-[100vh] max-w-none object-contain select-none"
            style={{
              opacity: isDark ? 0.03 : 0.04,
              filter: 'blur(1px)',
              transform: 'scale(1.1)',
            }}
          />
        </div>

        {/* Theme & Language Controls - Fixed at top right of viewport */}
        <div className="fixed top-6 right-6 flex items-center gap-3 z-20">
          <Select value={language} onValueChange={(val: 'en' | 'fr') => setLanguage(val)}>
            <SelectTrigger className={`w-16 h-9 backdrop-blur-sm transition-colors text-xs ${
              isDark 
                ? 'bg-emerald-950/40 border-emerald-800/30 hover:bg-emerald-900/50 text-emerald-200/70'
                : 'bg-white/60 border-emerald-200 hover:bg-white/80 text-emerald-700'
            }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-[#0d1a15] border-emerald-800/30' : 'bg-white border-emerald-200'}>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="icon" 
            onClick={toggleTheme} 
            className={`h-9 w-9 backdrop-blur-sm transition-all ${
              isDark 
                ? 'bg-emerald-950/40 border-emerald-800/30 hover:bg-emerald-900/50 text-emerald-200/70'
                : 'bg-white/60 border-emerald-200 hover:bg-white/80 text-emerald-700'
            }`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-[420px] mx-8 lg:mx-12 z-10">
          <div className={`rounded-2xl backdrop-blur-xl shadow-2xl p-8 lg:p-10 ${
            isDark 
              ? 'bg-[#0d1a15]/90 border border-emerald-800/20 shadow-black/50' 
              : 'bg-white/90 border border-emerald-200/50 shadow-emerald-900/10'
          }`}>
          
          {/* Logo - Arkelium Symbol with immediate loading */}
          <div className="flex flex-col items-center justify-center mb-8 mt-2">
            <img 
              src={arkeliumLogo} 
              alt="Arkelium" 
              className="w-28 h-28 object-contain"
              loading="eager"
              fetchPriority="high"
            />
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className={`text-xs font-medium ${
                isDark ? 'text-white' : 'text-black'
              }`}>
                {t.auth.email}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`h-11 transition-all ${
                  isDark 
                    ? 'bg-emerald-950/50 border-emerald-700/40 focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-emerald-500/70 text-emerald-100'
                    : 'bg-white border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20 placeholder:text-emerald-500 text-emerald-900'
                }`}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className={`text-xs font-medium ${
                isDark ? 'text-white' : 'text-black'
              }`}>
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
                  className={`pr-10 h-11 transition-all ${
                    isDark 
                      ? 'bg-emerald-950/50 border-emerald-700/30 focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-emerald-700/50 text-emerald-100'
                      : 'bg-white border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20 placeholder:text-emerald-400 text-emerald-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
                    isDark 
                      ? 'text-emerald-600 hover:text-emerald-400'
                      : 'text-emerald-400 hover:text-emerald-600'
                  }`}
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
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className={`h-5 w-5 rounded ${
                    isDark 
                      ? 'border-emerald-500/70 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-500'
                      : 'border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                  }`}
                />
                <Label htmlFor="remember" className={`text-sm font-normal cursor-pointer transition-colors ${
                  isDark 
                    ? 'text-emerald-200/90 hover:text-white'
                    : 'text-emerald-800 hover:text-black'
                }`}>
                  {t.auth.rememberMe}
                </Label>
              </div>
              
              <Link 
                to="/forgot-password" 
                className={`text-xs transition-colors ${
                  isDark 
                    ? 'text-white hover:text-white/80'
                    : 'text-black hover:text-black/80'
                }`}
              >
                {t.auth.forgotPassword}
              </Link>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-800/40 transition-all duration-200 border-0"
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
          <p className={`text-[11px] text-center mt-8 flex items-center justify-center gap-1.5 ${
            isDark ? 'text-emerald-400/60' : 'text-emerald-600/80'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            Secure access for authorized users only
          </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
