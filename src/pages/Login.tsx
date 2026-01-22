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
        title: 'Sign in to your account',
        subtitle: 'Enter your credentials to access the platform',
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        password: 'Password',
        passwordPlaceholder: '••••••••',
        rememberMe: 'Remember me',
        forgotLink: 'Need help accessing your account?',
        button: 'Sign in to Arkelium',
        security: 'Protected by enterprise-grade security and audit controls',
        powered: 'Powered by Arkelium',
        invalid: 'Please enter a valid email address.',
        failed: 'Invalid email or password. Please try again.',
      },
      fr: {
        title: 'Connectez-vous à votre compte',
        subtitle: 'Entrez vos identifiants pour accéder à la plateforme',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        password: 'Mot de passe',
        passwordPlaceholder: '••••••••',
        rememberMe: 'Se souvenir de moi',
        forgotLink: "Besoin d'aide pour accéder à votre compte ?",
        button: 'Se connecter à Arkelium',
        security: "Protégé par une sécurité et des contrôles d'audit de niveau entreprise",
        powered: 'Propulsé par Arkelium',
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
    ? 'bg-[#14181e]/80 backdrop-blur-xl border border-white/10 shadow-2xl'
    : 'bg-white/80 backdrop-blur-xl border border-black/5 shadow-2xl';

  const inputClass = isDark
    ? 'h-12 bg-[#0a0e14]/60 border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-white/10'
    : 'h-12 bg-gray-50/80 border-black/10 text-gray-900 placeholder:text-gray-400 focus:border-black/20 focus:ring-black/5';

  const labelClass = isDark ? 'text-white/70' : 'text-gray-700';

  return (
    <AuthLayout>
      {/* Auth Card */}
      <div
        className={`w-full max-w-[480px] sm:max-w-[520px] lg:max-w-[560px] 2xl:max-w-[600px] rounded-[24px] p-6 sm:p-8 lg:p-10 ${cardClass}`}
      >
        {/* Logo + Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <img
            src={arkeliumSymbol}
            alt="Arkelium"
            className="h-12 sm:h-14 w-auto select-none filter-gold"
          />
          <span className="text-brand-gold tracking-[0.25em] text-xs sm:text-sm font-medium">
            ARKELIUM
          </span>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-8">
          <h1
            className={`text-lg sm:text-xl font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t.title}
          </h1>
          <p
            className={`text-sm ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}
          >
            {t.subtitle}
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
              isDark
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-red-50 border border-red-100 text-red-600'
            }`}
          >
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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
            className="w-full h-12 text-[15px] font-medium"
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

        {/* Security Text */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <span
            className={`h-[5px] w-[5px] rounded-full ${
              isDark ? 'bg-white/10' : 'bg-black/10'
            }`}
          />
          <span
            className={`text-[11px] tracking-wide ${
              isDark ? 'text-white/30' : 'text-gray-400'
            }`}
          >
            {t.security}
          </span>
        </div>

        {/* Separator + Powered */}
        <div
          className={`mt-6 pt-5 border-t text-center ${
            isDark ? 'border-white/5' : 'border-black/5'
          }`}
        >
          <span
            className={`text-xs font-medium ${
              isDark ? 'text-white/20' : 'text-gray-300'
            }`}
          >
            {t.powered}
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
