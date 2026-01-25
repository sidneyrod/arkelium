import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccessibleCompanies, AccessibleCompany } from '@/hooks/useAccessibleCompanies';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface CompanyFilterProps {
  value: string | 'all';
  onChange: (companyId: string | 'all') => void;
  showAllOption?: boolean;
  allLabel?: string;
  /** Placeholder text when no company is selected */
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Only show companies with status = 'active' */
  activeOnly?: boolean;
}

/**
 * Reusable company filter component for module-level filtering.
 * Shows all accessible companies for the current user.
 */
export function CompanyFilter({
  value,
  onChange,
  showAllOption = false,
  allLabel = 'All Companies',
  placeholder = 'Select Company',
  className,
  disabled = false,
  activeOnly = true,
}: CompanyFilterProps) {
  const { companies, activeCompanies, isLoading } = useAccessibleCompanies();
  
  const displayCompanies: AccessibleCompany[] = activeOnly ? activeCompanies : companies;

  if (isLoading) {
    return <Skeleton className={cn("h-9 w-[180px]", className)} />;
  }

  // If only one company and no "all" option, just display static text
  if (displayCompanies.length === 1 && !showAllOption) {
    const company = displayCompanies[0];
    return (
      <div className={cn("flex items-center gap-2 px-3 h-9 border border-border rounded-md bg-background", className)}>
        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
          {company.company_code}
        </div>
        <span className="text-sm font-medium truncate">{company.trade_name}</span>
      </div>
    );
  }

  // If no companies, show placeholder
  if (displayCompanies.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 px-3 h-9 border border-border rounded-md bg-muted text-muted-foreground", className)}>
        <Building2 className="h-4 w-4" />
        <span className="text-sm">No companies</span>
      </div>
    );
  }

  return (
    <Select 
      value={value} 
      onValueChange={onChange} 
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-[180px] h-9", className)}>
        <SelectValue placeholder={placeholder}>
          {!value || value === '' ? (
            <span className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{placeholder}</span>
            </span>
          ) : value === 'all' ? (
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{allLabel}</span>
            </span>
          ) : (
            (() => {
              const selected = displayCompanies.find(c => c.id === value);
              if (!selected) return placeholder;
              return (
                <span className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                    {selected.company_code}
                  </span>
                  <span className="truncate">{selected.trade_name}</span>
                </span>
              );
            })()
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-popover">
        {showAllOption && (
          <SelectItem value="all">
            <span className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>{allLabel}</span>
            </span>
          </SelectItem>
        )}
        {displayCompanies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            <span className="flex items-center gap-2">
              <span className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
                {company.company_code}
              </span>
              <span>{company.trade_name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default CompanyFilter;
