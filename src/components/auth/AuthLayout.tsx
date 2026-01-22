import { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/i18n/translations';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import arkeliumLogo from '@/assets/arkelium-logo.png';



interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 overflow-y-auto">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
        style={{
          backgroundImage: isDark
            ? 'url(/images/auth-bg-dark.png)'
            : 'url(/images/auth-bg-light.png)',
        }}
      >
        {/* Overlay for contrast */}
        <div
          className={`absolute inset-0 transition-colors duration-300 ${
            isDark ? 'bg-black/50' : 'bg-white/30'
          }`}
        />
      </div>

      {/* Top Right Controls - Language + Theme ONLY */}
      <div className="fixed top-5 right-5 z-50 flex items-center gap-2">
        {/* Language Selector - Compact */}
        <Select
          value={language}
          onValueChange={(val: Language) => setLanguage(val)}
        >
          <SelectTrigger
            className={`w-[68px] h-9 text-[13px] font-medium rounded-lg border-0 ${
              isDark
                ? 'bg-white/10 text-white/80 hover:bg-white/15'
                : 'bg-black/5 text-black/70 hover:bg-black/10'
            }`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            className={
              isDark
                ? 'bg-[#1a1c22] border-white/10'
                : 'bg-white border-black/10'
            }
          >
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="fr">FR</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme Toggle - Sun/Moon Icon */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={`h-9 w-9 rounded-lg border-0 ${
            isDark
              ? 'bg-white/10 text-white/80 hover:bg-white/15'
              : 'bg-black/5 text-black/70 hover:bg-black/10'
          }`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left Column - Brand Panel (Desktop Only) */}
        <div className="hidden lg:flex w-[45%] xl:w-[42%] items-center justify-center px-8 xl:px-16">
          <div className="flex flex-col items-start max-w-md">
            {/* Large Logo - ONLY GOLD ELEMENT */}
            <img
              src={arkeliumLogo}
              alt="Arkelium"
              className="h-24 xl:h-28 2xl:h-32 w-auto mb-10 xl:mb-14 select-none filter-gold"
            />

            {/* Enterprise Headline */}
            <h1
              className={`text-3xl xl:text-4xl 2xl:text-[42px] font-light leading-tight mb-2 ${
                isDark ? 'text-brand-gold/90' : 'text-brand-gold'
              }`}
            >
              Enterprise Operations
            </h1>
            <h1
              className={`text-3xl xl:text-4xl 2xl:text-[42px] font-light leading-tight ${
                isDark ? 'text-brand-gold/90' : 'text-brand-gold'
              }`}
            >
              & Financial Control
            </h1>
          </div>
        </div>

        {/* Mobile/Tablet Brand Header */}
        <div className="flex lg:hidden flex-col items-center pt-20 pb-6 px-6">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-14 sm:h-16 w-auto mb-4 select-none filter-gold"
          />
          <h2
            className={`text-lg sm:text-xl font-light text-center ${
              isDark ? 'text-brand-gold/90' : 'text-brand-gold'
            }`}
          >
            Enterprise Operations & Financial Control
          </h2>
        </div>

        {/* Right Column - Auth Card */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 xl:px-16 py-6 lg:py-8">
          {children}
        </div>
      </div>

      {/* Bottom Left - Powered by (Desktop Only) */}
      <div
        className={`fixed bottom-5 left-6 text-[11px] font-medium tracking-wider z-10 hidden lg:block ${
          isDark ? 'text-white/25' : 'text-black/25'
        }`}
      >
        Powered by Arkelium
      </div>
    </div>
  );
}
