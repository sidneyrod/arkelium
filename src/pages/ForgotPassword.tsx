import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Language } from '@/i18n/translations';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import arkeliumSymbol from '@/assets/arkelium-symbol.png';

export default function ForgotPassword() {
  const { theme } = useTheme();
  const { language } = useLanguage();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict: Record<Language, Record<string, string>> = {
      en: {
        title: 'Reset Password',
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        button: 'Send Reset Link',
        back: 'Back to login',
        sent: 'If an account exists for this email, a reset link has been sent.',
        invalid: 'Please enter a valid email address.',
        failed: 'Unable to send reset link. Please try again.',
      },
      fr: {
        title: 'Réinitialiser',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        button: 'Envoyer le lien',
        back: 'Retour',
        sent: 'Si un compte existe pour cet e-mail, un lien a été envoyé.',
        invalid: 'Veuillez saisir une adresse e-mail valide.',
        failed: "Impossible d'envoyer le lien. Réessayez.",
      },
    };

    return dict[language] || dict.en;
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

  // Card styling - Transparent like Login
  const cardClass = isDark
    ? 'bg-black/30 backdrop-blur-md border border-white/[0.08] shadow-2xl'
    : 'bg-white/30 backdrop-blur-md border border-black/[0.06] shadow-xl';

  const inputClass = isDark
    ? 'h-11 bg-[#0a0e14]/60 border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-white/10'
    : 'h-11 bg-gray-50/80 border-black/10 text-gray-900 placeholder:text-gray-400 focus:border-black/20 focus:ring-black/5';

  const labelClass = isDark ? 'text-white/70' : 'text-gray-700';

  return (
    <AuthLayout>
      {/* Auth Card - Transparent */}
      <div
        className={`relative overflow-hidden w-full max-w-[520px] rounded-2xl p-6 sm:p-8 ${cardClass}`}
      >
        {/* Watermark */}
        <img
          src={arkeliumSymbol}
          alt=""
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[72%] w-auto opacity-[0.07] pointer-events-none select-none"
        />

        <div className="relative z-10">
          {/* Title */}
          <div className="text-center mb-6">
            <h1
              className={`text-xl font-semibold ${
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

        {/* Success Message */}
        {successMsg && (
          <div
            className={`mb-5 rounded-xl px-4 py-2.5 text-sm font-medium ${
              isDark
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-green-50 border border-green-100 text-green-600'
            }`}
          >
            {successMsg}
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

          {/* Submit Button */}
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

          {/* Back to Login */}
          <div className="flex items-center justify-center pt-1">
            <Link
              to="/login"
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                isDark
                  ? 'text-white/50 hover:text-white/80'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Link>
          </div>
        </form>

          {/* Minimal footer */}
          <div className="mt-5 text-center">
            <span
              className={`text-[11px] ${
                isDark ? 'text-white/30' : 'text-gray-400'
              }`}
            >
              Enterprise-grade security
            </span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
