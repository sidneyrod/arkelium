import { ReactNode } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/i18n/translations';
import { Sun, Moon, ChevronDown } from 'lucide-react';
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
    <div className="fixed inset-0 overflow-hidden">
      {/* Full-screen Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
        style={{
          backgroundImage: isDark
            ? 'url(/images/auth-bg-dark.png)'
            : 'url(/images/auth-bg-light.png)',
        }}
      >
        {/* Overlay for contrast and premium depth */}
        <div
          className={`absolute inset-0 transition-colors duration-300 ${
            isDark 
              ? 'bg-gradient-to-br from-black/60 via-black/40 to-black/50' 
              : 'bg-gradient-to-br from-white/40 via-white/20 to-white/30'
          }`}
        />
      </div>

      {/* Top Right Controls - Language + Theme */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex items-center gap-2">
        {/* Language Selector */}
        <Select
          value={language}
          onValueChange={(val: Language) => setLanguage(val)}
        >
          <SelectTrigger
            className={`w-[60px] h-8 text-xs font-medium rounded-md border-0 ${
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

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className={`h-8 w-8 rounded-md border-0 ${
            isDark
              ? 'bg-white/10 text-white/80 hover:bg-white/15'
              : 'bg-black/5 text-black/70 hover:bg-black/10'
          }`}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="relative z-10 h-screen flex flex-col lg:flex-row">
        
        {/* Left Brand Panel - Desktop Only (≥1024px) */}
        <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] 2xl:w-[42%] relative items-center justify-center px-8">
          
          {/* Watermark "A" - subtle background element */}
          <img
            src={arkeliumSymbol}
            alt=""
            aria-hidden="true"
            className="absolute right-[-5%] top-1/2 -translate-y-1/2 h-[85vh] w-auto opacity-[0.04] pointer-events-none select-none"
          />
          
          {/* Brand Content - Centered with Large Logo */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
            {/* Logo - Gold, 200% Size, Centered */}
            <img
              src={arkeliumLogo}
              alt="Arkelium"
              className="h-40 xl:h-48 2xl:h-56 w-auto mb-10 xl:mb-12 select-none"
              style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.4))' }}
            />

            {/* Headline - Centered with Logo */}
            <h1
              className={`font-light leading-[1.15] mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}
              style={{ 
                fontSize: 'clamp(32px, 3.5vw, 52px)',
                letterSpacing: '-0.02em'
              }}
            >
              Enterprise Operations
              <br />
              <span className="font-normal">&amp; Financial Control</span>
            </h1>
            
            {/* Subtitle - Lower contrast */}
            <p
              className={`max-w-md ${isDark ? 'text-white/50' : 'text-gray-500'}`}
              style={{ fontSize: 'clamp(14px, 1.1vw, 17px)', lineHeight: 1.6 }}
            >
              Financial control. Operational clarity. Real-time insight.
            </p>
          </div>
        </div>

        {/* Mobile/Tablet Brand Header (< 1024px) */}
        <div className="flex lg:hidden flex-col items-center pt-16 sm:pt-20 pb-6 px-6">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-10 sm:h-12 w-auto mb-3 select-none"
          />
          <p
            className={`text-xs sm:text-sm text-center max-w-[280px] ${
              isDark ? 'text-white/50' : 'text-gray-500'
            }`}
          >
            Enterprise Operations & Financial Control
          </p>
        </div>

        {/* Right Panel - Login Card */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 xl:px-12 py-6 lg:py-0">
          <div className="w-full max-w-[420px] lg:max-w-[440px] xl:max-w-[460px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
