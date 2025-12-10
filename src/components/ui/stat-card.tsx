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
}

const StatCard = ({ title, value, icon: Icon, trend, className, onClick, tooltip }: StatCardProps) => {
  const cardContent = (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card p-6 transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 hover:-translate-y-0.5",
        onClick && "cursor-pointer active:scale-[0.98]",
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-110">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Hover glow effect */}
      {onClick && (
        <div className="absolute inset-0 -z-10 rounded-xl bg-primary/5 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100" />
      )}
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
