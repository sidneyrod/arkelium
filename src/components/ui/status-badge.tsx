import { cn } from '@/lib/utils';

type StatusType = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
}

const statusConfig: Record<StatusType, { defaultLabel: string; className: string }> = {
  active: { 
    defaultLabel: 'Active', 
    className: 'bg-success/10 text-success border-success/20' 
  },
  inactive: { 
    defaultLabel: 'Inactive', 
    className: 'bg-muted text-muted-foreground border-border' 
  },
  pending: { 
    defaultLabel: 'Pending', 
    className: 'bg-warning/10 text-warning border-warning/20' 
  },
  completed: { 
    defaultLabel: 'Completed', 
    className: 'bg-primary/10 text-primary border-primary/20' 
  },
  cancelled: { 
    defaultLabel: 'Cancelled', 
    className: 'bg-destructive/10 text-destructive border-destructive/20' 
  },
};

const StatusBadge = ({ status, label, className }: StatusBadgeProps) => {
  const config = statusConfig[status];

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      config.className,
      className
    )}>
      {label || config.defaultLabel}
    </span>
  );
};

export default StatusBadge;
