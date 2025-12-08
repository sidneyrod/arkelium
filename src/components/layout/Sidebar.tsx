import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanyStore } from '@/stores/companyStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { 
  Home, 
  Building2, 
  Users, 
  UserCircle, 
  FileText, 
  Calendar, 
  FileSpreadsheet, 
  Wallet,
  Settings,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Receipt,
  CalendarOff,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import arkeliumLogo from '@/assets/arkelium-logo.png';

const Sidebar = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { branding, profile } = useCompanyStore();
  const { openTab } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
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
    { path: '/invoices', label: 'Invoices', icon: Receipt },
    ...(isManagerOrAdmin ? [{ path: '/completed-services', label: 'Completed Services', icon: CheckCircle }] : []),
    { path: '/calculator', label: 'Estimate', icon: FileSpreadsheet },
    { path: '/payroll', label: t.nav.payroll, icon: Wallet },
    ...(isManagerOrAdmin ? [{ path: '/activity-log', label: t.nav.activityLog, icon: ClipboardList }] : []),
    ...(isManagerOrAdmin ? [{ path: '/absence-approval', label: 'Absences', icon: CalendarOff }] : []),
    { path: '/settings', label: t.nav.settings, icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "hidden lg:flex flex-col h-screen sticky top-0 border-r border-border/50 bg-sidebar-background transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-56"
      )}>
        {/* Platform Logo - ARKELIUM Symbol Only */}
        <div className="flex items-center justify-center h-28 px-3 shrink-0">
          <div className={cn(
            "rounded-full overflow-hidden shrink-0 flex items-center justify-center",
            collapsed ? "w-14 h-14" : "w-24 h-24"
          )}>
            <img 
              src={arkeliumLogo} 
              alt="Arkelium" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>


        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const active = isActive(item.path);
              
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                openTab(item.path, item.label);
                navigate(item.path);
              };
              
              const linkContent = (
                <a
                  href={item.path}
                  onClick={handleClick}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                    active 
                      ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </a>
              );

              if (collapsed) {
                return (
                  <li key={item.path} className="relative">
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        {linkContent}
                      </TooltipTrigger>
                      <TooltipContent 
                        side="right" 
                        sideOffset={8}
                        className="font-medium z-[9999] bg-popover border border-border shadow-lg px-3 py-1.5"
                      >
                        <span>{item.label}</span>
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
    </TooltipProvider>
  );
};

export default Sidebar;
