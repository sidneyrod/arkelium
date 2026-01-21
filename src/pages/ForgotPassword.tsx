import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun } from 'lucide-react';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import arkeliumLogo from '@/assets/arkelium-logo.png';
import arkeliumSymbol from '@/assets/arkelium-symbol.png';

type Lang = 'en' | 'fr';

export default function ForgotPassword() {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict = {
      en: {
        title: 'Reset Password',
        subtitle: "Enter your email address and we'll send you a reset link",
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        button: 'Send Reset Link',
        back: 'Back to login',
        security: 'Protected by enterprise-grade security and audit controls',
        powered: 'Powered by Arkelium',
        tagline1: 'Enterprise Operations',
        tagline2: '& Financial Control',
        sent: 'If an account exists for this email, a reset link has been sent.',
        invalid: 'Please enter a valid email address.',
        failed: 'Unable to send reset link. Please try again.',
      },
      fr: {
        title: 'Réinitialiser le mot de passe',
        subtitle: 'Entrez votre adresse e-mail et nous vous enverrons un lien de réinitialisation',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        button: 'Envoyer le lien',
        back: 'Retour à la connexion',
        security: "Protégé par une sécurité et des contrôles d'audit de niveau entreprise",
        powered: 'Propulsé par Arkelium',
        tagline1: 'Opérations Entreprise',
        tagline2: '& Contrôle Financier',
        sent: 'Si un compte existe pour cet e-mail, un lien a été envoyé.',
        invalid: 'Veuillez saisir une adresse e-mail valide.',
        failed: "Impossible d'envoyer le lien. Réessayez.",
      },
    } satisfies Record<Lang, Record<string, string>>;

    return dict[(language as Lang) || 'en'];
  }, [language]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailTrim = email.trim();
    if (!emailTrim || !emailTrim.includes('@')) {
      setErrorMsg(t.invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(emailTrim, { redirectTo });
      if (error) throw error;

      setSuccessMsg(t.sent);
    } catch (err) {
      console.error('[ForgotPassword] resetPasswordForEmail error:', err);
      setErrorMsg(t.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`fixed inset-0 overflow-hidden ${isDark ? 'auth-bg-dark' : 'auth-bg-light'}`}>
      {/* Top right controls - Pill buttons */}
      <div className="fixed top-6 right-6 z-20">
        <div className="flex items-center gap-2">
          <Select value={(language as Lang) || 'en'} onValueChange={(val: Lang) => setLanguage(val)}>
            <SelectTrigger
              className={`w-[68px] h-9 text-[13px] font-medium rounded-lg ${
                isDark ? 'auth-pill-dark' : 'auth-pill-light'
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent
              className={isDark ? 'bg-[#1a1c22] border-white/10' : 'bg-white border-black/10'}
            >
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={`h-9 w-9 rounded-lg ${isDark ? 'auth-pill-dark' : 'auth-pill-light'}`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Bottom left powered by */}
      <div
        className={`fixed bottom-6 left-8 text-[11px] font-medium tracking-wider z-10 ${
          isDark ? 'text-white/25' : 'text-black/25'
        }`}
      >
        {t.powered}
      </div>

      {/* Main container - 40/60 grid layout */}
      <div className="relative z-10 w-full h-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[2fr_3fr] items-center px-6 lg:px-8">
        
        {/* Left column - Branding (40%) */}
        <div className="hidden lg:flex flex-col items-start justify-center pl-4 xl:pl-8">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-24 xl:h-28 w-auto mb-10 select-none"
          />
          <h2 className="text-[28px] xl:text-[32px] font-medium leading-[1.25] tracking-wide text-brand-gold mb-1">
            {t.tagline1}
          </h2>
          <h2 className="text-[28px] xl:text-[32px] font-medium leading-[1.25] tracking-wide text-brand-gold">
            {t.tagline2}
          </h2>
        </div>

        {/* Right column - Reset Password Card (60%) */}
        <div className="flex items-center justify-center lg:justify-end lg:pr-4 xl:pr-8">
          <div
            className={`w-full max-w-[520px] rounded-[18px] p-9 sm:p-10 ${
              isDark ? 'auth-card-dark' : 'auth-card-light'
            }`}
          >
            {/* Card Header - Logo + ARKELIUM */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <img
                src={arkeliumSymbol}
                alt="Arkelium"
                className="h-14 w-auto select-none"
              />
              <span className="text-[15px] font-semibold tracking-[0.3em] text-brand-gold">
                ARKELIUM
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-8">
              <h1
                className={`text-xl font-semibold mb-2 ${
                  isDark ? 'text-white/90' : 'text-black/90'
                }`}
              >
                {t.title}
              </h1>
              <p
                className={`text-[14px] leading-relaxed ${
                  isDark ? 'text-white/50' : 'text-black/50'
                }`}
              >
                {t.subtitle}
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                className={`mb-6 rounded-xl px-4 py-3 text-[13px] font-medium ${
                  isDark
                    ? 'bg-red-950/50 border border-red-900/50 text-red-300'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {errorMsg}
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div
                className={`mb-6 rounded-xl px-4 py-3 text-[13px] font-medium ${
                  isDark
                    ? 'bg-emerald-950/50 border border-emerald-900/50 text-emerald-300'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}
              >
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label
                  className={`text-[13px] font-medium ${
                    isDark ? 'text-[#C9CDD3]' : 'text-[#4a4a4a]'
                  }`}
                >
                  {t.email}
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder={t.emailPlaceholder}
                  className={`h-[46px] rounded-xl text-[14px] ${
                    isDark ? 'auth-input-dark' : 'auth-input-light'
                  }`}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-[47px] w-full rounded-xl text-[14px] font-semibold gold-btn"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  t.button
                )}
              </Button>

              {/* Back to Login */}
              <div className="flex items-center justify-center pt-1">
                <Link
                  to="/login"
                  className={`flex items-center gap-2 text-[13px] font-medium transition-all duration-150 hover:underline ${
                    isDark
                      ? 'text-[#C9A24D]/80 hover:text-[#C9A24D]'
                      : 'text-[#B08A3D]/80 hover:text-[#B08A3D]'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </Link>
              </div>

              {/* Security Text */}
              <div className="flex items-center justify-center gap-2 pt-3">
                <span
                  className={`h-[5px] w-[5px] rounded-full ${
                    isDark ? 'bg-white/15' : 'bg-black/15'
                  }`}
                />
                <span
                  className={`text-[11px] tracking-wide ${isDark ? 'text-white/30' : 'text-black/35'}`}
                >
                  {t.security}
                </span>
              </div>

              {/* Separator */}
              <div
                className={`border-t ${
                  isDark ? 'border-white/[0.06]' : 'border-black/[0.06]'
                }`}
              />

              {/* Powered by */}
              <div
                className={`text-center text-[13px] font-medium ${
                  isDark ? 'text-white/35' : 'text-black/35'
                }`}
              >
                {t.powered}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
