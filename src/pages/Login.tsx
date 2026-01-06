import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Sun, Eye, EyeOff } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { theme, toggleTheme } = useTheme(); // ✅ CORRIGIDO: theme ao invés de isDark
  const { language, setLanguage } = useLanguage();

  // ✅ Derivar isDark de theme
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict = {
      en: {
        email: 'Email',
        password: 'Password',
        remember: 'Remember me',
        forgot: 'Forgot password?',
        secure: 'Secure access for authorized users only',
        loading: 'Signing in...',
        button: 'Sign In',
        invalid: 'Please enter a valid email and password.',
        failed: 'Unable to sign in. Please check your credentials.',
      },
      fr: {
        email: 'E-mail',
        password: 'Mot de passe',
        remember: 'Se souvenir de moi',
        forgot: 'Mot de passe oublié ?',
        secure: 'Accès sécurisé réservé aux utilisateurs autorisés',
        loading: 'Connexion...',
        button: 'Se connecter',
        invalid: 'Veuillez saisir un e-mail et un mot de passe valides.',
        failed: 'Impossible de se connecter. Vérifiez vos identifiants.',
      },
    } satisfies Record<Lang, any>;

    return dict[(language as Lang) || 'en'];
  }, [language]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrim = email.trim();
    if (!emailTrim || !password.trim()) {
      setErrorMsg(t.invalid);
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem('arkelium_remember_me', String(rememberMe));

      // ✅ Use the method that exists in your AuthContext
      // Expected: auth.login(email, password)
      // If your AuthContext returns { login }, this works:
      if (typeof (auth as any).login !== 'function') {
        throw new Error('AuthContext: login() not found. Use the correct method name from AuthContext.');
      }

      await (auth as any).login(emailTrim, password);

      navigate('/', { replace: true });
    } catch (err) {
      console.error('[Login] login error:', err);
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
        <div className="w-full max-w-[480px]">
          <div
            className={`rounded-2xl backdrop-blur-xl p-8 lg:p-10 ${
              isDark
                ? 'bg-[#0d1a15]/90 border border-emerald-800/20 shadow-2xl shadow-black/50'
                : 'bg-white/95 border border-emerald-200/60 shadow-[0_12px_48px_-12px_rgba(0,80,60,0.18)]'
            }`}
          >
            <div className="flex flex-col items-center gap-3 mb-8">
              <img src={arkeliumLogo} alt="Arkelium" className="h-28 w-auto select-none" />
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

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className={isDark ? 'text-emerald-100/90' : 'text-emerald-900'}>{t.email}</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  className={`h-12 ${
                    isDark
                      ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-100 placeholder:text-emerald-200/30'
                      : 'bg-white border-emerald-200 text-emerald-900 placeholder:text-emerald-500/50'
                  }`}
                />
              </div>

              <div className="space-y-2">
                <Label className={isDark ? 'text-emerald-100/90' : 'text-emerald-900'}>{t.password}</Label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`h-12 pr-12 ${
                      isDark
                        ? 'bg-emerald-950/30 border-emerald-800/30 text-emerald-100 placeholder:text-emerald-200/30'
                        : 'bg-white border-emerald-200 text-emerald-900 placeholder:text-emerald-500/50'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-2 transition ${
                      isDark ? 'text-emerald-200/70 hover:bg-emerald-900/40' : 'text-emerald-700 hover:bg-emerald-50'
                    }`}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <Checkbox checked={rememberMe} onCheckedChange={(v) => setRememberMe(Boolean(v))} />
                  <span className={isDark ? 'text-emerald-100/70' : 'text-emerald-900/70'}>{t.remember}</span>
                </label>

                <Link
                  to="/forgot-password"
                  className={`text-sm underline-offset-4 hover:underline ${
                    isDark ? 'text-emerald-200/80' : 'text-emerald-700'
                  }`}
                >
                  {t.forgot}
                </Link>
              </div>

              <Button type="submit" disabled={isSubmitting} className="h-12 w-full rounded-xl text-base font-semibold">
                {isSubmitting ? t.loading : t.button}
              </Button>

              <div className={`flex items-center justify-center gap-2 text-xs ${
                isDark ? 'text-emerald-200/50' : 'text-emerald-700/60'
              }`}>
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/60" />
                <span>{t.secure}</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}