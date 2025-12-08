import { cn } from '@/lib/utils';
import arkeliumLogo from '@/assets/arkelium-logo.png';

interface ArkeliumIconProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Arkelium platform icon - Golden logo with transparent background.
 * Single image works for both themes.
 */
const ArkeliumIcon = ({ className, size = 'md' }: ArkeliumIconProps) => {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div className={cn(sizeClasses[size], 'flex items-center justify-center', className)}>
      <img
        src={arkeliumLogo}
        alt="Arkelium"
        className="w-full h-full object-contain"
        style={{ 
          mixBlendMode: 'multiply',
          filter: 'none'
        }}
      />
    </div>
  );
};

export default ArkeliumIcon;
