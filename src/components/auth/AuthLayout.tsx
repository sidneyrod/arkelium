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
import { Shield, FileCheck, Lock } from 'lucide-react';

import arkeliumLogo from '@/assets/arkelium-logo.png';

interface AuthLayoutProps {
  children: ReactNode;
}

// Preload dark background image and logo
const preloadBg = new Image();
preloadBg.src = '/images/auth-bg-dark.png';

const preloadLogo = new Image();
preloadLogo.src = arkeliumLogo;

export default function AuthLayout({ children }: AuthLayoutProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Full-screen Background Image - Dark Only */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/auth-bg-dark.png)' }}
      >
        {/* Overlay for contrast and premium depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/50" />
      </div>

      {/* Top Right Controls - Language Only */}
      <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-50 flex items-center gap-2">
        {/* Language Selector */}
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
        <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] 2xl:w-[42%] relative items-center justify-center px-8">
          
          {/* Brand Content - Centered with Large Logo */}
          <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto w-full">
            {/* Logo - Gold, Large, Centered */}
            <img
              src={arkeliumLogo}
              alt="Arkelium"
              className="h-64 xl:h-72 2xl:h-80 w-auto mb-3 select-none"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
            />

            {/* Headline - Centered with Logo */}
            <h1
              className="font-light leading-[1.15] mb-5 text-white"
              style={{ 
                fontSize: 'clamp(28px, 3vw, 44px)',
                letterSpacing: '-0.02em'
              }}
            >
              Enterprise Operations
              <br />
              <span className="font-normal">&amp; Financial Control</span>
            </h1>
            
            {/* Subtitle - Lower contrast */}
            <p
              className="max-w-md text-white/50 mb-10"
              style={{ fontSize: 'clamp(13px, 1vw, 16px)', lineHeight: 1.6 }}
            >
              Operational clarity, financial accuracy, audit-ready by design.
            </p>

            {/* Trust Indicators */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5 text-white/40">
                <Shield className="h-4 w-4 text-amber-500/70" />
                <span className="text-xs font-medium tracking-wide">Audit-ready architecture</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/40">
                <FileCheck className="h-4 w-4 text-amber-500/70" />
                <span className="text-xs font-medium tracking-wide">Compliance-driven by default</span>
              </div>
              <div className="flex items-center gap-2.5 text-white/40">
                <Lock className="h-4 w-4 text-amber-500/70" />
                <span className="text-xs font-medium tracking-wide">Enterprise-grade security</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Brand Header (< 1024px) */}
        <div className="flex lg:hidden flex-col items-center pt-16 sm:pt-20 pb-6 px-6">
          <img
            src={arkeliumLogo}
            alt="Arkelium"
            className="h-32 sm:h-40 w-auto mb-4 select-none"
            style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}
          />
          <p className="text-xs sm:text-sm text-center max-w-[280px] text-white/50">
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
