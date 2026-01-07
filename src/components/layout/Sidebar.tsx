import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
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
  CheckCircle,
  MapPin,
  Briefcase,
  Handshake,
  DollarSign,
  Bell,
  BookOpen,
  CreditCard,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useState, useEffect } from 'react';
import arkeliumLogo from '@/assets/arkelium-logo.png';
import SidebarMenuGroup, { MenuItem } from './SidebarMenuGroup';

const Sidebar = () => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const { openTab } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on smaller desktop screens + expose sidebar width as CSS var (used to center TopBar search)
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;

      // Auto-collapse on smaller desktop screens
      if (width < 1280 && width >= 1024) {
        setCollapsed(true);
      }

      const isDesktop = width >= 1024;
      const sidebarWidth = isDesktop ? (collapsed ? '60px' : '224px') : '0px';
      document.documentElement.style.setProperty('--app-sidebar-width', sidebarWidth);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [collapsed]);

  // Role checks
  const isAdmin = hasRole(['admin']);
  const isAdminOrManager = hasRole(['admin', 'manager']);
  const isCleaner = hasRole(['cleaner']);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (path: string, label: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    openTab(path, label);
    navigate(path);
  };

  // =====================
  // MODULE 1: OPERATIONS
  // =====================
  const operationsItems: MenuItem[] = [];
  
  operationsItems.push({ path: '/schedule', label: t.nav.schedule, icon: Calendar });
  
  if (isAdminOrManager) {
    operationsItems.push({ path: '/completed-services', label: 'Completed Services', icon: CheckCircle });
  }
  
  operationsItems.push({ path: '/visit-history', label: 'Visit History', icon: MapPin });
  
  if (isAdminOrManager) {
    operationsItems.push({ path: '/off-requests', label: 'Off Requests', icon: CalendarOff });
  } else if (isCleaner) {
    operationsItems.push({ path: '/my-off-requests', label: 'Off Requests', icon: CalendarOff });
  }
  
  if (isAdminOrManager) {
    operationsItems.push({ path: '/activity-log', label: t.nav.activityLog, icon: ClipboardList });
  }
  
  operationsItems.push({ path: '/notifications', label: 'Notifications', icon: Bell });

  // =============================
  // MODULE 2: CLIENTS & CONTRACTS
  // =============================
  const clientsItems: MenuItem[] = [];
  
  if (isAdminOrManager) {
    clientsItems.push({ path: '/clients', label: t.nav.clients, icon: UserCircle });
    clientsItems.push({ path: '/contracts', label: t.nav.contracts, icon: FileText });
    clientsItems.push({ path: '/calculator', label: 'Estimate', icon: FileSpreadsheet });
  }

  // =====================
  // MODULE 3: FINANCIAL
  // =====================
  const financialItems: MenuItem[] = [];
  
  if (isAdminOrManager) {
    financialItems.push({ path: '/payments', label: 'Payments & Collections', icon: CreditCard });
  }
  
  if (isAdminOrManager) {
    financialItems.push({ path: '/financial', label: 'Ledger', icon: BookOpen });
  }
  
  if (isAdminOrManager) {
    financialItems.push({ path: '/invoices', label: 'Invoices', icon: Receipt });
    financialItems.push({ path: '/receipts', label: 'Receipts', icon: Receipt });
  }
  
  if (isAdmin) {
    financialItems.push({ path: '/payroll', label: t.nav.payroll, icon: Wallet });
  }
  
  if (isCleaner) {
    financialItems.push({ path: '/my-payroll', label: t.payroll.myPayroll, icon: Wallet });
  }

  // ===========================
  // MODULE 4: COMPANY MANAGEMENT
  // ===========================
  const companyItems: MenuItem[] = [];
  
  if (isAdmin) {
    companyItems.push({ path: '/access-roles', label: 'Access & Roles', icon: Shield });
    companyItems.push({ path: '/users', label: t.nav.users, icon: Users });
    companyItems.push({ path: '/company', label: t.nav.company, icon: Building2 });
    companyItems.push({ path: '/settings', label: t.nav.settings, icon: Settings });
  }

  const renderHomeLink = () => {
    const active = isActive('/');
    
    const linkContent = (
      <a
        href="/"
        onClick={handleNavClick('/', 'Dashboard')}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
          active 
            ? "bg-primary text-primary-foreground" 
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Home className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Dashboard</span>}
      </a>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent 
            side="right" 
            sideOffset={8}
            className="font-medium z-[9999] bg-popover border border-border shadow-lg px-3 py-1.5"
          >
            <span>Dashboard</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "hidden lg:flex flex-col min-h-screen sticky top-0 border-r border-border bg-sidebar-background transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-56"
      )} style={{ height: 'calc(100vh / 0.85)' }}>
        {/* Logo Section */}
        <div className={cn(
          "flex items-center h-14 px-4 shrink-0 border-b border-border",
          collapsed ? "justify-center px-2" : "justify-start gap-2.5"
        )}>
          <div className={cn(
            "shrink-0 flex items-center justify-center",
            collapsed ? "w-8 h-8" : "w-7 h-7"
          )}>
            <img 
              src={arkeliumLogo} 
              alt="Arkelium" 
              className="w-full h-full object-contain"
            />
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight text-foreground">
              Arkelium
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {/* Home */}
            {renderHomeLink()}

            {/* Module 1: Operations */}
            {operationsItems.length > 0 && (
              <SidebarMenuGroup
                title="Operations"
                icon={Briefcase}
                items={operationsItems}
                collapsed={collapsed}
                defaultOpen={true}
              />
            )}

            {/* Module 2: Clients & Contracts */}
            {clientsItems.length > 0 && (
              <SidebarMenuGroup
                title="Clients"
                icon={Handshake}
                items={clientsItems}
                collapsed={collapsed}
              />
            )}

            {/* Module 3: Financial */}
            {financialItems.length > 0 && (
              <SidebarMenuGroup
                title="Financial"
                icon={DollarSign}
                items={financialItems}
                collapsed={collapsed}
              />
            )}

            {/* Module 4: Company Management */}
            {companyItems.length > 0 && (
              <SidebarMenuGroup
                title="Company"
                icon={Building2}
                items={companyItems}
                collapsed={collapsed}
              />
            )}
          </div>
        </nav>

        {/* Collapse Toggle */}
        <div className="mt-auto shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-none border-t border-border",
              collapsed ? "justify-center px-0" : "justify-start px-3"
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5 mr-2" />
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