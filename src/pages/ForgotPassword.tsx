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
    <div
      className={`fixed inset-0 overflow-hidden ${isDark ? 'auth-bg-dark' : 'auth-bg-light'} ${isDark ? 'auth-texture' : 'auth-texture auth-texture-light'}`}
    >
      {/* Top right controls */}
      <div className="fixed top-6 right-6 z-20">
        <div className="flex items-center gap-3">
          <Select value={(language as Lang) || 'en'} onValueChange={(val: Lang) => setLanguage(val)}>
            <SelectTrigger
              className={`w-[72px] h-10 text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-[#1a1c22]/80 border-white/10 hover:bg-[#22242a] text-white/70'
                  : 'bg-white/90 border-black/10 hover:bg-white text-black/70'
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
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`h-10 w-10 transition-colors ${
              isDark
                ? 'bg-[#1a1c22]/80 border-white/10 hover:bg-[#22242a] text-white/70'
                : 'bg-white/90 border-black/10 hover:bg-white text-black/70'
            }`}
          >
            {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </Button>
        </div>
      </div>

      {/* Bottom left powered by */}
      <div
        className={`fixed bottom-8 left-8 text-xs font-medium tracking-wide z-10 ${
          isDark ? 'text-white/30' : 'text-black/30'
        }`}
      >
        {t.powered}
      </div>

      {/* Main container - two columns */}
      <div className="relative z-10 w-full h-full flex items-center justify-center px-6 lg:px-12">
        {/* Left column - Branding (hidden on mobile/tablet) */}
        <div className="hidden lg:flex flex-col items-start justify-center flex-1 max-w-sm xl:max-w-md pr-12 xl:pr-20">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-28 xl:h-32 w-auto mb-8 select-none"
          />
          <h2
            className={`text-xl xl:text-2xl font-light tracking-wide mb-1 ${
              isDark ? 'text-gold' : 'text-gold-light'
            }`}
          >
            {t.tagline1}
          </h2>
          <h2
            className={`text-xl xl:text-2xl font-light tracking-wide ${
              isDark ? 'text-gold' : 'text-gold-light'
            }`}
          >
            {t.tagline2}
          </h2>
        </div>

        {/* Right column - Reset Password Card */}
        <div className="w-full max-w-[480px]">
          <div
            className={`rounded-2xl p-8 sm:p-10 ${isDark ? 'auth-card-dark' : 'auth-card-light'}`}
          >
            {/* Card Header */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <img
                src={arkeliumSymbol}
                alt="Arkelium"
                className="h-16 w-auto select-none"
              />
              <span
                className={`text-base font-semibold tracking-[0.25em] ${
                  isDark ? 'text-gold' : 'text-gold-light'
                }`}
              >
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
                className={`text-sm ${
                  isDark ? 'text-white/50' : 'text-black/50'
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
                    ? 'bg-red-950/40 border border-red-900/40 text-red-300'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {errorMsg}
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div
                className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${
                  isDark
                    ? 'bg-emerald-950/40 border border-emerald-900/40 text-emerald-300'
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
                  className={`text-sm font-medium ${
                    isDark ? 'text-white/80' : 'text-black/80'
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
                  className={`h-12 rounded-xl text-sm ${
                    isDark ? 'auth-input-dark' : 'auth-input-light'
                  }`}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`h-12 w-full rounded-xl text-sm font-semibold ${
                  isDark ? 'dark-btn' : 'gold-btn'
                }`}
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
              <div className="flex items-center justify-center">
                <Link
                  to="/login"
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    isDark
                      ? 'text-gold hover:text-[#d4b46d]'
                      : 'text-gold-light hover:text-[#9a7a3d]'
                  }`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t.back}
                </Link>
              </div>

              {/* Security Text */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isDark ? 'bg-white/20' : 'bg-black/20'
                  }`}
                />
                <span
                  className={`text-xs ${isDark ? 'text-white/35' : 'text-black/40'}`}
                >
                  {t.security}
                </span>
              </div>

              {/* Separator */}
              <div
                className={`border-t ${
                  isDark ? 'border-white/8' : 'border-black/8'
                }`}
              />

              {/* Powered by */}
              <div
                className={`text-center text-sm font-medium ${
                  isDark ? 'text-white/40' : 'text-black/40'
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
