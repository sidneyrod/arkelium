import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';

import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Language } from '@/i18n/translations';

import AuthLayout from '@/components/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import arkeliumSymbol from '@/assets/arkelium-symbol.png';

export default function ResetPassword() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const navigate = useNavigate();

  const isDark = theme === 'dark';

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
        subtitle: 'Enter your new password below',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        passwordPlaceholder: '••••••••',
        button: 'Update Password',
        back: 'Back to login',
        security: 'Protected by enterprise-grade security and audit controls',
        powered: 'Powered by Arkelium',
        success: 'Password updated successfully! Redirecting to login...',
        mismatch: 'Passwords do not match.',
        tooShort: 'Password must be at least 6 characters.',
        failed: 'Unable to update password. Please try again.',
        noSession: 'Invalid or expired reset link. Please request a new one.',
      },
      fr: {
        title: 'Créer un nouveau mot de passe',
        subtitle: 'Entrez votre nouveau mot de passe ci-dessous',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer le mot de passe',
        passwordPlaceholder: '••••••••',
        button: 'Mettre à jour',
        back: 'Retour à la connexion',
        security: "Protégé par une sécurité et des contrôles d'audit de niveau entreprise",
        powered: 'Propulsé par Arkelium',
        success: 'Mot de passe mis à jour avec succès ! Redirection...',
        mismatch: 'Les mots de passe ne correspondent pas.',
        tooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
        failed: 'Impossible de mettre à jour le mot de passe. Réessayez.',
        noSession: 'Lien de réinitialisation invalide ou expiré. Veuillez en demander un nouveau.',
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

        {/* Success Message */}
        {successMsg && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              isDark
                ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                : 'bg-green-50 border border-green-100 text-green-600'
            }`}
          >
            <CheckCircle className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* New Password */}
          <div className="space-y-2">
            <Label className={labelClass}>{t.newPassword}</Label>
            <div className="relative">
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type={showNewPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.passwordPlaceholder}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                  isDark
                    ? 'text-white/40 hover:text-white/70'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showNewPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label className={labelClass}>{t.confirmPassword}</Label>
            <div className="relative">
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={t.passwordPlaceholder}
                className={`${inputClass} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
                  isDark
                    ? 'text-white/40 hover:text-white/70'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button - SYSTEM DEFAULT */}
          <Button
            type="submit"
            disabled={isSubmitting || !!successMsg}
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

          {/* Back to Login */}
          <div className="flex items-center justify-center pt-2">
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
