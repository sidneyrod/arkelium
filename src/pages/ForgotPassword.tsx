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

      {/* Card */}
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

          {isSubmitted ? (
            <div className="text-center space-y-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#D4A84B]/10 flex items-center justify-center">
                <Mail className="h-7 w-7 text-[#D4A84B]" />
              </div>
              <div>
                <h2 className="text-base font-medium text-[#ccc] mb-2">
                  {t.auth.checkEmail}
                </h2>
                <p className="text-xs text-[#666]">
                  {t.auth.resetInstructions}
                </p>
                <p className="text-xs text-[#D4A84B] mt-2 font-medium">
                  {email}
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => setIsSubmitted(false)}
                className="w-full h-11 text-sm border-[#333] bg-transparent hover:bg-[#222] text-[#888]"
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
                <h2 className="text-base font-medium text-[#ccc] mb-2">
                  {t.auth.resetPassword}
                </h2>
                <p className="text-xs text-[#666]">
                  {t.auth.enterEmailToReset}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                  {error && (
                    <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      {error}
                    </p>
                  )}
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
                  ) : t.auth.sendResetLink}
                </Button>

                <Link 
                  to="/login" 
                  className="flex items-center justify-center gap-2 text-xs text-[#D4A84B]/80 hover:text-[#D4A84B] transition-colors"
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
  );
};

export default ForgotPassword;
