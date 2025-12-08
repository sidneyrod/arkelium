import { cn } from '@/lib/utils';

interface ArkeliumIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Arkelium platform icon - The official "A" inside a circle symbol.
 * This is the ONLY official visual symbol of ARKELIUM.
 * DO NOT use the ARKELIUM name as a logo image.
 */
const ArkeliumIcon = ({ className, size = 'md' }: ArkeliumIconProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeClasses[size], className)}
    >
      {/* Circle background - matches theme */}
      <circle
        cx="50"
        cy="50"
        r="46"
        stroke="url(#arkeliumGradient)"
        strokeWidth="4"
        className="fill-background"
      />
      
      {/* Letter A - stylized with elegant proportions */}
      <path
        d="M50 18L28 78H36L41 64H59L64 78H72L50 18ZM44 56L50 38L56 56H44Z"
        fill="url(#arkeliumGradient)"
      />
      
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="arkeliumGradient" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#D4A84B" />
          <stop offset="50%" stopColor="#C49A3C" />
          <stop offset="100%" stopColor="#B08A30" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default ArkeliumIcon;
