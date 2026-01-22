import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Language } from '@/i18n/translations';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import arkeliumSymbol from '@/assets/arkelium-symbol.png';

export default function Login() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const auth = useAuth();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('arkelium_remember_me') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict: Record<Language, Record<string, string>> = {
      en: {
        title: 'Sign in',
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        password: 'Password',
        passwordPlaceholder: '••••••••',
        rememberMe: 'Remember me',
        forgotLink: 'Need help?',
        button: 'Sign in',
        invalid: 'Please enter a valid email address.',
        failed: 'Invalid email or password. Please try again.',
      },
      fr: {
        title: 'Connexion',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        password: 'Mot de passe',
        passwordPlaceholder: '••••••••',
        rememberMe: 'Se souvenir de moi',
        forgotLink: "Besoin d'aide ?",
        button: 'Connexion',
        invalid: 'Veuillez saisir une adresse e-mail valide.',
        failed: 'E-mail ou mot de passe invalide. Réessayez.',
      },
    };

    return dict[language] || dict.en;
  }, [language]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrim = email.trim();
    if (!emailTrim || !emailTrim.includes('@')) {
      setErrorMsg(t.invalid);
      return;
    }

    localStorage.setItem('arkelium_remember_me', String(rememberMe));

    setIsSubmitting(true);
    try {
      await (auth as any).login(emailTrim, password);
      navigate('/');
    } catch (err) {
      console.error('[Login] login error:', err);
      setErrorMsg(t.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Card styling
  const cardClass = isDark
    ? 'bg-[#14181e]/85 backdrop-blur-xl border border-white/10 shadow-2xl'
    : 'bg-white/85 backdrop-blur-xl border border-black/5 shadow-2xl';

  const inputClass = isDark
    ? 'h-11 bg-[#0a0e14]/60 border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-white/10'
    : 'h-11 bg-gray-50/80 border-black/10 text-gray-900 placeholder:text-gray-400 focus:border-black/20 focus:ring-black/5';

  const labelClass = isDark ? 'text-white/70' : 'text-gray-700';

  return (
    <AuthLayout>
      {/* Auth Card - Compact */}
      <div
        className={`w-full max-w-[520px] rounded-[22px] p-6 sm:p-7 lg:p-8 ${cardClass}`}
      >
        {/* Logo only - no text beneath */}
        <div className="flex justify-center mb-5">
          <img
            src={arkeliumSymbol}
            alt="Arkelium"
            className="h-10 sm:h-11 w-auto select-none filter-gold"
          />
        </div>

        {/* Shorter title */}
        <div className="text-center mb-5">
          <h1
            className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t.title}
          </h1>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            className={`mb-5 rounded-xl px-4 py-2.5 text-sm font-medium ${
              isDark
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-50 border border-red-100 text-red-600'
            }`}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label className={labelClass}>{t.email}</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className={labelClass}>{t.password}</Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t.passwordPlaceholder}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                  isDark
                    ? 'text-white/40 hover:text-white/70'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className={isDark ? 'border-white/20' : 'border-gray-300'}
              />
              <label
                htmlFor="remember"
                className={`text-sm cursor-pointer ${
                  isDark ? 'text-white/60' : 'text-gray-600'
                }`}
              >
                {t.rememberMe}
              </label>
            </div>
            <Link
              to="/forgot-password"
              className={`text-sm transition-colors ${
                isDark
                  ? 'text-white/50 hover:text-white/80'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.forgotLink}
            </Link>
          </div>

          {/* Submit Button - SYSTEM DEFAULT, NO GOLD */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 text-[15px] font-medium"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              t.button
            )}
          </Button>
        </form>

        {/* Minimal footer */}
        <div className="mt-4 text-center">
          <span
            className={`text-[10px] ${
              isDark ? 'text-white/20' : 'text-gray-300'
            }`}
          >
            Enterprise-grade security
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
