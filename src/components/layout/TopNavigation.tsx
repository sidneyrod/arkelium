import { NavLink } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Home, 
  Building2, 
  Users, 
  UserCircle, 
  FileText, 
  Calendar, 
  Calculator, 
  Wallet,
  Settings,
  Moon,
  Sun,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const TopNavigation = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { path: '/', label: t.nav.home, icon: Home },
    { path: '/company', label: t.nav.company, icon: Building2 },
    { path: '/users', label: t.nav.users, icon: Users },
    { path: '/clients', label: t.nav.clients, icon: UserCircle },
    { path: '/contracts', label: t.nav.contracts, icon: FileText },
    { path: '/schedule', label: t.nav.schedule, icon: Calendar },
    { path: '/calculator', label: t.nav.calculator, icon: Calculator },
    { path: '/payroll', label: t.nav.payroll, icon: Wallet },
    { path: '/settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-bold text-primary-foreground">C</span>
          </div>
          <span className="hidden text-lg font-semibold tracking-tight sm:block">
            CleanPro
          </span>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'nav-item flex items-center gap-2',
                  isActive ? 'nav-item-active' : 'nav-item-inactive'
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Mobile Navigation */}
        <nav className="flex lg:hidden overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 px-2">
            {navItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-center p-2 rounded-lg transition-colors',
                    isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-5 w-5" />
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem 
                onClick={() => setLanguage('en')}
                className={cn(language === 'en' && 'bg-accent')}
              >
                🇬🇧 English
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('fr')}
                className={cn(language === 'fr' && 'bg-accent')}
              >
                🇫🇷 Français
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* User Avatar */}
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center">
            <span className="text-sm font-medium text-primary-foreground">JD</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;
