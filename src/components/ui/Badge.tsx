import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'info' | 'success' | 'warning' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xs';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'badge-primary bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm hover:shadow-md transition-all duration-fast badge-soft',
      secondary: 'badge-secondary shadow-sm hover:shadow-md transition-all duration-fast badge-soft',
      outline: 'badge-outline hover:border-primary hover:text-primary transition-all duration-fast',
      ghost: 'badge-ghost hover:bg-primary/10 hover:text-primary transition-all duration-fast',
      error: 'badge-error bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm hover:shadow-lg hover:shadow-red-500/25 transition-all duration-fast',
      info: 'badge-info bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-sm hover:shadow-lg hover:shadow-sky-500/25 transition-all duration-fast',
      success: 'badge-success bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-fast',
      warning: 'badge-warning bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-fast',
      neutral: 'badge-neutral shadow-sm hover:shadow-md transition-all duration-fast badge-soft',
    };

    const sizes = {
        xs: 'badge-xs',
        sm: 'badge-sm',
        md: '',
        lg: 'badge-lg',
    };

    return (
      <span
        ref={ref}
        className={cn('badge', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
