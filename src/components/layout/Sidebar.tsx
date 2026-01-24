import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
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
  Shield,
  Clock,
  Settings2
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
  const { canView, loading: permissionsLoading } = usePermissions();
  const { openTab } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  
  // Exclusive accordion - only one group open at a time
  const [openGroup, setOpenGroup] = useState<string | null>('Operations');

  // Auto-collapse on smaller desktop screens + expose sidebar width as CSS var
  useEffect(() => {
    const updateLayout = () => {
      const width = window.innerWidth;

      // Auto-collapse on smaller desktop screens
      if (width < 1280 && width >= 1024) {
        setCollapsed(true);
      }

      const isDesktop = width >= 1024;
      const sidebarWidth = isDesktop ? (collapsed ? '56px' : '208px') : '0px';
      document.documentElement.style.setProperty('--app-sidebar-width', sidebarWidth);
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [collapsed]);

  // Auto-expand group when navigating to a page within it
  useEffect(() => {
    const path = location.pathname;
    
    // Check which group contains the active path
    if (path === '/' || path.startsWith('/schedule') || path.startsWith('/completed-services') || 
        path.startsWith('/visit-history') || path.startsWith('/off-requests') || 
        path.startsWith('/my-off-requests') || path.startsWith('/activity-log') || 
        path.startsWith('/notifications')) {
      if (path !== '/') setOpenGroup('Operations');
    } else if (path.startsWith('/clients') || path.startsWith('/contracts') || path.startsWith('/calculator')) {
      setOpenGroup('Clients');
    } else if (path.startsWith('/financial') || path.startsWith('/invoices') || 
               path.startsWith('/receipts') || path.startsWith('/work-time-tracking') || 
               path.startsWith('/my-payroll')) {
      setOpenGroup('Financial');
    } else if (path.startsWith('/access-roles') || path.startsWith('/users') || 
               path.startsWith('/company') || path.startsWith('/settings')) {
      setOpenGroup('Administration');
    }
  }, [location.pathname]);

  const handleGroupToggle = (groupName: string) => {
    setOpenGroup(prev => prev === groupName ? null : groupName);
  };

  // Role checks
  const isAdmin = hasRole(['admin']);
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
  
  if (canView('schedule') || isCleaner) {
    operationsItems.push({ path: '/schedule', label: t.nav.schedule, icon: Calendar });
  }
  
  if (canView('completed_services')) {
    operationsItems.push({ path: '/completed-services', label: 'Completed Services', icon: CheckCircle });
  }
  
  operationsItems.push({ path: '/visit-history', label: 'Visit History', icon: MapPin });
  
  // Field Requests
  if (canView('off_requests') && !isCleaner) {
    operationsItems.push({ path: '/off-requests', label: 'Field Requests', icon: CalendarOff });
  } else if (isCleaner) {
    operationsItems.push({ path: '/my-off-requests', label: 'Field Requests', icon: CalendarOff });
  }

  // =============================
  // MODULE 2: CLIENTS
  // =============================
  const clientsItems: MenuItem[] = [];
  
  if (canView('clients')) {
    clientsItems.push({ path: '/clients', label: t.nav.clients, icon: UserCircle });
  }
  if (canView('contracts')) {
    clientsItems.push({ path: '/contracts', label: t.nav.contracts, icon: FileText });
  }
  if (canView('estimates')) {
    clientsItems.push({ path: '/calculator', label: 'Estimates', icon: FileSpreadsheet });
  }

  // =====================
  // MODULE 3: FINANCIAL
  // =====================
  const financialItems: MenuItem[] = [];
  
  if (canView('invoices')) {
    financialItems.push({ path: '/invoices', label: 'Invoices', icon: FileText });
  }
  
  if (canView('receipts')) {
    financialItems.push({ path: '/receipts', label: 'Receipts', icon: Receipt });
  }
  
  if (canView('payments_collections')) {
    financialItems.push({ path: '/payments', label: 'Payments & Collections', icon: DollarSign });
  }
  
  if (canView('ledger')) {
    financialItems.push({ path: '/financial', label: 'Ledger', icon: BookOpen });
  }
  
  // Work & Time Tracking - admin only
  if (isAdmin && canView('payroll')) {
    financialItems.push({ path: '/work-time-tracking', label: 'Work & Time Tracking', icon: Clock });
  }
  
  // Cleaner's own view
  if (isCleaner) {
    financialItems.push({ path: '/my-payroll', label: t.payroll.myWorkSummary, icon: Wallet });
  }

  // ===========================
  // MODULE 4: ADMINISTRATION
  // ===========================
  const adminItems: MenuItem[] = [];
  
  if (isAdmin) {
    adminItems.push({ path: '/company', label: 'Company Profile', icon: Building2 });
    adminItems.push({ path: '/users', label: t.nav.users, icon: Users });
    adminItems.push({ path: '/access-roles', label: 'Access & Roles', icon: Shield });
    adminItems.push({ path: '/settings', label: t.nav.settings, icon: Settings });
    if (canView('activity_log')) {
      adminItems.push({ path: '/activity-log', label: 'Audit & Activity Log', icon: ClipboardList });
    }
  }

  const renderHomeLink = () => {
    const active = isActive('/');
    
    const linkContent = (
      <a
        href="/"
        onClick={handleNavClick('/', 'Dashboard')}
        className={cn(
          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 cursor-pointer",
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
        collapsed ? "w-14" : "w-52"
      )} style={{ height: 'calc(100vh / 0.80)' }}>
        {/* Logo Section */}
        <div className={cn(
          "flex items-center h-14 px-3 shrink-0 border-b border-border",
          collapsed ? "justify-center px-2" : "justify-start gap-2"
        )}>
          <div className={cn(
            "shrink-0 flex items-center justify-center",
            collapsed ? "w-7 h-7" : "w-6 h-6"
          )}>
            <img 
              src={arkeliumLogo} 
              alt="Arkelium" 
              className="w-full h-full object-contain"
            />
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold tracking-tight text-foreground">
              Arkelium
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2.5">
          <div className="space-y-0.5">
            {/* Dashboard */}
            {renderHomeLink()}

            {/* Module 1: Operations */}
            {operationsItems.length > 0 && (
              <SidebarMenuGroup
                title="Operations"
                icon={Briefcase}
                items={operationsItems}
                collapsed={collapsed}
                isOpen={openGroup === 'Operations'}
                onToggle={() => handleGroupToggle('Operations')}
              />
            )}

            {/* Module 2: Clients */}
            {clientsItems.length > 0 && (
              <SidebarMenuGroup
                title="Clients"
                icon={Handshake}
                items={clientsItems}
                collapsed={collapsed}
                isOpen={openGroup === 'Clients'}
                onToggle={() => handleGroupToggle('Clients')}
              />
            )}

            {/* Module 3: Financial */}
            {financialItems.length > 0 && (
              <SidebarMenuGroup
                title="Financial"
                icon={DollarSign}
                items={financialItems}
                collapsed={collapsed}
                isOpen={openGroup === 'Financial'}
                onToggle={() => handleGroupToggle('Financial')}
              />
            )}

            {/* Module 4: Administration */}
            {adminItems.length > 0 && (
              <SidebarMenuGroup
                title="Administration"
                icon={Settings2}
                items={adminItems}
                collapsed={collapsed}
                isOpen={openGroup === 'Administration'}
                onToggle={() => handleGroupToggle('Administration')}
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
