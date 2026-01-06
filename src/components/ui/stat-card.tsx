import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
  tooltip?: string;
  variant?: 'default' | 'green' | 'blue' | 'gold' | 'orange' | 'purple' | 'teal';
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  className, 
  onClick, 
  tooltip,
  variant = 'default'
}: StatCardProps) => {

  const cardContent = (
    <div 
      className={cn(
        "stat-card group",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
          <p className="text-[28px] font-bold tracking-tight text-foreground leading-none">{value}</p>
          {trend && (
            <div className="flex items-center gap-1.5 pt-1">
              <span className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-success" : "text-destructive"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">from last month</span>
            </div>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors group-hover:bg-muted">
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            {cardContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="bg-popover text-popover-foreground border-border">
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cardContent;
};

export default StatCard;