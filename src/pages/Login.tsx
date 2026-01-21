import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Settings, ChevronDown } from 'lucide-react';

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
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('arkelium_remember_me') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = useMemo(() => {
    const dict = {
      en: {
        title: 'Sign in to your account',
        subtitle: 'Enter your credentials to access the platform',
        email: 'Email',
        emailPlaceholder: 'name@company.com',
        password: 'Password',
        passwordPlaceholder: 'Enter your password',
        rememberMe: 'Remember me',
        forgotLink: 'Need help accessing your account?',
        button: 'Sign in to Arkelium',
        security: 'Protected by enterprise-grade security and audit controls',
        powered: 'Powered by Arkelium',
        tagline1: 'Enterprise Operations',
        tagline2: '& Financial Control',
        invalidEmail: 'Please enter a valid email address.',
        invalidPassword: 'Password is required.',
        failed: 'Invalid email or password. Please try again.',
      },
      fr: {
        title: 'Connectez-vous à votre compte',
        subtitle: 'Entrez vos identifiants pour accéder à la plateforme',
        email: 'E-mail',
        emailPlaceholder: 'nom@entreprise.com',
        password: 'Mot de passe',
        passwordPlaceholder: 'Entrez votre mot de passe',
        rememberMe: 'Se souvenir de moi',
        forgotLink: "Besoin d'aide pour accéder à votre compte ?",
        button: 'Se connecter à Arkelium',
        security: "Protégé par une sécurité et des contrôles d'audit de niveau entreprise",
        powered: 'Propulsé par Arkelium',
        tagline1: 'Opérations Entreprise',
        tagline2: '& Contrôle Financier',
        invalidEmail: 'Veuillez saisir une adresse e-mail valide.',
        invalidPassword: 'Le mot de passe est requis.',
        failed: 'E-mail ou mot de passe invalide. Réessayez.',
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
      localStorage.setItem('arkelium_remember_me', String(rememberMe));
      await (auth as any).login(emailTrim, password);
      navigate('/');
    } catch (err) {
      console.error('[Login] login error:', err);
      setErrorMsg(t.failed);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`fixed inset-0 overflow-hidden ${isDark ? 'auth-bg-dark' : 'auth-bg-light'}`}>
      {/* Top right controls */}
      <div className="fixed top-6 right-6 z-20">
        <div className="flex items-center gap-2">
          {/* Language selector */}
          <Select value={(language as Lang) || 'en'} onValueChange={(val: Lang) => setLanguage(val)}>
            <SelectTrigger
              className={`w-[72px] h-9 text-[13px] font-medium rounded-lg gap-1 ${
                isDark ? 'auth-pill-dark' : 'auth-pill-light'
              }`}
            >
              <SelectValue />
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </SelectTrigger>
            <SelectContent
              className={isDark ? 'bg-[#1a1c22] border-white/10' : 'bg-white border-black/10'}
            >
              <SelectItem value="en">EN</SelectItem>
              <SelectItem value="fr">FR</SelectItem>
            </SelectContent>
          </Select>

          {/* Settings/Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className={`h-9 w-9 rounded-lg ${isDark ? 'auth-pill-dark' : 'auth-pill-light'}`}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom left powered by */}
      <div
        className={`fixed bottom-6 left-8 text-[11px] font-medium tracking-wider z-10 ${
          isDark ? 'auth-powered-dark' : 'auth-powered-light'
        }`}
      >
        {t.powered}
      </div>

      {/* Main container */}
      <div className="relative z-10 w-full h-full max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-[2fr_3fr] items-center px-6 lg:px-10">
        
        {/* Left column - Branding */}
        <div className="hidden lg:flex flex-col items-start justify-center pl-4 xl:pl-6">
          {/* Logo */}
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-20 xl:h-24 w-auto mb-10 select-none filter-gold"
          />
          {/* Tagline */}
          <h2 className="auth-tagline text-brand-gold mb-1 opacity-85">
            {t.tagline1}
          </h2>
          <h2 className="auth-tagline text-brand-gold opacity-85">
            {t.tagline2}
          </h2>
        </div>

        {/* Right column - Login Card */}
        <div className="flex items-center justify-center lg:justify-end lg:pr-4 xl:pr-8">
          <div
            className={`w-full max-w-[480px] rounded-[20px] p-8 sm:p-10 auth-card-animate ${
              isDark ? 'auth-card-dark' : 'auth-card-light'
            }`}
          >
            {/* Card Header - Logo + ARKELIUM */}
            <div className="flex flex-col items-center gap-3 mb-7">
              <img
                src={arkeliumSymbol}
                alt="Arkelium"
                className="h-12 w-auto select-none filter-gold"
              />
              <span className="auth-brand-text text-brand-gold">
                ARKELIUM
              </span>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-7">
              <h1
                className={`text-lg font-semibold mb-1.5 ${
                  isDark ? 'text-[#E7EAF0]' : 'text-[#1A1A1A]'
                }`}
              >
                {t.title}
              </h1>
              <p
                className={`text-[13px] leading-relaxed ${
                  isDark ? 'text-[#9AA3AF]' : 'text-[#6B7280]'
                }`}
              >
                {t.subtitle}
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                className={`mb-5 rounded-xl px-4 py-3 text-[13px] font-medium ${
                  isDark ? 'auth-alert-error-dark' : 'auth-alert-error-light'
                }`}
              >
                {errorMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label className={isDark ? 'auth-label-dark' : 'auth-label-light'}>
                  {t.email}
                </Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder={t.emailPlaceholder}
                  className={isDark ? 'auth-input-dark' : 'auth-input-light'}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label className={isDark ? 'auth-label-dark' : 'auth-label-light'}>
                  {t.password}
                </Label>
                <div className="relative">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={t.passwordPlaceholder}
                    className={`pr-11 ${isDark ? 'auth-input-dark' : 'auth-input-light'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 ${
                      isDark ? 'auth-eye-btn-dark' : 'auth-eye-btn-light'
                    }`}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot link */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    className={isDark ? 'auth-checkbox-dark' : 'auth-checkbox-light'}
                  />
                  <label
                    htmlFor="remember"
                    className={`text-[13px] font-medium cursor-pointer select-none ${
                      isDark ? 'text-[#9AA3AF]' : 'text-[#5A5A5A]'
                    }`}
                  >
                    {t.rememberMe}
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className={isDark ? 'auth-help-link-dark' : 'auth-help-link-light'}
                >
                  {t.forgotLink}
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className={`w-full ${isDark ? 'auth-btn-dark' : 'auth-btn-light'}`}
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
                  className={`h-[5px] w-[5px] rounded-full ${
                    isDark ? 'bg-white/10' : 'bg-black/10'
                  }`}
                />
                <span
                  className={`text-[11px] tracking-wide ${
                    isDark ? 'auth-muted-dark' : 'auth-muted-light'
                  }`}
                >
                  {t.security}
                </span>
              </div>

              {/* Separator */}
              <div
                className={`border-t ${
                  isDark ? 'auth-separator-dark' : 'auth-separator-light'
                }`}
              />

              {/* Powered by */}
              <div
                className={`text-center text-[13px] font-medium ${
                  isDark ? 'text-white/30' : 'text-black/30'
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
