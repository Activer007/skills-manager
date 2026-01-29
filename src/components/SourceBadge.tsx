import { Sparkles, Users } from 'lucide-react';
import { cn } from '../utils/cn';

interface SourceBadgeProps {
  sourceType: 'featured' | 'user';
  repositoryName?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export const SourceBadge = ({
  sourceType,
  repositoryName,
  size = 'xs',
  showLabel = true,
  className
}: SourceBadgeProps) => {
  const isFeatured = sourceType === 'featured';

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-2.5 py-1.5',
  };

  const iconSizes = {
    xs: 12,
    sm: 14,
    md: 16,
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium transition-all',
        isFeatured
          ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white border border-amber-500/30 shadow-sm'
          : 'bg-slate-100 dark:bg-base-200 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-base-300',
        sizeClasses[size],
        className
      )}
      title={repositoryName || (isFeatured ? 'Featured Repository' : 'User Repository')}
    >
      {isFeatured ? (
        <Sparkles size={iconSizes[size]} />
      ) : (
        <Users size={iconSizes[size]} />
      )}
      {showLabel && (
        <span>{isFeatured ? 'Featured' : 'User'}</span>
      )}
    </div>
  );
};
