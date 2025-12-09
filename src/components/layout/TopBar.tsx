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
  Loader2
} from 'lucide-react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
  type: 'client' | 'contract' | 'invoice';
  title: string;
  subtitle?: string;
}

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
    const fetchCompanyInfo = async () => {
      if (!user?.profile?.company_id) {
        setCompanyInfo({ name: 'No Company', email: null, phone: null });
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('trade_name, legal_name, email, phone')
          .eq('id', user.profile.company_id)
          .single();
        
        if (error) {
          console.error('Error fetching company:', error);
          setCompanyInfo({ name: 'Unknown', email: null, phone: null });
          return;
        }
        
        setCompanyInfo({
          name: data?.trade_name || data?.legal_name || 'Unknown',
          email: data?.email || null,
          phone: data?.phone || null
        });
      } catch (err) {
        console.error('Error fetching company info:', err);
        setCompanyInfo({ name: 'Unknown', email: null, phone: null });
      }
    };
    
    fetchCompanyInfo();
    
    // Subscribe to realtime updates for company changes
    const channel = supabase
      .channel('company-info-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${user?.profile?.company_id}`
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
    if (!query.trim() || !user?.profile?.company_id) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: SearchResult[] = [];
    const searchTerm = query.toLowerCase();

    try {
      // Search clients - use text search pattern
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, email')
        .eq('company_id', user.profile.company_id)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5);

      if (clientsError) {
        console.error('Clients search error:', clientsError);
      }

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

      // Search contracts - search by contract number or client name
      const { data: contracts, error: contractsError } = await supabase
        .from('contracts')
        .select('id, contract_number, clients(name)')
        .eq('company_id', user.profile.company_id)
        .or(`contract_number.ilike.%${searchTerm}%`)
        .limit(5);

      if (contractsError) {
        console.error('Contracts search error:', contractsError);
      }

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

      // Search invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, invoice_number, clients(name)')
        .eq('company_id', user.profile.company_id)
        .or(`invoice_number.ilike.%${searchTerm}%`)
        .limit(5);

      if (invoicesError) {
        console.error('Invoices search error:', invoicesError);
      }

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

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
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
      case 'client': return '👤';
      case 'contract': return '📄';
      case 'invoice': return '🧾';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full h-14 bg-card/95 dark:bg-[hsl(160,18%,8%)]/95 backdrop-blur-xl border-b border-border dark:border-[hsl(160,12%,14%)]">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left: Empty space for layout balance */}
        <div className="flex items-center gap-2 min-w-0" />

        {/* Center: Global Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
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
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-card dark:bg-[hsl(160,18%,10%)] border-border dark:border-[hsl(160,12%,16%)]" align="start">
              <Command className="bg-transparent">
                <CommandList>
                  <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                    {searchQuery ? 'No results found.' : 'Type to search...'}
                  </CommandEmpty>
                  {searchResults.length > 0 && (
                    <>
                      <CommandGroup heading="Clients">
                        {searchResults.filter(r => r.type === 'client').map(result => (
                          <CommandItem key={result.id} onSelect={() => handleSearchSelect(result)} className="cursor-pointer">
                            <span className="mr-2">{getResultIcon(result.type)}</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Contracts">
                        {searchResults.filter(r => r.type === 'contract').map(result => (
                          <CommandItem key={result.id} onSelect={() => handleSearchSelect(result)} className="cursor-pointer">
                            <span className="mr-2">{getResultIcon(result.type)}</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                      <CommandGroup heading="Invoices">
                        {searchResults.filter(r => r.type === 'invoice').map(result => (
                          <CommandItem key={result.id} onSelect={() => handleSearchSelect(result)} className="cursor-pointer">
                            <span className="mr-2">{getResultIcon(result.type)}</span>
                            <div className="flex flex-col">
                              <span>{result.title}</span>
                              {result.subtitle && <span className="text-xs text-muted-foreground">{result.subtitle}</span>}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {t.nav.settings}
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border dark:bg-[hsl(160,12%,16%)]" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                {t.auth.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
