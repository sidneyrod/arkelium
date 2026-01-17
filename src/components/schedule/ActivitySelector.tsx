import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllAccessibleActivities } from "@/hooks/useCompanyActivities";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";

interface ActivitySelectorProps {
  value: string;
  onChange: (value: string, label: string) => void;
  disabled?: boolean;
}

export function ActivitySelector({ value, onChange, disabled }: ActivitySelectorProps) {
  const { data: activities, isLoading } = useAllAccessibleActivities();

  const hasActivities = activities && activities.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Activity / Service Category</label>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading activities...</span>
        </div>
      </div>
    );
  }

  if (!hasActivities) {
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Activity / Service Category</label>
        <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm">
            <span className="font-medium">No activities configured.</span>
            <span className="block text-xs mt-1">
              Go to{' '}
              <Link 
                to="/company" 
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                <Settings className="h-3 w-3" />
                Company Settings → Activities
              </Link>
              {' '}to add service types.
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">Activity / Service Category</label>
      <Select 
        value={value} 
        onValueChange={(code) => {
          const activity = activities.find(a => a.code === code);
          onChange(code, activity?.label || code);
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select activity..." />
        </SelectTrigger>
        <SelectContent>
          {activities.map((activity) => (
            <SelectItem key={activity.code} value={activity.code}>
              <div className="flex items-center justify-between w-full gap-2">
                <span>{activity.label}</span>
                {activity.companies.length > 0 && (
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
