import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon, Plus } from 'lucide-react';

interface PageHeaderProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
  };
  className?: string;
  children?: React.ReactNode;
}

const PageHeader = ({ title, description, action, className, children }: PageHeaderProps) => {
  // If no title/description and only action, render just the action aligned right
  if (!title && !description && (action || children)) {
    return (
      <div className={cn("flex items-center justify-end gap-2", className)}>
        {children}
        {action && (
          <Button onClick={action.onClick} size="sm" className="gap-1.5 h-8">
            {action.icon ? <action.icon className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      {(title || description) && (
        <div className="space-y-0">
          {title && <h1 className="text-lg font-semibold tracking-tight">{title}</h1>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        {children}
        {action && (
          <Button onClick={action.onClick} size="sm" className="gap-1.5 h-8">
            {action.icon ? <action.icon className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
