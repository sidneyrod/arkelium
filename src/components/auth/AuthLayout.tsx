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
import arkeliumSymbol from '@/assets/arkelium-symbol.png';

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
        <div className="hidden lg:flex w-[45%] xl:w-[42%] relative items-center justify-center px-8 xl:px-16">
          {/* Watermark "A" - very low opacity, positioned behind content */}
          <img
            src={arkeliumSymbol}
            alt=""
            aria-hidden="true"
            className="absolute right-0 top-1/2 -translate-y-1/2 h-[70vh] w-auto opacity-[0.03] pointer-events-none select-none"
          />
          
          <div className="relative z-10 flex flex-col items-start max-w-md">
            {/* Larger Logo - ONLY GOLD ELEMENT */}
            <img
              src={arkeliumLogo}
              alt="Arkelium"
              className="h-32 xl:h-36 2xl:h-40 w-auto mb-8 xl:mb-10 select-none filter-gold"
            />

            {/* Enterprise Headline - NEUTRAL COLOR, not gold */}
            <h1
              className={`font-light leading-tight mb-1 ${
                isDark ? 'text-white/90' : 'text-gray-800'
              }`}
              style={{ fontSize: 'clamp(28px, 3.2vw, 44px)' }}
            >
              Enterprise Operations
            </h1>
            <h1
              className={`font-light leading-tight mb-4 ${
                isDark ? 'text-white/90' : 'text-gray-800'
              }`}
              style={{ fontSize: 'clamp(28px, 3.2vw, 44px)' }}
            >
              & Financial Control
            </h1>
            
            {/* Subtitle - subtle */}
            <p
              className={isDark ? 'text-white/40' : 'text-gray-500'}
              style={{ fontSize: 'clamp(13px, 1.2vw, 16px)' }}
            >
              Financial control. Operational clarity. Real-time insight.
            </p>
          </div>
        </div>

        {/* Mobile/Tablet Brand Header */}
        <div className="flex lg:hidden flex-col items-center pt-14 pb-4 px-6">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-12 sm:h-14 w-auto mb-3 select-none filter-gold"
          />
          <p
            className={`text-sm text-center ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}
          >
            Enterprise Operations & Financial Control
          </p>
        </div>

        {/* Right Column - Auth Card */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-12 xl:px-16 py-4 lg:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
