import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Moon,
  Sun,
  Globe,
  LogOut,
  Settings,
  Search,
  ChevronRight,
  Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const TopBar = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    if (user?.profile?.first_name || user?.profile?.last_name) {
      return `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generate breadcrumbs from current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      return [{ label: 'Home', path: '/' }];
    }
    
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    segments.forEach((segment, index) => {
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label,
        path: '/' + segments.slice(0, index + 1).join('/')
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const displayName = getUserDisplayName();
  const companyName = user?.profile?.company_id ? 'Arkelium' : 'No Company';

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-[hsl(160,18%,8%)]/95 backdrop-blur-xl border-b border-[hsl(160,12%,14%)]">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left: Breadcrumbs */}
        <div className="flex items-center gap-2 min-w-0">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
              )}
              <button
                onClick={() => navigate(crumb.path)}
                className={cn(
                  'text-sm transition-colors truncate max-w-[120px]',
                  index === breadcrumbs.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>

        {/* Center: Global Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search clients, contracts, invoices..."
              className="pl-9 h-9 bg-[hsl(160,12%,12%)] border-[hsl(160,12%,18%)] text-sm placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Right: Company indicator + Controls */}
        <div className="flex items-center gap-3">
          {/* Company Indicator */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-[hsl(160,12%,12%)] border border-[hsl(160,12%,18%)]">
            <Building2 className="h-4 w-4 text-[hsl(45,70%,55%)]" />
            <span className="text-xs font-medium text-muted-foreground">{companyName}</span>
          </div>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-[hsl(160,12%,14%)]">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-[hsl(160,18%,10%)] border-[hsl(160,12%,16%)]">
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
            className="h-9 w-9 hover:bg-[hsl(160,12%,14%)]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-[hsl(160,12%,14%)]">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-sm font-medium">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[hsl(160,18%,10%)] border-[hsl(160,12%,16%)]">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-[hsl(160,12%,16%)]" />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {t.nav.settings}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[hsl(160,12%,16%)]" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                {t.auth.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
