import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AttentionCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  value: string | number;
  ctaLabel: string;
  ctaVariant?: 'gold' | 'gold-outline' | 'red-outline';
  onClick?: () => void;
}

const AttentionCard = ({
  icon: Icon,
  iconColor = 'text-warning',
  title,
  value,
  ctaLabel,
  ctaVariant = 'gold-outline',
  onClick,
}: AttentionCardProps) => {
  const ctaStyles = {
    gold: 'bg-[#C9A84B] hover:bg-[#B8993E] text-white border-[#C9A84B]',
    'gold-outline': 'border-[#C9A84B] text-[#C9A84B] hover:bg-[#C9A84B]/10',
    'red-outline': 'border-destructive text-destructive hover:bg-destructive/10',
  };

  return (
    <div className="bg-card rounded-xl border border-border/40 p-4 space-y-4">
      {/* Top Row: Icon+Title (left) | Value (right) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-5 w-5', iconColor)} />
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>

      {/* CTA Button - Centered */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          className={cn('min-w-[100px]', ctaStyles[ctaVariant])}
          onClick={onClick}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
};

export default AttentionCard;
