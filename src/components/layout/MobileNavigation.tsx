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
  Calculator, 
  Wallet,
  Settings,
  Menu,
  ClipboardList,
  CalendarOff,
  Receipt,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const MobileNavigation = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openTab } = useWorkspaceStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

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
    { path: '/calculator', label: 'Estimate', icon: Calculator },
    { path: '/payroll', label: t.nav.payroll, icon: Wallet },
    ...(isManagerOrAdmin ? [{ path: '/activity-log', label: t.nav.activityLog, icon: ClipboardList }] : []),
    ...(isManagerOrAdmin ? [{ path: '/absence-approval', label: 'Absences', icon: CalendarOff }] : []),
    { path: '/settings', label: t.nav.settings, icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleNavClick = (item: { path: string; label: string }) => {
    openTab(item.path, item.label);
    navigate(item.path);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.slice(0, 4).map((item) => (
          <a
            key={item.path}
            href={item.path}
            onClick={(e) => {
              e.preventDefault();
              handleNavClick(item);
            }}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]',
              isActive(item.path)
                ? 'text-primary' 
                : 'text-muted-foreground'
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
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
            <div className="grid grid-cols-3 gap-4 py-6">
              {navItems.slice(4).map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick(item);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors',
                    isActive(item.path)
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-xs font-medium">{item.label}</span>
                </a>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileNavigation;
