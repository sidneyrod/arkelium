import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, CreditCard, CalendarX, LucideIcon } from 'lucide-react';

type AlertType = 'delayed' | 'churn' | 'invoice' | 'conflict';

interface AlertCardProps {
  type: AlertType;
  title: string;
  count: number;
  className?: string;
}

const alertConfig: Record<AlertType, { icon: LucideIcon; color: string; bgColor: string }> = {
  delayed: { icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
  churn: { icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
  invoice: { icon: CreditCard, color: 'text-info', bgColor: 'bg-info/10' },
  conflict: { icon: CalendarX, color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

const AlertCard = ({ type, title, count, className }: AlertCardProps) => {
  const config = alertConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-soft-md cursor-pointer",
      className
    )}>
      <div className={cn(
        "flex h-10 w-10 items-center justify-center rounded-lg",
        config.bgColor
      )}>
        <Icon className={cn("h-5 w-5", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{title}</p>
      </div>
      <div className={cn(
        "flex h-7 min-w-[28px] items-center justify-center rounded-full px-2 text-xs font-semibold",
        config.bgColor,
        config.color
      )}>
        {count}
      </div>
    </div>
  );
};

export default AlertCard;
