import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth, UserRole } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Company from "./pages/Company";
import Users from "./pages/Users";
import Clients from "./pages/Clients";
import Contracts from "./pages/Contracts";
import Schedule from "./pages/Schedule";
import Calculator from "./pages/Calculator";
import Payroll from "./pages/Payroll";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ActivityLog from "./pages/ActivityLog";
import Invoices from "./pages/Invoices";
import CompletedServices from "./pages/CompletedServices";
import NotFound from "./pages/NotFound";
import AbsenceApproval from "./pages/AbsenceApproval";
import VisitHistory from "./pages/VisitHistory";

const queryClient = new QueryClient();

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check role-based access if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0 && !hasRole(allowedRoles)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Admin-only routes wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { hasRole, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!hasRole(['admin'])) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Admin or Manager routes wrapper
const AdminManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { hasRole, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  if (!hasRole(['admin', 'manager'])) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        {/* Dashboard - accessible to all authenticated users */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Schedule - accessible to all (cleaners see only their jobs via RLS) */}
        <Route path="/schedule" element={<Schedule />} />
        
        {/* Admin-only routes */}
        <Route path="/company" element={<AdminRoute><Company /></AdminRoute>} />
        <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />
        <Route path="/activity-log" element={<AdminManagerRoute><ActivityLog /></AdminManagerRoute>} />
        <Route path="/absence-approval" element={<AdminManagerRoute><AbsenceApproval /></AdminManagerRoute>} />
        <Route path="/visit-history" element={<ProtectedRoute><VisitHistory /></ProtectedRoute>} />
        
        {/* Admin/Manager routes */}
        <Route path="/clients" element={<AdminManagerRoute><Clients /></AdminManagerRoute>} />
        <Route path="/contracts" element={<AdminManagerRoute><Contracts /></AdminManagerRoute>} />
        <Route path="/invoices" element={<AdminManagerRoute><Invoices /></AdminManagerRoute>} />
        <Route path="/completed-services" element={<AdminManagerRoute><CompletedServices /></AdminManagerRoute>} />
        <Route path="/calculator" element={<AdminManagerRoute><Calculator /></AdminManagerRoute>} />
        <Route path="/payroll" element={<AdminRoute><Payroll /></AdminRoute>} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;