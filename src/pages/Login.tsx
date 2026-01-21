import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';

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
  const auth = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict = {
      en: {
        email: 'Email',
        password: 'Password',
        emailPlaceholder: 'name@company.com',
        passwordPlaceholder: 'Enter your password',
        remember: 'Remember me',
        help: 'Need help accessing your account?',
        button: 'Sign in to Arkelium',
        security: 'Protected by enterprise-grade security and audit controls',
        powered: 'Powered by Arkelium',
        tagline1: 'Enterprise Operations',
        tagline2: '& Financial Control',
        invalidEmail: 'Please enter a valid email address.',
        invalidPassword: 'Password is required.',
        loginFailed: 'Invalid email or password.',
      },
      fr: {
        email: 'E-mail',
        password: 'Mot de passe',
        emailPlaceholder: 'nom@entreprise.com',
        passwordPlaceholder: 'Entrez votre mot de passe',
        remember: 'Se souvenir de moi',
        help: "Besoin d'aide pour accéder à votre compte ?",
        button: 'Se connecter à Arkelium',
        security: "Protégé par une sécurité et des contrôles d'audit de niveau entreprise",
        powered: 'Propulsé par Arkelium',
        tagline1: 'Opérations Entreprise',
        tagline2: '& Contrôle Financier',
        invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
        invalidPassword: 'Le mot de passe est requis.',
        loginFailed: 'E-mail ou mot de passe invalide.',
      },
    } satisfies Record<Lang, Record<string, string>>;

    return dict[(language as Lang) || 'en'];
  }, [language]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const emailTrim = email.trim();
    if (!emailTrim || !emailTrim.includes('@')) {
      setErrorMsg(t.invalidEmail);
      return;
    }
    if (!password) {
      setErrorMsg(t.invalidPassword);
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem('arkelium_remember_me', rememberMe ? 'true' : 'false');
      await (auth as any).login(emailTrim, password);
      navigate('/');
    } catch (err: any) {
      console.error('[Login] login error:', err);
      setErrorMsg(t.loginFailed);
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

        {/* Right column - Login Card */}
        <div className="w-full max-w-[480px]">
          <div
            className={`rounded-2xl p-8 sm:p-10 ${isDark ? 'auth-card-dark' : 'auth-card-light'}`}
          >
            {/* Card Header */}
            <div className="flex flex-col items-center gap-3 mb-8">
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

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  className={`text-sm font-medium ${
                    isDark ? 'text-white/80' : 'text-black/80'
                  }`}
                >
                  {t.password}
                </Label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t.passwordPlaceholder}
                    className={`h-12 rounded-xl text-sm pr-12 ${
                      isDark ? 'auth-input-dark' : 'auth-input-light'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark
                        ? 'text-white/40 hover:text-white/70'
                        : 'text-black/40 hover:text-black/70'
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Help Link */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className={`h-5 w-5 rounded border-2 transition-colors ${
                      isDark
                        ? 'border-white/20 data-[state=checked]:bg-[#c9a962] data-[state=checked]:border-[#c9a962]'
                        : 'border-black/20 data-[state=checked]:bg-[#b08a45] data-[state=checked]:border-[#b08a45]'
                    }`}
                  />
                  <label
                    htmlFor="remember"
                    className={`text-sm cursor-pointer select-none ${
                      isDark ? 'text-white/60' : 'text-black/60'
                    }`}
                  >
                    {t.remember}
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className={`text-sm font-medium transition-colors ${
                    isDark
                      ? 'text-gold hover:text-[#d4b46d]'
                      : 'text-gold-light hover:text-[#9a7a3d]'
                  }`}
                >
                  {t.help}
                </Link>
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
                  isDark ? 'border-white/[0.08]' : 'border-black/[0.08]'
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
