import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type StatCardVariant = 'default' | 'green' | 'blue' | 'gold' | 'orange' | 'purple' | 'teal';

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
  variant?: StatCardVariant;
}

const variantStyles: Record<StatCardVariant, { card: string; icon: string; iconBg: string }> = {
  default: {
    card: 'bg-card border-border/50',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  green: {
    card: 'card-variant-green',
    icon: 'text-[hsl(162,72%,34%)]',
    iconBg: 'bg-[hsl(162,72%,34%)]/15',
  },
  blue: {
    card: 'card-variant-blue',
    icon: 'text-[hsl(217,91%,60%)]',
    iconBg: 'bg-[hsl(217,91%,60%)]/15',
  },
  gold: {
    card: 'card-variant-gold',
    icon: 'text-[hsl(40,70%,45%)]',
    iconBg: 'bg-[hsl(40,70%,45%)]/15',
  },
  orange: {
    card: 'card-variant-orange',
    icon: 'text-[hsl(25,80%,50%)]',
    iconBg: 'bg-[hsl(25,80%,50%)]/15',
  },
  purple: {
    card: 'card-variant-purple',
    icon: 'text-[hsl(270,60%,55%)]',
    iconBg: 'bg-[hsl(270,60%,55%)]/15',
  },
  teal: {
    card: 'card-variant-teal',
    icon: 'text-[hsl(180,60%,40%)]',
    iconBg: 'bg-[hsl(180,60%,40%)]/15',
  },
};

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
  const styles = variantStyles[variant];

  const cardContent = (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-lg border p-4 transition-all duration-300",
        styles.card,
        "hover:-translate-y-0.5",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
      style={{
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
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
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
          styles.iconBg,
          styles.icon
        )}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
      
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-white/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:from-white/5" />
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