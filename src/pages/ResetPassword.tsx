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
        title: 'New Password',
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
      },
      fr: {
        title: 'Nouveau mot de passe',
        newPassword: 'Nouveau mot de passe',
        confirmPassword: 'Confirmer',
        passwordPlaceholder: '••••••••',
        button: 'Mettre à jour',
        back: 'Retour',
        success: 'Mot de passe mis à jour ! Redirection...',
        mismatch: 'Les mots de passe ne correspondent pas.',
        tooShort: 'Le mot de passe doit contenir au moins 6 caractères.',
        failed: 'Impossible de mettre à jour. Réessayez.',
        noSession: 'Lien invalide ou expiré.',
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
    ? 'bg-[#14181e]/85 backdrop-blur-xl border border-white/10 shadow-2xl'
    : 'bg-white/85 backdrop-blur-xl border border-black/5 shadow-2xl';

  const inputClass = isDark
    ? 'h-11 bg-[#0a0e14]/60 border-white/10 text-white placeholder:text-white/40 focus:border-white/30 focus:ring-white/10'
    : 'h-11 bg-gray-50/80 border-black/10 text-gray-900 placeholder:text-gray-400 focus:border-black/20 focus:ring-black/5';

  const labelClass = isDark ? 'text-white/70' : 'text-gray-700';

  return (
    <AuthLayout>
      {/* Auth Card - Compact */}
      <div
        className={`w-full max-w-[520px] rounded-[22px] p-6 sm:p-7 lg:p-8 ${cardClass}`}
      >
        {/* Logo only */}
        <div className="flex justify-center mb-5">
          <img
            src={arkeliumSymbol}
            alt="Arkelium"
            className="h-10 sm:h-11 w-auto select-none filter-gold"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h1
            className={`text-lg font-semibold ${
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
            className={`mb-5 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2 ${
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !!successMsg}
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
        <div className="mt-4 text-center">
          <span
            className={`text-[10px] ${
              isDark ? 'text-white/20' : 'text-gray-300'
            }`}
          >
            Enterprise-grade security
          </span>
        </div>
      </div>
    </AuthLayout>
  );
}
