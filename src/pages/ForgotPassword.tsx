import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Language } from '@/i18n/translations';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const { language } = useLanguage();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict: Record<Language, Record<string, string>> = {
      en: {
        title: 'Reset Password',
        subtitle: 'Enter your email to receive a secure reset link',
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        button: 'Send Reset Link',
        back: 'Back to login',
        sent: 'If an account exists for this email, a reset link has been sent.',
        invalid: 'Please enter a valid email address.',
        failed: 'Unable to send reset link. Please try again.',
        security: 'Enterprise-grade security',
      },
      fr: {
        title: 'Réinitialiser le mot de passe',
        subtitle: 'Entrez votre e-mail pour recevoir un lien sécurisé',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        button: 'Envoyer le lien',
        back: 'Retour à la connexion',
        sent: 'Si un compte existe pour cet e-mail, un lien a été envoyé.',
        invalid: 'Veuillez saisir une adresse e-mail valide.',
        failed: "Impossible d'envoyer le lien. Réessayez.",
        security: 'Sécurité de niveau entreprise',
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

  return (
    <AuthLayout>
      {/* Auth Card - Fully Transparent */}
      <div className="w-full rounded-2xl p-6 sm:p-8 bg-transparent border-0 shadow-none">
        
        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-white mb-2">
            {t.title}
          </h1>
          <p className="text-sm text-white/50">
            {t.subtitle}
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-5 rounded-lg px-4 py-3 text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Success Message */}
        {successMsg && (
          <div className="mb-5 rounded-lg px-4 py-3 text-sm font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">{t.email}</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder={t.emailPlaceholder}
              className="h-12 rounded-lg bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 text-[15px] font-semibold rounded-lg bg-white text-gray-900 hover:bg-white/90 transition-all"
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
          <div className="flex items-center justify-center pt-2">
            <Link
              to="/login"
              className="flex items-center gap-2 text-sm font-medium transition-colors text-white/50 hover:text-white/80"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Link>
          </div>
        </form>

        {/* Security Footer */}
        <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
          <span className="flex items-center justify-center gap-1.5 text-[11px] text-white/30">
            <Shield className="h-3 w-3" />
            {t.security}
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
