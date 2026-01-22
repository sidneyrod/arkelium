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
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        password: 'Password',
        passwordPlaceholder: '••••••••',
        rememberMe: 'Remember me',
        forgotLink: 'Forgot Password?',
        button: 'Sign in',
        invalid: 'Please enter a valid email address.',
        failed: 'Invalid email or password. Please try again.',
        security: 'Enterprise-grade security',
      },
      fr: {
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        password: 'Mot de passe',
        passwordPlaceholder: '••••••••',
        rememberMe: 'Se souvenir de moi',
        forgotLink: 'Mot de passe oublié ?',
        button: 'Connexion',
        invalid: 'Veuillez saisir une adresse e-mail valide.',
        failed: 'E-mail ou mot de passe invalide. Réessayez.',
        security: 'Sécurité de niveau entreprise',
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

  return (
    <AuthLayout>
      {/* Auth Card - Extra Transparent */}
      <div
        className={`w-full rounded-2xl p-6 sm:p-8 ${
          isDark
            ? 'bg-black/5 backdrop-blur-sm border border-white/[0.03] shadow-2xl'
            : 'bg-white/5 backdrop-blur-sm border border-black/[0.02] shadow-xl'
        }`}
      >

        {/* Error Message */}
        {errorMsg && (
          <div
            className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium ${
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
            <Label className={isDark ? 'text-white/70' : 'text-gray-600'}>
              {t.email}
            </Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className={`h-12 rounded-lg ${
                isDark
                  ? 'bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10'
                  : 'bg-gray-50/80 border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:border-black/15 focus:ring-black/5'
              }`}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className={isDark ? 'text-white/70' : 'text-gray-600'}>
              {t.password}
            </Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t.passwordPlaceholder}
                className={`h-12 rounded-lg pr-12 ${
                  isDark
                    ? 'bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10'
                    : 'bg-gray-50/80 border-black/[0.08] text-gray-900 placeholder:text-gray-400 focus:border-black/15 focus:ring-black/5'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors ${
                  isDark
                    ? 'text-white/40 hover:text-white/70 hover:bg-white/5'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-black/5'
                }`}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Link */}
          <div className="flex items-center justify-between pt-1">
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

          {/* Submit Button - System Default */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-[15px] font-medium rounded-lg mt-2"
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

        {/* Security Footer */}
        <div className="mt-6 text-center">
          <span
            className={`text-[11px] ${
              isDark ? 'text-white/25' : 'text-gray-400'
            }`}
          >
            {t.security}
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
