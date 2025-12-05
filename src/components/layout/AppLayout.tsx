import { Outlet } from 'react-router-dom';
import TopNavigation from './TopNavigation';
import MobileNavigation from './MobileNavigation';

const AppLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <main className="pb-24 lg:pb-8">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
  );
};

export default AppLayout;
