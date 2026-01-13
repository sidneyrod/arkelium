import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

interface PermissionRouteProps {
  children: React.ReactNode;
  module: string;
  action?: 'view' | 'create' | 'edit' | 'delete';
}

/**
 * Route wrapper that checks dynamic permissions from the database.
 * Admin users always have access (handled by usePermissions hook).
 * Non-admin users are checked against their role permissions.
 */
const PermissionRoute: React.FC<PermissionRouteProps> = ({ 
  children, 
  module, 
  action = 'view' 
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();

  // Show loading while checking auth or permissions
  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check permission - admin always has access (handled in hook)
  if (!hasPermission(module, action)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default PermissionRoute;
