import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { 
  Moon,
  Sun,
  Globe,
  LogOut,
  Search,
  Loader2,
  Key,
  User,
  Download
} from 'lucide-react';
import ChangePasswordModal from '@/components/modals/ChangePasswordModal';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';

interface CompanyInfo {
  name: string;
  email: string | null;
  phone: string | null;
}

interface SearchResult {
  id: string;
  type: 'client' | 'contract' | 'invoice' | 'navigation';
  title: string;
  subtitle?: string;
  path?: string;
}

// Navigation items for search
const navigationItems = [
  { id: 'home', title: 'Home', path: '/', keywords: ['home', 'dashboard', 'início', 'painel'] },
  { id: 'schedule', title: 'Schedule', path: '/schedule', keywords: ['schedule', 'agenda', 'calendar', 'calendário', 'jobs', 'appointments'] },
  { id: 'completed-services', title: 'Completed Services', path: '/completed-services', keywords: ['completed', 'services', 'serviços', 'concluídos', 'finished'] },
  { id: 'visit-history', title: 'Visit History', path: '/visit-history', keywords: ['visit', 'history', 'histórico', 'visitas', 'visits', 'past'] },
  { id: 'off-requests', title: 'Off Requests', path: '/off-requests', keywords: ['off', 'requests', 'solicitações', 'time off', 'folga', 'vacation', 'férias'] },
  { id: 'absences', title: 'Absences', path: '/absence-approval', keywords: ['absences', 'ausências', 'absence', 'vacation', 'férias', 'leave', 'approval'] },
  { id: 'availability', title: 'Availability', path: '/availability', keywords: ['availability', 'disponibilidade', 'schedule', 'agenda', 'calendar'] },
  { id: 'activity-log', title: 'Activity Log', path: '/activity-log', keywords: ['activity', 'log', 'atividade', 'registro', 'history', 'histórico', 'audit'] },
  { id: 'notifications', title: 'Notifications', path: '/notifications', keywords: ['notifications', 'notificações', 'alerts', 'alertas', 'messages'] },
  { id: 'clients', title: 'Clients', path: '/clients', keywords: ['clients', 'clientes', 'customers'] },
  { id: 'contracts', title: 'Contracts', path: '/contracts', keywords: ['contracts', 'contratos', 'agreements'] },
  { id: 'calculator', title: 'Estimate', path: '/calculator', keywords: ['estimate', 'calculator', 'estimativa', 'calculadora', 'quote', 'orçamento'] },
  { id: 'invoices', title: 'Invoices', path: '/invoices', keywords: ['invoices', 'faturas', 'billing', 'faturamento'] },
  { id: 'receipts', title: 'Receipts', path: '/receipts', keywords: ['receipts', 'recibos', 'payment receipts', 'comprovantes'] },
  { id: 'ledger', title: 'Ledger', path: '/ledger', keywords: ['ledger', 'razão', 'financial', 'financeiro', 'accounting', 'contabilidade'] },
  { id: 'payroll', title: 'Payroll', path: '/payroll', keywords: ['payroll', 'folha', 'pagamento', 'salário', 'salary', 'wages'] },
  { id: 'company', title: 'Company', path: '/company', keywords: ['company', 'empresa', 'organization', 'settings'] },
  { id: 'users', title: 'Users', path: '/users', keywords: ['users', 'usuários', 'employees', 'funcionários', 'team', 'equipe'] },
  { id: 'settings', title: 'Settings', path: '/settings', keywords: ['settings', 'configurações', 'preferences', 'preferências'] },
];

const TopBar = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({ name: 'Loading...', email: null, phone: null });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserDisplayName = () => {
    if (user?.profile?.first_name || user?.profile?.last_name) {
      return `${user.profile.first_name || ''} ${user.profile.last_name || ''}`.trim();
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = getUserDisplayName();
  
  // Dynamic company info from database
  useEffect(() => {
    if (!user?.profile?.company_id) {
      setCompanyInfo({ name: 'No Company', email: null, phone: null });
      return;
    }

    const fetchCompanyInfo = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('trade_name, legal_name, email, phone')
          .eq('id', user.profile.company_id)
          .maybeSingle();
        
        if (error) {
          if (error.code !== 'PGRST116') {
            console.error('Error fetching company:', error);
          }
          setCompanyInfo({ name: 'Unknown', email: null, phone: null });
          return;
        }
        
        if (data) {
          setCompanyInfo({
            name: data.trade_name || data.legal_name || 'Unknown',
            email: data.email || null,
            phone: data.phone || null
          });
        } else {
          setCompanyInfo({ name: 'Unknown', email: null, phone: null });
        }
      } catch (err) {
        setCompanyInfo({ name: 'Unknown', email: null, phone: null });
      }
    };
    
    fetchCompanyInfo();
    
    if (!user?.profile?.company_id) return;

    const channel = supabase
      .channel(`company-info-${user.profile.company_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${user.profile.company_id}`
        },
        (payload) => {
          const newData = payload.new as { trade_name?: string; legal_name?: string; email?: string; phone?: string };
          setCompanyInfo({
            name: newData.trade_name || newData.legal_name || 'Unknown',
            email: newData.email || null,
            phone: newData.phone || null
          });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.profile?.company_id]);

  // Global search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase().trim();

    // Search navigation items
    for (const navItem of navigationItems) {
      const matchesTitle = navItem.title.toLowerCase().includes(searchTerm);
      const matchesKeywords = navItem.keywords.some(kw => kw.includes(searchTerm));
      
      if (matchesTitle || matchesKeywords) {
        results.push({
          id: navItem.id,
          type: 'navigation',
          title: navItem.title,
          subtitle: 'Page',
          path: navItem.path,
        });
      }
    }

    // Search database
    if (user?.profile?.company_id) {
      try {
        const { data: clients } = await supabase
          .from('clients')
          .select('id, name, email')
          .eq('company_id', user.profile.company_id)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(5);

        if (clients) {
          clients.forEach(client => {
            results.push({
              id: client.id,
              type: 'client',
              title: client.name,
              subtitle: client.email || undefined
            });
          });
        }

        const { data: contracts } = await supabase
          .from('contracts')
          .select('id, contract_number, clients(name)')
          .eq('company_id', user.profile.company_id)
          .or(`contract_number.ilike.%${searchTerm}%`)
          .limit(5);

        if (contracts) {
          contracts.forEach(contract => {
            results.push({
              id: contract.id,
              type: 'contract',
              title: `Contract #${contract.contract_number}`,
              subtitle: (contract.clients as any)?.name || undefined
            });
          });
        }

        const { data: invoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, clients(name)')
          .eq('company_id', user.profile.company_id)
          .or(`invoice_number.ilike.%${searchTerm}%`)
          .limit(5);

        if (invoices) {
          invoices.forEach(invoice => {
            results.push({
              id: invoice.id,
              type: 'invoice',
              title: `Invoice #${invoice.invoice_number}`,
              subtitle: (invoice.clients as any)?.name || undefined
            });
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      }
    }

    setSearchResults(results);
    setIsSearching(false);
  }, [user?.profile?.company_id]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleSearchSelect = (result: SearchResult) => {
    setSearchOpen(false);
    setSearchQuery('');
    
    switch (result.type) {
      case 'navigation':
        navigate(result.path || '/');
        break;
      case 'client':
        navigate('/clients');
        break;
      case 'contract':
        navigate('/contracts');
        break;
      case 'invoice':
        navigate('/invoices');
        break;
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-card border-b border-border" style={{ boxShadow: 'var(--shadow-header)' }}>
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left: Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setSearchOpen(true);
              }}
              onFocus={() => searchQuery && setSearchOpen(true)}
              className="pl-10 h-9 bg-muted/30 border-border text-sm placeholder:text-muted-foreground/60 focus:bg-background"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
            
            {/* Search Results Dropdown */}
            {searchOpen && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    {isSearching ? 'Searching...' : 'No results found.'}
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.filter(r => r.type === 'navigation').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Pages</p>
                        {searchResults.filter(r => r.type === 'navigation').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-3 px-2 py-2 text-sm hover:bg-accent rounded-md cursor-pointer text-left"
                          >
                            <span className="text-muted-foreground">📍</span>
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'client').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Clients</p>
                        {searchResults.filter(r => r.type === 'client').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-3 px-2 py-2 text-sm hover:bg-accent rounded-md cursor-pointer text-left"
                          >
                            <span className="text-muted-foreground">👤</span>
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'contract').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Contracts</p>
                        {searchResults.filter(r => r.type === 'contract').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-3 px-2 py-2 text-sm hover:bg-accent rounded-md cursor-pointer text-left"
                          >
                            <span className="text-muted-foreground">📄</span>
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'invoice').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1 uppercase tracking-wide">Invoices</p>
                        {searchResults.filter(r => r.type === 'invoice').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-3 px-2 py-2 text-sm hover:bg-accent rounded-md cursor-pointer text-left"
                          >
                            <span className="text-muted-foreground">🧾</span>
                            <div className="flex flex-col">
                              <span className="font-medium">{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Download Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-3 text-muted-foreground hover:text-foreground">
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download report</TooltipContent>
          </Tooltip>

          {/* Notifications */}
          <NotificationBell />

          {/* Theme Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleTheme}
                className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
          </Tooltip>

          {/* Language Toggle */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground">
                    <Globe className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Language</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => setLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
                English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('fr')} className={language === 'fr' ? 'bg-accent' : ''}>
                Français
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 gap-2 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline-block text-sm font-medium text-foreground">{displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2 border-b border-border">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)}>
                <Key className="mr-2 h-4 w-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Click outside to close search */}
      {searchOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setSearchOpen(false)}
        />
      )}

      <ChangePasswordModal 
        open={isPasswordModalOpen} 
        onOpenChange={setIsPasswordModalOpen} 
      />
    </header>
  );
};

export default TopBar;