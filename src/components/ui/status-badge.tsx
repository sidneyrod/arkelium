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
    className: 'bg-success/15 text-success border-success/30 font-semibold' 
  },
  inactive: { 
    defaultLabel: 'Inactive', 
    className: 'bg-muted text-muted-foreground border-border' 
  },
  pending: { 
    defaultLabel: 'Pending', 
    className: 'bg-warning/15 text-warning-foreground border-warning/30' 
  },
  completed: { 
    defaultLabel: 'Completed', 
    className: 'bg-primary/15 text-primary border-primary/30 font-semibold' 
  },
  cancelled: { 
    defaultLabel: 'Cancelled', 
    className: 'bg-destructive/15 text-destructive border-destructive/30' 
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
