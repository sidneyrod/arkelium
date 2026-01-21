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

        {/* Right column - Login Card (60%) */}
        <div className="flex items-center justify-center lg:justify-end lg:pr-4 xl:pr-8">
          <div
            className={`w-full max-w-[520px] rounded-[18px] p-9 sm:p-10 ${
              isDark ? 'auth-card-dark' : 'auth-card-light'
            }`}
          >
            {/* Card Header - Logo + ARKELIUM */}
            <div className="flex flex-col items-center gap-3 mb-8">
              <img
                src={arkeliumSymbol}
                alt="Arkelium"
                className="h-14 w-auto select-none"
              />
              <span className="text-[15px] font-semibold tracking-[0.3em] text-brand-gold">
                ARKELIUM
              </span>
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

              {/* Password Field */}
              <div className="space-y-2">
                <Label
                  className={`text-[13px] font-medium ${
                    isDark ? 'text-[#C9CDD3]' : 'text-[#4a4a4a]'
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
                    className={`h-[46px] rounded-xl text-[14px] pr-12 ${
                      isDark ? 'auth-input-dark' : 'auth-input-light'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                      isDark
                        ? 'text-white/35 hover:text-white/60'
                        : 'text-black/35 hover:text-black/60'
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
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
                    className={`h-[18px] w-[18px] rounded-[4px] border-[1.5px] transition-colors gold-checkbox ${
                      isDark
                        ? 'border-white/20'
                        : 'border-black/20'
                    }`}
                  />
                  <label
                    htmlFor="remember"
                    className={`text-[13px] cursor-pointer select-none ${
                      isDark ? 'text-white/55' : 'text-black/55'
                    }`}
                  >
                    {t.remember}
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className={`text-[13px] font-medium transition-all duration-150 hover:underline ${
                    isDark
                      ? 'text-[#C9A24D]/80 hover:text-[#C9A24D]'
                      : 'text-[#B08A3D]/80 hover:text-[#B08A3D]'
                  }`}
                >
                  {t.help}
                </Link>
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
