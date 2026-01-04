import { useNavigate, useLocation } from 'react-router-dom';
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
  Menu,
  ClipboardList,
  CalendarOff,
  Receipt,
  CheckCircle,
  MapPin,
  Briefcase,
  Handshake,
  DollarSign,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

interface MenuItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MenuModule {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
}

const MobileNavigation = () => {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const { openTab } = useWorkspaceStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<string[]>(['Operations']);

  const isAdmin = hasRole(['admin']);
  const isAdminOrManager = hasRole(['admin', 'manager']);
  const isCleaner = hasRole(['cleaner']);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: MenuItem) => {
    openTab(item.path, item.label);
    navigate(item.path);
    setOpen(false);
  };

  const toggleModule = (title: string) => {
    setExpandedModules(prev => 
      prev.includes(title) 
        ? prev.filter(m => m !== title) 
        : [...prev, title]
    );
  };

  // Build modules based on role
  const modules: MenuModule[] = [];

  // Module 1: Operations
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
  modules.push({ title: 'Operations', icon: Briefcase, items: operationsItems });

  // Module 2: Clients & Contracts (Admin/Manager only)
  if (isAdminOrManager) {
    modules.push({
      title: 'Clients & Contracts',
      icon: Handshake,
      items: [
        { path: '/clients', label: t.nav.clients, icon: UserCircle },
        { path: '/contracts', label: t.nav.contracts, icon: FileText },
        { path: '/calculator', label: 'Estimate', icon: FileSpreadsheet },
      ]
    });
  }

  // Module 3: Financial (Admin/Manager for invoices, Admin only for payroll)
  const financialItems: MenuItem[] = [];
  if (isAdminOrManager) {
    financialItems.push({ path: '/invoices', label: 'Invoices', icon: Receipt });
  }
  if (isAdmin) {
    financialItems.push({ path: '/payroll', label: t.nav.payroll, icon: Wallet });
  }
  if (financialItems.length > 0) {
    modules.push({ title: 'Financial', icon: DollarSign, items: financialItems });
  }

  // Module 4: Company Management (Admin only)
  if (isAdmin) {
    modules.push({
      title: 'Company',
      icon: Building2,
      items: [
        { path: '/users', label: t.nav.users, icon: Users },
        { path: '/company', label: t.nav.company, icon: Building2 },
        { path: '/settings', label: t.nav.settings, icon: Settings },
      ]
    });
  }

  // Quick access items for bottom bar (Home + first 3 items from Operations)
  const quickAccessItems: MenuItem[] = [
    { path: '/', label: t.nav.home, icon: Home },
    { path: '/schedule', label: t.nav.schedule, icon: Calendar },
    { path: '/visit-history', label: 'Visits', icon: MapPin },
  ];

  if (isAdminOrManager) {
    quickAccessItems.push({ path: '/clients', label: t.nav.clients, icon: UserCircle });
  } else if (isCleaner) {
    quickAccessItems.push({ path: '/my-off-requests', label: 'Off Requests', icon: CalendarOff });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2">
        {quickAccessItems.map((item) => (
          <a
            key={item.path}
            href={item.path}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(item);
            }}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]',
              isActive(item.path) ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </a>
        ))}
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="flex flex-col items-center gap-1 h-auto py-2 px-3">
              <Menu className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">{t.common.more}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-2xl overflow-y-auto">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left">Menu</SheetTitle>
            </SheetHeader>
            
            {/* Home */}
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick({ path: '/', label: t.nav.home, icon: Home });
              }}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-2',
                isActive('/') ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
              )}
            >
              <Home className="h-5 w-5" />
              <span className="font-medium">{t.nav.home}</span>
            </a>

            {/* Modules */}
            <div className="space-y-2">
              {modules.map((module) => {
                const isExpanded = expandedModules.includes(module.title);
                const hasActiveItem = module.items.some(item => isActive(item.path));
                
                return (
                  <Collapsible 
                    key={module.title} 
                    open={isExpanded || hasActiveItem}
                    onOpenChange={() => toggleModule(module.title)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors",
                          hasActiveItem 
                            ? "bg-primary/5 text-primary" 
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <module.icon className="h-5 w-5" />
                          <span className="font-medium">{module.title}</span>
                        </div>
                        <ChevronRight 
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            (isExpanded || hasActiveItem) && "rotate-90"
                          )} 
                        />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="ml-6 mt-1 space-y-1 border-l border-border/50 pl-4">
                        {module.items.map((item) => (
                          <a
                            key={item.path}
                            href={item.path}
                            onClick={(e) => {
                              e.preventDefault();
                              handleNavClick(item);
                            }}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                              isActive(item.path) 
                                ? 'bg-primary/10 text-primary font-medium' 
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="text-sm">{item.label}</span>
                          </a>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileNavigation;
