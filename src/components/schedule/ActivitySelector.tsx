import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllAccessibleActivities, ACTIVITY_CODES } from "@/hooks/useCompanyActivities";
import { Loader2 } from "lucide-react";

interface ActivitySelectorProps {
  value: string;
  onChange: (value: string, label: string) => void;
  disabled?: boolean;
}

export function ActivitySelector({ value, onChange, disabled }: ActivitySelectorProps) {
  const { data: activities, isLoading } = useAllAccessibleActivities();

  // If no activities configured, show default options
  const hasActivities = activities && activities.length > 0;
  const displayActivities = hasActivities 
    ? activities 
    : Object.values(ACTIVITY_CODES).map(a => ({ code: a.code, label: a.label, companies: [] }));

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Activity / Service Category</label>
      <Select 
        value={value} 
        onValueChange={(code) => {
          const activity = displayActivities.find(a => a.code === code);
          onChange(code, activity?.label || code);
        }}
        disabled={disabled || isLoading}
      >
        <SelectTrigger>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : (
            <SelectValue placeholder="Select activity..." />
          )}
        </SelectTrigger>
        <SelectContent>
          {displayActivities.map((activity) => (
            <SelectItem key={activity.code} value={activity.code}>
              <div className="flex items-center justify-between w-full gap-2">
                <span>{activity.label}</span>
                {hasActivities && activity.companies.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({activity.companies.length} {activity.companies.length === 1 ? 'company' : 'companies'})
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
