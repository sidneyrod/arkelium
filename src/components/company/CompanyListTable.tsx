import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Archive, 
  RotateCcw,
  Search,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompanyListItem {
  id: string;
  trade_name: string;
  legal_name: string;
  city: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  archived_at: string | null;
}

interface CompanyListTableProps {
  companies: CompanyListItem[];
  activeCompanyId: string | null;
  isLoading: boolean;
  onSelectCompany: (companyId: string) => void;
  onEditCompany: (company: CompanyListItem) => void;
  onArchiveCompany: (companyId: string) => void;
  onRestoreCompany: (companyId: string) => void;
  onRegisterCompany: () => void;
}

export default function CompanyListTable({
  companies,
  activeCompanyId,
  isLoading,
  onSelectCompany,
  onEditCompany,
  onArchiveCompany,
  onRestoreCompany,
  onRegisterCompany
}: CompanyListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy ID:', error);
    }
  };

  const filteredCompanies = companies.filter(company => {
    // Filter by search query
    const matchesSearch = 
      company.trade_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.legal_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (company.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (company.city?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

    // Filter by status
    const matchesStatus = showArchived ? true : company.status !== 'archived';

    return matchesSearch && matchesStatus;
  });

  // Sort: active first, then by trade_name
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    if (a.status === 'archived' && b.status !== 'archived') return 1;
    if (a.status !== 'archived' && b.status === 'archived') return -1;
    return a.trade_name.localeCompare(b.trade_name);
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-16">
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading companies...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Registered Companies
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <Button
              variant={showArchived ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs whitespace-nowrap"
              onClick={() => setShowArchived(!showArchived)}
            >
              {showArchived ? "Hide Archived" : "Show Archived"}
            </Button>
            <Button 
              size="sm" 
              onClick={onRegisterCompany}
              className="gap-1.5 h-8"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Company</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Legal Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">City</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Contact</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Building2 className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'No companies match your search' : 'No companies registered yet'}
                      </p>
                      {!searchQuery && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={onRegisterCompany}
                          className="mt-2"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Register your first company
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCompanies.map((company) => {
                  const isActive = company.id === activeCompanyId;
                  const isArchived = company.status === 'archived';

                  return (
                    <tr 
                      key={company.id} 
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer transition-colors",
                        isActive && "bg-primary/5 hover:bg-primary/10",
                        isArchived && "opacity-60"
                      )}
                      onClick={() => !isArchived && onSelectCompany(company.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{company.trade_name}</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {company.id.slice(0, 8)}...
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyId(company.id);
                              }}
                            >
                              {copiedId === company.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3 text-muted-foreground" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
                        {company.legal_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                        {company.city || '-'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex flex-col text-xs text-muted-foreground">
                          {company.email && <span>{company.email}</span>}
                          {company.phone && <span>{company.phone}</span>}
                          {!company.email && !company.phone && <span>-</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={isActive ? "default" : isArchived ? "secondary" : "outline"}
                          className={cn(
                            "text-[10px] uppercase tracking-wider",
                            isActive && "bg-primary"
                          )}
                        >
                          {isActive ? "Active" : isArchived ? "Archived" : "Available"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onEditCompany(company)}
                            title="Edit company"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isArchived ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                              onClick={() => onRestoreCompany(company.id)}
                              title="Restore company"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-amber-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950"
                              onClick={() => onArchiveCompany(company.id)}
                              title="Archive company"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {sortedCompanies.length} {sortedCompanies.length === 1 ? 'company' : 'companies'} 
            {showArchived && companies.filter(c => c.status === 'archived').length > 0 && 
              ` (${companies.filter(c => c.status === 'archived').length} archived)`
            }
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
