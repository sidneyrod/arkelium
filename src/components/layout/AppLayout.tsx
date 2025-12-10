import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNavigation from './MobileNavigation';
import WorkspaceTabs from './WorkspaceTabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useLanguage } from '@/contexts/LanguageContext';

// Map paths to labels
const getPageLabel = (path: string, t: any): string => {
  const pathMap: Record<string, string> = {
    '/': t?.nav?.home || 'Dashboard',
    '/company': t?.nav?.company || 'Company',
    '/users': t?.nav?.users || 'Users',
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
  };
  return pathMap[path] || 'Page';
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { openTab, tabs, activeTabId } = useWorkspaceStore();
  const hasRestoredSession = useRef(false);

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
    
    if (!existingTab) {
      const label = getPageLabel(currentPath, t);
      openTab(fullPath, label);
    } else if (existingTab.id !== activeTabId) {
      // Activate the existing tab and update its path with new query params
      openTab(fullPath, existingTab.label);
    }
  }, [location.pathname, location.search, openTab, tabs, t, activeTabId]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex w-full">
        {/* Sidebar - Desktop only */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <WorkspaceTabs />
          <main className="flex-1 pb-24 lg:pb-8 overflow-x-hidden">
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
