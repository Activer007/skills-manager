import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'info' | 'success' | 'warning' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xs';
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'badge-primary',
      secondary: 'badge-secondary',
      outline: 'badge-outline',
      ghost: 'badge-ghost',
      error: 'badge-error',
      info: 'badge-info',
      success: 'badge-success',
      warning: 'badge-warning',
      neutral: 'badge-neutral',
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
