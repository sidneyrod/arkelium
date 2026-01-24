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

const RESTORED_SESSION_KEY = 'workspace-session-restored';

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
    '/work-time-tracking': 'Work & Time Tracking',
    '/financial': 'Ledger',
    '/receipts': 'Receipts',
    '/activity-log': t?.nav?.activityLog || 'Activity Log',
    '/absence-approval': 'Absences',
    '/settings': t?.nav?.settings || 'Settings',
    '/notifications': t?.notifications?.title || 'Notifications',
    '/visit-history': t?.nav?.visitHistory || 'Visit History',
    '/off-requests': t?.nav?.offRequests || 'Field Requests',
    '/my-off-requests': t?.nav?.offRequests || 'Field Requests',
    '/cleaner-off-requests': t?.nav?.offRequests || 'Field Requests',
    '/my-payroll': t?.payroll?.myWorkSummary || 'My Work Summary',
    '/cleaner-payroll': t?.payroll?.myWorkSummary || 'My Work Summary',
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
  const isSessionReady = useRef(false);

  // Get current user's tabs
  const tabs = currentUserId && userTabs[currentUserId] ? userTabs[currentUserId] : [];

  // Set current user and restore session
  useEffect(() => {
    if (user?.id) {
      setCurrentUser(user.id);
      
      // Check if already restored for this user in this browser session
      const restoredForUser = sessionStorage.getItem(RESTORED_SESSION_KEY);
      
      if (restoredForUser !== user.id) {
        // Use requestAnimationFrame to ensure state has been updated
        requestAnimationFrame(() => {
          const currentState = useWorkspaceStore.getState();
          const userTabsNow = currentState.userTabs[user.id] || [];
          const activeTabNow = currentState.activeTabId;
          
          const tabToRestore = userTabsNow.find(tab => tab.id === activeTabNow);
          
          if (tabToRestore) {
            // ALWAYS navigate to the active tab, regardless of current path
            navigate(tabToRestore.path, { replace: true });
          }
          
          // Mark as restored for this user in this session
          sessionStorage.setItem(RESTORED_SESSION_KEY, user.id);
          isSessionReady.current = true;
        });
      } else {
        // Already restored in this session
        isSessionReady.current = true;
      }
    } else {
      setCurrentUser(null);
      sessionStorage.removeItem(RESTORED_SESSION_KEY);
      isSessionReady.current = false;
    }
  }, [user?.id, setCurrentUser, navigate]);

  // Auto-open tab when navigating directly to a URL
  useEffect(() => {
    // Don't sync tabs until session is ready
    if (!isSessionReady.current) return;
    
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
      <div className="min-h-[calc(100vh/0.75)] bg-background flex w-full" style={{ zoom: 0.75 }}>
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
