import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNavigation from './MobileNavigation';
import WorkspaceTabs from './WorkspaceTabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Map paths to labels
const getPageLabel = (path: string, t: any): string => {
  const pathMap: Record<string, string> = {
    '/': t?.nav?.dashboard || 'Dashboard',
    '/company': t?.nav?.company || 'Company',
    '/users': t?.nav?.users || 'Users',
    '/access-roles': 'Access & Roles',
    '/clients': t?.nav?.clients || 'Clients',
    '/contracts': t?.nav?.contracts || 'Contracts',
    '/schedule': t?.nav?.schedule || 'Schedule',
    '/invoices': 'Invoices',
    '/completed-services': 'Completed Services',
    '/calculator': 'Estimate',
    '/payroll': t?.nav?.payroll || 'Payroll',
    '/activity-log': t?.nav?.activityLog || 'Activity Log',
    '/absence-approval': 'Absences',
    '/settings': t?.nav?.settings || 'Settings',
    '/notifications': t?.notifications?.title || 'Notifications',
    '/visit-history': t?.nav?.visitHistory || 'Visit History',
    '/off-requests': t?.nav?.offRequests || 'Off Requests',
    '/my-off-requests': t?.nav?.offRequests || 'Off Requests',
    '/cleaner-off-requests': t?.nav?.offRequests || 'Off Requests',
    '/availability': t?.nav?.availability || 'Availability',
    '/absences': t?.nav?.absences || 'Absences',
    '/my-payroll': t?.nav?.myPayroll || 'My Payroll',
    '/cleaner-payroll': t?.nav?.myPayroll || 'My Payroll',
    '/payments': 'Payments & Collections',
  };
  return pathMap[path] || 'Page';
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { openTab, activeTabId, setCurrentUser, currentUserId, userTabs } = useWorkspaceStore();
  const hasRestoredSession = useRef(false);

  // Get current user's tabs
  const tabs = currentUserId && userTabs[currentUserId] ? userTabs[currentUserId] : [];

  // Set current user in workspace store when user changes
  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
    } else {
      setCurrentUser(null);
    }
  }, [user?.id, setCurrentUser]);

  // On mount, restore the active tab's route if needed
  useEffect(() => {
    if (hasRestoredSession.current) return;
    hasRestoredSession.current = true;
    
    // Find the active tab
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    
    // If we have an active tab and it's not the current location, navigate to it
    if (activeTab && activeTab.path !== location.pathname) {
      navigate(activeTab.path, { replace: true });
    }
  }, []);

  // Auto-open tab when navigating directly to a URL
  useEffect(() => {
    const currentPath = location.pathname;
    const fullPath = location.pathname + location.search;

    // Find existing tab by comparing base path (without query params)
    const existingTab = tabs.find(tab => {
      const tabBasePath = tab.path.split('?')[0];
      return tabBasePath === currentPath;
    });

    const label = getPageLabel(currentPath, t);

    if (!existingTab) {
      openTab(fullPath, label);
      return;
    }

    // Avoid infinite update loops: only sync when something actually changed
    const shouldSync =
      existingTab.path !== fullPath ||
      existingTab.label !== label ||
      existingTab.id !== activeTabId;

    if (shouldSync) {
      openTab(fullPath, label);
    }
  }, [location.pathname, location.search, openTab, tabs, t, activeTabId]);

  return (
    <TooltipProvider>
      <div className="min-h-[calc(100vh/0.85)] bg-background flex w-full" style={{ zoom: 0.85 }}>
        {/* Sidebar - Desktop only */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <WorkspaceTabs />
          <main className="flex-1 pb-16 lg:pb-4 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
        
        {/* Mobile Navigation */}
        <MobileNavigation />
      </div>
    </TooltipProvider>
  );
};

export default AppLayout;
