import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/stores/companyStore';
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
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';

const Sidebar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { branding, profile } = useCompanyStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on smaller desktop screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280 && window.innerWidth >= 1024) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const navItems = [
    { path: '/', label: t.nav.home, icon: Home },
    { path: '/company', label: t.nav.company, icon: Building2 },
    { path: '/users', label: t.nav.users, icon: Users },
    { path: '/clients', label: t.nav.clients, icon: UserCircle },
    { path: '/contracts', label: t.nav.contracts, icon: FileText },
    { path: '/schedule', label: t.nav.schedule, icon: Calendar },
    { path: '/calculator', label: t.nav.calculator, icon: Calculator },
    { path: '/payroll', label: t.nav.payroll, icon: Wallet },
    ...(isManagerOrAdmin ? [{ path: '/activity-log', label: t.nav.activityLog, icon: ClipboardList }] : []),
    { path: '/settings', label: t.nav.settings, icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={cn(
      "hidden lg:flex flex-col h-screen sticky top-0 border-r border-border/50 bg-sidebar-background transition-all duration-300 ease-in-out",
      collapsed ? "w-[68px]" : "w-56"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-14 px-3 border-b border-sidebar-border shrink-0",
        collapsed ? "justify-center" : "gap-2.5"
      )}>
        {branding.logoUrl ? (
          <div className="h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
            <img 
              src={branding.logoUrl} 
              alt="Company logo" 
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        {!collapsed && (
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground truncate">
            {profile.companyName}
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const linkContent = (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  active 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );

            if (collapsed) {
              return (
                <li key={item.path}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      {linkContent}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                </li>
              );
            }

            return <li key={item.path}>{linkContent}</li>;
          })}
        </ul>
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-sidebar-border shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "w-full h-8 text-xs",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1.5" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;