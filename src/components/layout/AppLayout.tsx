import { Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
  const { t } = useLanguage();
  const { openTab, tabs } = useWorkspaceStore();

  // Auto-open tab when navigating directly to a URL
  useEffect(() => {
    const currentPath = location.pathname;
    const existingTab = tabs.find(tab => tab.path === currentPath);
    
    if (!existingTab) {
      const label = getPageLabel(currentPath, t);
      openTab(currentPath, label);
    }
  }, [location.pathname, openTab, tabs, t]);

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
