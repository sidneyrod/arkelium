import { ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/i18n/translations';
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

// Preload dark background image
const preloadImage = new Image();
preloadImage.src = '/images/auth-bg-dark.png';

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Full-screen Background Image - Dark Only */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/auth-bg-dark.png)' }}
      >
        {/* Subtle overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/30" />
      </div>

      {/* Top Right Controls - Language Only */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex items-center gap-2">
        <Select
          value={language}
          onValueChange={(val: Language) => setLanguage(val)}
        >
          <SelectTrigger
            className="w-[60px] h-8 text-xs font-medium rounded-md border-0 bg-white/10 text-white/80 hover:bg-white/15"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1c22] border-white/10">
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="fr">FR</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="relative z-10 h-screen flex flex-col lg:flex-row">
        
        {/* Left Brand Panel - Desktop Only (≥1024px) */}
        <div className="hidden lg:flex lg:w-[50%] xl:w-[48%] relative items-center justify-center px-12 xl:px-16">
          
          {/* Brand Content */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-lg mx-auto">
            {/* Logo - Gold, Centered */}
            <img
              src={arkeliumLogo}
              alt="Arkelium"
              className="h-32 xl:h-36 2xl:h-40 w-auto mb-12 xl:mb-14 select-none"
              style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.4))' }}
            />

            {/* Headline */}
            <h1
              className="font-light leading-[1.12] mb-5 text-white"
              style={{ 
                fontSize: 'clamp(28px, 2.8vw, 42px)',
                letterSpacing: '-0.01em'
              }}
            >
              Control What Matters.
              <br />
              <span className="font-normal">Operate With Precision.</span>
            </h1>
            
            {/* Subtitle */}
            <p
              className="max-w-md text-white/50"
              style={{ fontSize: 'clamp(13px, 1vw, 15px)', lineHeight: 1.7 }}
            >
              Enterprise-grade operations, scheduling and financial intelligence in one unified platform.
            </p>
          </div>
        </div>

        {/* Mobile/Tablet Brand Header (< 1024px) */}
        <div className="flex lg:hidden flex-col items-center pt-14 sm:pt-18 pb-5 px-6">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-16 sm:h-20 w-auto mb-4 select-none"
            style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
          />
          <h2 className="text-lg sm:text-xl font-light text-white text-center mb-2">
            Control What Matters.
          </h2>
          <p className="text-xs sm:text-sm text-center max-w-[300px] text-white/50">
            Enterprise-grade operations & financial intelligence.
          </p>
        </div>

        {/* Right Panel - Login Card */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 lg:px-12 xl:px-16 py-6 lg:py-0">
          <div className="w-full max-w-[400px] lg:max-w-[420px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
