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
import { Sun, Moon, ArrowLeft, Mail } from 'lucide-react';
import { z } from 'zod';
import arkeliumLogo from '@/assets/arkelium-logo.png';
import arkeliumSymbol from '@/assets/arkelium-symbol.png';

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

  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 flex overflow-hidden ${
      isDark 
        ? 'bg-gradient-to-br from-[#0a1210] via-[#0d1a15] to-[#081410]' 
        : 'bg-[#EDF3F0]'
    }`}>
      
      {/* Left Side - Arkelium Symbol Brand Area */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative items-center justify-center">
        {/* Subtle gradient overlay */}
        <div className={`absolute inset-0 ${
          isDark 
            ? 'bg-gradient-to-br from-emerald-950/20 via-transparent to-emerald-900/10'
            : 'bg-gradient-to-br from-[#DCE8E2]/70 via-[#E5F0EA]/50 to-[#EDF5F1]/60'
        }`} />
        
        {/* Arkelium Symbol - Large, elegant, centered with enhanced light theme presence */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          <img 
            src={arkeliumSymbol}
            alt="Arkelium"
            className="w-[65%] max-w-[480px] object-contain select-none"
            style={{
              opacity: isDark ? 0.06 : 0.09,
              filter: isDark 
                ? 'brightness(0.8)' 
                : 'drop-shadow(0 4px 20px rgba(10, 108, 83, 0.08)) contrast(1.05)',
            }}
          />
        </div>
        
        {/* Bottom branding text */}
        <div className={`absolute bottom-8 left-8 text-xs font-medium tracking-wide ${
          isDark ? 'text-emerald-500/40' : 'text-emerald-700/60'
        }`}>
          Powered by Arkelium
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-[48%] xl:w-[45%] flex items-center justify-center lg:justify-center relative">
        {/* Mobile watermark - visible only on small screens */}
        <div className="lg:hidden absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <img 
            src={arkeliumSymbol}
            alt=""
            aria-hidden="true"
            className="w-[100vw] h-[100vh] max-w-none object-contain select-none"
            style={{
              opacity: isDark ? 0.03 : 0.045,
              filter: isDark ? 'blur(1px)' : 'none',
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

        {/* Card */}
        <div className="w-full max-w-[460px] mx-6 lg:mx-0 lg:mr-[12%] z-10">
          <div className={`rounded-2xl backdrop-blur-xl p-8 lg:p-10 ${
            isDark 
              ? 'bg-[#0d1a15]/90 border border-emerald-800/20 shadow-2xl shadow-black/50' 
              : 'bg-white/95 border border-emerald-200/60 shadow-[0_12px_48px_-12px_rgba(0,80,60,0.18)]'
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

            {isSubmitted ? (
              <div className="text-center space-y-6">
                <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center ${
                  isDark ? 'bg-emerald-500/10' : 'bg-emerald-100'
                }`}>
                  <Mail className={`h-7 w-7 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <h2 className={`text-base font-medium mb-2 ${isDark ? 'text-emerald-100' : 'text-emerald-900'}`}>
                    {t.auth.checkEmail}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-emerald-300/60' : 'text-emerald-600/70'}`}>
                    {t.auth.resetInstructions}
                  </p>
                  <p className="text-xs text-[#D4A84B] mt-2 font-medium">
                    {email}
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setIsSubmitted(false)}
                  className={`w-full h-11 text-sm ${
                    isDark 
                      ? 'border-emerald-800/30 bg-transparent hover:bg-emerald-900/30 text-emerald-300/70' 
                      : 'border-emerald-200 bg-transparent hover:bg-emerald-50 text-emerald-700'
                  }`}
                >
                  {t.auth.tryDifferentEmail}
                </Button>
                <Link 
                  to="/login" 
                  className="flex items-center justify-center gap-2 text-xs text-[#D4A84B]/80 hover:text-[#D4A84B] transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t.auth.backToLogin}
                </Link>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className={`text-base font-medium mb-2 ${isDark ? 'text-emerald-100' : 'text-emerald-900'}`}>
                    {t.auth.resetPassword}
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-white/70' : 'text-black/70'}`}>
                    {t.auth.enterEmailToReset}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
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
                    {error && (
                      <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                        {error}
                      </p>
                    )}
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/40 transition-all duration-200"
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
                    ) : t.auth.sendResetLink}
                  </Button>

                  <Link 
                    to="/login" 
                    className={`flex items-center justify-center gap-2 text-xs transition-colors ${
                      isDark ? 'text-white hover:text-white/80' : 'text-black hover:text-black/80'
                    }`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t.auth.backToLogin}
                  </Link>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;