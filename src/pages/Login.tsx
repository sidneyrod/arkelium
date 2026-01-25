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
        secureAccess: 'Secure Access',
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        password: 'Password',
        passwordPlaceholder: '••••••••••',
        rememberDevice: 'Remember this device',
        forgotLink: 'Forgot password?',
        button: 'Sign in securely',
        invalid: 'Please enter a valid email address.',
        failed: 'Invalid email or password. Please try again.',
        protectedBy: 'Protected by enterprise-grade security & compliance standards',
      },
      fr: {
        secureAccess: 'Accès Sécurisé',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        password: 'Mot de passe',
        passwordPlaceholder: '••••••••••',
        rememberDevice: 'Se souvenir de cet appareil',
        forgotLink: 'Mot de passe oublié ?',
        button: 'Connexion sécurisée',
        invalid: 'Veuillez saisir une adresse e-mail valide.',
        failed: 'E-mail ou mot de passe invalide. Réessayez.',
        protectedBy: 'Protégé par une sécurité et des normes de conformité de niveau entreprise',
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
      {/* Auth Card - Minimal Glass Effect */}
      <div className="w-full">
        
        {/* Secure Access Header */}
        <h2 className="text-sm font-medium text-white/60 mb-6 tracking-wide">
          {t.secureAccess}
        </h2>

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
            <Label className="text-white/50 text-xs font-medium tracking-wide">
              {t.email}
            </Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className="h-11 rounded-lg bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0 focus:bg-white/[0.05]"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-white/50 text-xs font-medium tracking-wide">
              {t.password}
            </Label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={t.passwordPlaceholder}
                className="h-11 rounded-lg pr-11 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-white/20 focus:ring-0 focus:bg-white/[0.05]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors text-white/40 hover:text-white/70"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Device + Forgot Link */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                className="h-4 w-4 border-white/20 data-[state=checked]:bg-white/20 data-[state=checked]:border-white/30 rounded"
              />
              <label
                htmlFor="remember"
                className="text-xs cursor-pointer text-white/50"
              >
                {t.rememberDevice}
              </label>
            </div>
            <Link
              to="/forgot-password"
              className="text-xs transition-colors text-white/50 hover:text-white/80"
            >
              {t.forgotLink}
            </Link>
          </div>

          {/* Submit Button - Dark style */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 text-sm font-medium rounded-lg mt-3 bg-[#1a1d24] text-white/90 hover:bg-[#252930] border border-white/[0.08] transition-all"
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
          <span className="text-[11px] text-white/30 leading-relaxed">
            {t.protectedBy}
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
