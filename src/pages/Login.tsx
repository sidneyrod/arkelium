import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Language } from '@/i18n/translations';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

export default function Login() {
  const { language } = useLanguage();
  const auth = useAuth();
  const navigate = useNavigate();

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
      {/* Auth Card - Fully Transparent, Dark Only */}
      <div className="w-full rounded-2xl p-6 sm:p-8 bg-transparent border border-white/[0.03] shadow-2xl">

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-5 rounded-lg px-4 py-3 text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-white/70">
              {t.email}
            </Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className="h-12 rounded-lg bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-white/70">
              {t.password}
            </Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t.passwordPlaceholder}
                className="h-12 rounded-lg pr-12 bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors text-white/40 hover:text-white/70 hover:bg-white/5"
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
                className="border-white/20"
              />
              <label
                htmlFor="remember"
                className="text-sm cursor-pointer text-white/60"
              >
                {t.rememberMe}
              </label>
            </div>
            <Link
              to="/forgot-password"
              className="text-sm transition-colors text-white/50 hover:text-white/80"
            >
              {t.forgotLink}
            </Link>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-[15px] font-medium rounded-lg mt-2 bg-white text-gray-900 hover:bg-white/90"
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
          <span className="text-[11px] text-white/25">
            {t.security}
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
