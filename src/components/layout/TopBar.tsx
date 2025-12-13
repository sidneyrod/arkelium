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
  Settings,
  Search,
  Building2,
  Mail,
  Phone,
  Loader2,
  Key,
  User
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  { id: 'clients', title: 'Clients', path: '/clients', keywords: ['clients', 'clientes', 'customers'] },
  { id: 'contracts', title: 'Contracts', path: '/contracts', keywords: ['contracts', 'contratos', 'agreements'] },
  { id: 'completed-services', title: 'Completed Services', path: '/completed-services', keywords: ['completed', 'services', 'serviços', 'concluídos', 'finished'] },
  { id: 'calculator', title: 'Estimate', path: '/calculator', keywords: ['estimate', 'calculator', 'estimativa', 'calculadora', 'quote', 'orçamento'] },
  { id: 'invoices', title: 'Invoices', path: '/invoices', keywords: ['invoices', 'faturas', 'billing', 'faturamento'] },
  { id: 'payroll', title: 'Payroll', path: '/payroll', keywords: ['payroll', 'folha', 'pagamento', 'salário', 'salary', 'wages'] },
  { id: 'absences', title: 'Absences', path: '/absence-approval', keywords: ['absences', 'ausências', 'absence', 'vacation', 'férias', 'leave'] },
  { id: 'activity-log', title: 'Activity Log', path: '/activity-log', keywords: ['activity', 'log', 'atividade', 'registro', 'history', 'histórico', 'audit'] },
  { id: 'company', title: 'Company', path: '/company', keywords: ['company', 'empresa', 'organization', 'settings'] },
  { id: 'users', title: 'Users', path: '/users', keywords: ['users', 'usuários', 'employees', 'funcionários', 'team', 'equipe'] },
  { id: 'settings', title: 'Settings', path: '/settings', keywords: ['settings', 'configurações', 'preferences', 'preferências'] },
];

const TopBar = () => {
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
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

  // Generate breadcrumbs from current path
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === '/' || path === '/dashboard') {
      return [{ label: 'Home', path: '/' }];
    }
    
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/' }];
    
    segments.forEach((segment, index) => {
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label,
        path: '/' + segments.slice(0, index + 1).join('/')
      });
    });
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const displayName = getUserDisplayName();
  
  // Dynamic company info from database
  useEffect(() => {
    // Don't fetch if no user or no company_id
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
          // Silent fail for RLS errors when not authenticated
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
        // Silent fail for network errors
        setCompanyInfo({ name: 'Unknown', email: null, phone: null });
      }
    };
    
    fetchCompanyInfo();
    
    // Only subscribe to realtime updates if we have a company_id
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

  // Global search function with navigation items
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase().trim();

    // 1. Search navigation items first (always available)
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

    // 2. Search database if user has company
    if (user?.profile?.company_id) {
      try {
        // Search clients
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, email')
          .eq('company_id', user.profile.company_id)
          .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(5);

        if (!clientsError && clients) {
          clients.forEach(client => {
            results.push({
              id: client.id,
              type: 'client',
              title: client.name,
              subtitle: client.email || undefined
            });
          });
        }

        // Search contracts
        const { data: contracts, error: contractsError } = await supabase
          .from('contracts')
          .select('id, contract_number, clients(name)')
          .eq('company_id', user.profile.company_id)
          .or(`contract_number.ilike.%${searchTerm}%`)
          .limit(5);

        if (!contractsError && contracts) {
          contracts.forEach(contract => {
            results.push({
              id: contract.id,
              type: 'contract',
              title: `Contract #${contract.contract_number}`,
              subtitle: (contract.clients as any)?.name || undefined
            });
          });
        }

        // Search invoices
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, invoice_number, clients(name)')
          .eq('company_id', user.profile.company_id)
          .or(`invoice_number.ilike.%${searchTerm}%`)
          .limit(5);

        if (!invoicesError && invoices) {
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

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'navigation': return '📍';
      case 'client': return '👤';
      case 'contract': return '📄';
      case 'invoice': return '🧾';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-card/98 dark:bg-[hsl(160,18%,8%)]/95 backdrop-blur-xl border-b border-border/60 dark:border-[hsl(160,12%,14%)]" style={{ boxShadow: 'var(--shadow-header)' }}>
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left: Empty space for layout balance */}
        <div className="flex items-center gap-2 min-w-0" />

        {/* Center: Global Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search clients, contracts, invoices..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setSearchOpen(true);
              }}
              onFocus={() => searchQuery && setSearchOpen(true)}
              className="pl-9 h-9 bg-muted/50 dark:bg-[hsl(160,12%,12%)] border-border dark:border-[hsl(160,12%,18%)] text-sm placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-primary/20"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
            )}
            
            {/* Search Results Dropdown */}
            {searchOpen && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 w-full bg-card dark:bg-[hsl(160,18%,10%)] border border-border dark:border-[hsl(160,12%,16%)] rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {isSearching ? 'Searching...' : 'No results found.'}
                  </div>
                ) : (
                  <div className="py-2">
                    {/* Navigation Results */}
                    {searchResults.filter(r => r.type === 'navigation').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Pages</p>
                        {searchResults.filter(r => r.type === 'navigation').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer text-left"
                          >
                            <span>📍</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
                              <span className="text-xs text-muted-foreground">Navigate to page</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'client').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Clients</p>
                        {searchResults.filter(r => r.type === 'client').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer text-left"
                          >
                            <span>👤</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'contract').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Contracts</p>
                        {searchResults.filter(r => r.type === 'contract').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer text-left"
                          >
                            <span>📄</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.filter(r => r.type === 'invoice').length > 0 && (
                      <div className="px-2 py-1">
                        <p className="text-xs font-medium text-muted-foreground px-2 py-1">Invoices</p>
                        {searchResults.filter(r => r.type === 'invoice').map(result => (
                          <button
                            key={result.id}
                            onClick={() => handleSearchSelect(result)}
                            className="w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent rounded cursor-pointer text-left"
                          >
                            <span>🧾</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
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
          
          {/* Click outside handler */}
          {searchOpen && (
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setSearchOpen(false)}
            />
          )}
        </div>

        {/* Right: Company indicator + Controls */}
        <div className="flex items-center gap-3">
          {/* Company Indicator with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 dark:bg-[hsl(160,12%,12%)] border border-border dark:border-[hsl(160,12%,18%)] cursor-default">
                <Building2 className="h-4 w-4 text-[hsl(45,70%,55%)]" />
                <span className="text-xs font-medium text-muted-foreground max-w-[150px] truncate">{companyInfo.name}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-card dark:bg-[hsl(160,18%,10%)] border-border dark:border-[hsl(160,12%,16%)] p-3">
              <div className="space-y-2">
                <div className="font-medium text-foreground">{companyInfo.name}</div>
                {companyInfo.email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span>{companyInfo.email}</span>
                  </div>
                )}
                {companyInfo.phone && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{companyInfo.phone}</span>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Notification Bell */}
          <NotificationBell />

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent dark:hover:bg-[hsl(160,12%,14%)]">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32 bg-card dark:bg-[hsl(160,18%,10%)] border-border dark:border-[hsl(160,12%,16%)]">
              <DropdownMenuItem 
                onClick={() => setLanguage('en')}
                className={cn(language === 'en' && 'bg-accent')}
              >
                🇬🇧 English
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setLanguage('fr')}
                className={cn(language === 'fr' && 'bg-accent')}
              >
                🇫🇷 Français
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="h-9 w-9 hover:bg-accent dark:hover:bg-[hsl(160,12%,14%)]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-accent dark:hover:bg-[hsl(160,12%,14%)]">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-sm font-medium">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card dark:bg-[hsl(160,18%,10%)] border-border dark:border-[hsl(160,12%,16%)]">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-0.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="bg-border dark:bg-[hsl(160,12%,16%)]" />
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsPasswordModalOpen(true)} className="cursor-pointer">
                <Key className="h-4 w-4 mr-2" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border dark:bg-[hsl(160,12%,16%)]" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                {t.auth.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal 
        open={isPasswordModalOpen} 
        onOpenChange={setIsPasswordModalOpen} 
      />
    </header>
  );
};

export default TopBar;
