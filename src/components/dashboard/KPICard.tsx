import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import MiniSparkline from './MiniSparkline';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
  badge?: { text: string; variant: 'success' | 'warning' | 'danger' };
  warning?: { count: number; label: string };
  sparklineData?: number[];
  icon?: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
}

const KPICard = ({
  title,
  value,
  subtitle,
  trend,
  badge,
  warning,
  sparklineData,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  onClick,
}: KPICardProps) => {
  const badgeStyles = {
    success: 'bg-success/15 text-success border-success/30',
    warning: 'bg-warning/15 text-warning-foreground border-warning/30',
    danger: 'bg-destructive/15 text-destructive border-destructive/30',
  };

  return (
    <div
      className={cn(
        'bg-card rounded-2xl p-4 border border-border/50 shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-border'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Value Row */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold',
                  trend.isPositive ? 'text-success' : 'text-destructive'
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
            {badge && (
              <span
                className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                  badgeStyles[badge.variant]
                )}
              >
                {badge.text}
              </span>
            )}
          </div>

          {/* Warning */}
          {warning && (
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs text-warning font-medium">
                ⚠ {warning.count} {warning.label}
              </span>
            </div>
          )}

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}

          {/* Title */}
          <p className="text-xs font-medium text-muted-foreground mt-1.5">
            {title}
          </p>
        </div>

        {/* Icon */}
        {Icon && (
          <div className={cn('shrink-0', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2 -mx-1">
          <MiniSparkline data={sparklineData} />
        </div>
      )}
    </div>
  );
};

export default KPICard;
