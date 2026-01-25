import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle, Shield } from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Language } from '@/i18n/translations';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict: Record<Language, Record<string, string>> = {
      en: {
        title: 'Create New Password',
        subtitle: 'Enter a secure password for your account',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        passwordPlaceholder: '••••••••',
        button: 'Update Password',
        back: 'Back to login',
        success: 'Password updated! Redirecting...',
        mismatch: 'Passwords do not match.',
        tooShort: 'Password must be at least 6 characters.',
        failed: 'Unable to update password. Please try again.',
        noSession: 'Invalid or expired reset link.',
        security: 'Enterprise-grade security',
      },
      fr: {
        title: 'Créer un nouveau mot de passe',
        subtitle: 'Entrez un mot de passe sécurisé pour votre compte',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        passwordPlaceholder: '••••••••',
        button: 'Mettre à jour',
        back: 'Retour à la connexion',
        success: 'Mot de passe mis à jour ! Redirection...',
        mismatch: 'Les mots de passe ne correspondent pas.',
        tooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
        failed: 'Impossible de mettre à jour. Réessayez.',
        noSession: 'Lien invalide ou expiré.',
        security: 'Sécurité de niveau entreprise',
      },
    };

    return dict[language] || dict.en;
  }, [language]);

  // Check if user arrived via valid reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg(t.noSession);
      }
    };
    checkSession();
  }, [t.noSession]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg(t.tooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t.mismatch);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setSuccessMsg(t.success);
      
      // Sign out and redirect to login after success
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('[ResetPassword] updateUser error:', err);
      setErrorMsg(t.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    // Card content only - AuthLayout is rendered by PublicAuthLayout
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
          <div className="mb-5 rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">{t.newPassword}</Label>
            <div className="relative">
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.passwordPlaceholder}
                className="h-12 rounded-lg pr-12 bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors text-white/40 hover:text-white/70 hover:bg-white/5"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label className="text-white/70 text-sm">{t.confirmPassword}</Label>
            <div className="relative">
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.passwordPlaceholder}
                className="h-12 rounded-lg pr-12 bg-[#0a0c10]/70 border-white/[0.08] text-white placeholder:text-white/35 focus:border-white/20 focus:ring-white/10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors text-white/40 hover:text-white/70 hover:bg-white/5"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !!successMsg}
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
  );
}
