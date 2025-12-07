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
import cleaningWatermark from '@/assets/cleaning-watermark.png';

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
    <div className={`fixed inset-0 flex items-center justify-center overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-[#0a1210] via-[#0d1a15] to-[#081410]' 
        : 'bg-gradient-to-br from-[#f0f7f4] via-[#e8f4ed] to-[#f5faf7]'
    }`}>
      
      {/* Watermark Background - Cleaning Professional Image */}
      <div 
        className="absolute inset-0 bg-no-repeat bg-center bg-cover pointer-events-none"
        style={{
          backgroundImage: `url(${cleaningWatermark})`,
          opacity: isDark ? 0.04 : 0.06,
          filter: isDark ? 'grayscale(30%)' : 'grayscale(20%)',
        }}
      />
      
      {/* Green gradient overlay */}
      <div className={`absolute inset-0 ${
        isDark 
          ? 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/10 via-transparent to-transparent'
          : 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-200/30 via-transparent to-transparent'
      }`} />
      
      <div className={`absolute inset-0 ${
        isDark 
          ? 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-950/20 via-transparent to-transparent'
          : 'bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent'
      }`} />

      {/* Theme & Language Controls */}
      <div className="absolute top-6 right-8 lg:right-16 xl:right-24 flex items-center gap-3 z-10">
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

      {/* Login Card - Centered with generous lateral margins */}
      <div className="w-full max-w-[420px] mx-12 lg:mx-20 xl:mx-32 z-10">
        <div className={`rounded-2xl backdrop-blur-xl shadow-2xl p-8 lg:p-10 ${
          isDark 
            ? 'bg-[#0d1a15]/90 border border-emerald-800/20 shadow-black/50' 
            : 'bg-white/80 border border-emerald-200/50 shadow-emerald-900/10'
        }`}>
          
          {/* Logo - Arkelium Symbol */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center mb-3">
              <img 
                src={arkeliumLogo} 
                alt="Arkelium" 
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Platform Name - Close to logo */}
            <h1 className="text-lg font-semibold tracking-[0.25em] bg-gradient-to-r from-[#D4A84B] to-[#B08A30] bg-clip-text text-transparent">
              ARKELIUM
            </h1>
          </div>

          {/* Sign In Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className={`text-xs font-medium ${
                isDark ? 'text-emerald-300/70' : 'text-emerald-700'
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
                    ? 'bg-emerald-950/50 border-emerald-700/30 focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-emerald-700/50 text-emerald-100'
                    : 'bg-white border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20 placeholder:text-emerald-400 text-emerald-900'
                }`}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className={`text-xs font-medium ${
                isDark ? 'text-emerald-300/70' : 'text-emerald-700'
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
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className={`h-4 w-4 ${
                    isDark 
                      ? 'border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                      : 'border-emerald-400 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600'
                  }`}
                />
                <Label htmlFor="remember" className={`text-xs font-normal cursor-pointer transition-colors ${
                  isDark 
                    ? 'text-emerald-400/60 hover:text-emerald-300'
                    : 'text-emerald-600 hover:text-emerald-700'
                }`}>
                  {t.auth.rememberMe}
                </Label>
              </div>
              
              <Link 
                to="/forgot-password" 
                className={`text-xs transition-colors ${
                  isDark 
                    ? 'text-[#D4A84B]/80 hover:text-[#D4A84B]'
                    : 'text-[#B08A30] hover:text-[#D4A84B]'
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
          <p className={`text-[10px] text-center mt-8 ${
            isDark ? 'text-emerald-700/50' : 'text-emerald-500/70'
          }`}>
            Access is controlled by your administrator
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
