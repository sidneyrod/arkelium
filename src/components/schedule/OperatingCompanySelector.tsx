import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useActiveCompanyStore } from "@/stores/activeCompanyStore";
import { useAllAccessibleActivities } from "@/hooks/useCompanyActivities";
import { Building2, AlertCircle } from "lucide-react";

interface OperatingCompanySelectorProps {
  value: string;
  onChange: (companyId: string, companyName: string, organizationId?: string) => void;
  activityCode: string;
  disabled?: boolean;
}

export function OperatingCompanySelector({ 
  value, 
  onChange, 
  activityCode,
  disabled 
}: OperatingCompanySelectorProps) {
  const { activeCompanyId, activeCompanyName } = useActiveCompanyStore();
  const { data: activities } = useAllAccessibleActivities();
  const [showSelector, setShowSelector] = useState(false);

  // Find companies that have the selected activity
  const activity = activities?.find(a => a.code === activityCode);
  const compatibleCompanies = activity?.companies || [];

  // Check if active company is compatible
  const activeCompanyIsCompatible = compatibleCompanies.some(c => c.id === activeCompanyId);
  
  // If only one compatible company, auto-select it
  const singleCompany = compatibleCompanies.length === 1 ? compatibleCompanies[0] : null;
  
  // Determine effective company
  const effectiveCompanyId = value || (activeCompanyIsCompatible ? activeCompanyId : singleCompany?.id) || '';
  const effectiveCompanyName = compatibleCompanies.find(c => c.id === effectiveCompanyId)?.trade_name 
    || (effectiveCompanyId === activeCompanyId ? activeCompanyName : '');

  // No compatible companies
  if (compatibleCompanies.length === 0) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Operating Company</label>
        <div className="flex items-center gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">No companies available for this activity</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Contact your administrator to enable this activity for a company.
        </p>
      </div>
    );
  }

  // Single company - show read-only with option to change if there are other options
  if (singleCompany && !showSelector) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Operating Company</label>
        <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{singleCompany.trade_name}</span>
          </div>
        </div>
      </div>
    );
  }

  // Multiple companies - show selector
  if (showSelector || compatibleCompanies.length > 1) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Operating Company</label>
        <Select 
          value={effectiveCompanyId}
          onValueChange={(id) => {
            const company = compatibleCompanies.find(c => c.id === id);
            onChange(id, company?.trade_name || '', company?.organization_id || undefined);
          }}
          disabled={disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select company..." />
          </SelectTrigger>
          <SelectContent>
            {compatibleCompanies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{company.trade_name}</span>
                  {company.id === activeCompanyId && (
                    <span className="text-xs text-primary">(Active)</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Default: show current company with change option
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Operating Company</label>
      <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{effectiveCompanyName}</span>
        </div>
        {compatibleCompanies.length > 1 && (
          <Button 
            type="button" 
            variant="link" 
            size="sm" 
            className="text-xs h-auto p-0"
            onClick={() => setShowSelector(true)}
          >
            Change
          </Button>
        )}
      </div>
    </div>
  );
}
