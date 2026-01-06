import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';

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
  const { theme, toggleTheme } = useTheme(); // ✅ CORRIGIDO: theme ao invés de isDark
  const { language, setLanguage } = useLanguage();

  // ✅ Derivar isDark de theme
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict = {
      en: {
        title: 'Reset Password',
        subtitle: 'Enter your email address and we will send you a reset link',
        email: 'Email',
        placeholder: 'name@company.com',
        button: 'Send Reset Link',
        back: 'Back to login',
        sent: 'If an account exists for this email, a reset link has been sent.',
        invalid: 'Please enter a valid email.',
        failed: 'Unable to send reset link. Please try again.',
      },
      fr: {
        title: 'Réinitialiser le mot de passe',
        subtitle: "Entrez votre e-mail et nous vous enverrons un lien de réinitialisation",
        email: 'E-mail',
        placeholder: 'nom@entreprise.com',
        button: 'Envoyer le lien',
        back: 'Retour à la connexion',
        sent: "Si un compte existe pour cet e-mail, un lien a été envoyé.",
        invalid: 'Veuillez saisir un e-mail valide.',
        failed: "Impossible d'envoyer le lien. Réessayez.",
      },
    } satisfies Record<Lang, any>;

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
      className={`fixed inset-0 overflow-hidden ${
        isDark
          ? 'bg-gradient-to-br from-[#0a1210] via-[#0d1a15] to-[#081410]'
          : 'bg-[#EDF3F0]'
      }`}
      style={{ zoom: 0.85 }}
    >


      {/* Top right controls */}
      <div className="fixed top-6 right-6 z-20">
        <div className="flex items-center gap-3">
          <Select value={(language as Lang) || 'en'} onValueChange={(val: Lang) => setLanguage(val)}>
            <SelectTrigger
              className={`w-16 h-9 backdrop-blur-sm transition-colors text-xs ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-800/30 hover:bg-emerald-900/50 text-emerald-200/70'
                  : 'bg-white/60 border-emerald-200 hover:bg-white/80 text-emerald-700'
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isDark ? 'bg-[#0d1a15] border-emerald-800/30' : 'bg-white border-emerald-200'}>
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleTheme}
            className={`h-9 w-9 backdrop-blur-sm transition-colors ${
              isDark
                ? 'bg-emerald-950/40 border-emerald-800/30 hover:bg-emerald-900/50 text-emerald-200/70'
                : 'bg-white/60 border-emerald-200 hover:bg-white/80 text-emerald-700'
            }`}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Bottom left */}
      <div
        className={`fixed bottom-8 left-8 text-xs font-medium tracking-wide ${
          isDark ? 'text-emerald-500/40' : 'text-emerald-700/60'
        }`}
      >
        Powered by Arkelium
      </div>

      {/* Centered Card */}
      <div className="relative z-10 w-full h-full flex items-center justify-center p-6 py-12">
        <div className="w-full max-w-[520px]">
          <div
            className={`rounded-2xl backdrop-blur-xl p-8 lg:p-10 ${
              isDark
                ? 'bg-[#0d1a15]/90 border border-emerald-800/20 shadow-2xl shadow-black/50'
                : 'bg-white/95 border border-emerald-200/60 shadow-[0_12px_48px_-12px_rgba(0,80,60,0.18)]'
            }`}
          >
            <div className="flex flex-col items-center gap-4 mb-6">
              <img src={arkeliumLogo} alt="Arkelium" className="h-24 w-auto select-none" />
              <div className="text-center">
                <h1 className={`text-xl font-semibold ${isDark ? 'text-emerald-100' : 'text-emerald-950'}`}>
                  {t.title}
                </h1>
                <p className={`mt-2 text-sm ${isDark ? 'text-emerald-200/60' : 'text-emerald-900/60'}`}>
                  {t.subtitle}
                </p>
              </div>
            </div>

            {errorMsg ? (
              <div
                className={`mb-5 rounded-xl px-4 py-3 text-sm ${
                  isDark
                    ? 'bg-red-950/30 border border-red-900/30 text-red-200/90'
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}
              >
                {errorMsg}
              </div>
            ) : null}

            {successMsg ? (
              <div
                className={`mb-5 rounded-xl px-4 py-3 text-sm ${
                  isDark
                    ? 'bg-emerald-950/30 border border-emerald-800/30 text-emerald-100/90'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                }`}
              >
                {successMsg}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className={isDark ? 'text-emerald-100/90' : 'text-emerald-900'}>{t.email}</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder={t.placeholder}
                  className={`h-12 ${
                    isDark
                      ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-100 placeholder:text-emerald-200/30'
                      : 'bg-white border-emerald-200 text-emerald-900 placeholder:text-emerald-500/50'
                  }`}
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base font-semibold">
                {isSubmitting ? '...' : t.button}
              </Button>

              <div className="flex items-center justify-center">
                <Link
                  to="/login"
                  className={`text-sm underline-offset-4 hover:underline ${
                    isDark ? 'text-emerald-200/80' : 'text-emerald-700'
                  }`}
                >
                  ← {t.back}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}