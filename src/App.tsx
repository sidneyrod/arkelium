import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/company" element={<Company />} />
                <Route path="/users" element={<Users />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/contracts" element={<Contracts />} />
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/calculator" element={<Calculator />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
