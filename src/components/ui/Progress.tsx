import * as React from 'react';
import { cn } from '../../utils/cn';

// ========================================
// Progress Component
// ========================================

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showPercentage?: boolean;
  colorScheme?: 'blue' | 'green' | 'orange' | 'red' | 'auto';
  label?: string;
  secondaryLabel?: string;
  variant?: 'default' | 'segmented';
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    value,
    max = 100,
    size = 'md',
    showLabel = false,
    showPercentage = false,
    colorScheme = 'auto',
    label,
    secondaryLabel,
    variant = 'default',
    className,
    ...props
  }, ref) => {
    // Calculate percentage
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    // Determine color based on scheme
    const getColorClass = () => {
      if (colorScheme !== 'auto') {
        const colors = {
          blue: 'bg-blue-500',
          green: 'bg-emerald-500',
          orange: 'bg-amber-500',
          red: 'bg-red-500',
        };
        return colors[colorScheme];
      }

      // Auto color based on percentage
      if (percentage >= 50) return 'bg-emerald-500';
      if (percentage >= 20) return 'bg-amber-500';
      return 'bg-red-500';
    };

    const colorClass = getColorClass();

    // Size configurations
    const sizeConfig = {
      sm: {
        height: 'h-2',
        text: 'text-xs',
        padding: 'px-2',
      },
      md: {
        height: 'h-3',
        text: 'text-sm',
        padding: 'px-3',
      },
      lg: {
        height: 'h-4',
        text: 'text-base',
        padding: 'px-4',
      },
    };

    const config = sizeConfig[size];

    // Default variant
    if (variant === 'default') {
      return (
        <div
          ref={ref}
          className={cn('w-full', className)}
          {...props}
        >
          {/* Labels */}
          {(showLabel || showPercentage || label || secondaryLabel) && (
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                {label && (
                  <span className={cn('font-medium text-slate-900 dark:text-slate-100', config.text)}>
                    {label}
                  </span>
                )}
                {secondaryLabel && (
                  <span className={cn('text-slate-500 dark:text-slate-400', config.text)}>
                    {secondaryLabel}
                  </span>
                )}
              </div>
              {showPercentage && (
                <span className={cn('font-mono font-medium text-slate-900 dark:text-slate-100', config.text)}>
                  {Math.round(percentage)}%
                </span>
              )}
            </div>
          )}

          {/* Progress Bar */}
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-full',
              'bg-slate-100 dark:bg-slate-800',
              config.height
            )}
          >
            {/* Background fill (semi-transparent) */}
            <div
              className={cn(
                'absolute inset-y-0 left-0 transition-all duration-700 ease-out',
                'opacity-15 dark:opacity-20',
                colorClass
              )}
              style={{ width: `${percentage}%` }}
            />

            {/* Foreground content */}
            <div
              className={cn(
                'relative z-10 flex items-center justify-between',
                'text-[10px] font-mono text-slate-700 dark:text-slate-300',
                config.padding
              )}
              style={{ width: '100%' }}
            >
              <span className="truncate">{label || ''}</span>
              {showPercentage && (
                <span>{Math.round(percentage)}%</span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Segmented variant (like Antigravity Manager's quota progress)
    return (
      <div
        ref={ref}
        className={cn('w-full', className)}
        {...props}
      >
        {/* Progress Bar with border */}
        <div
          className={cn(
            'relative flex items-center',
            config.height,
            'px-1 rounded-lg overflow-hidden border',
            'bg-slate-50/30 dark:bg-slate-800/30',
            'border-slate-200 dark:border-slate-700',
            'transition-all duration-normal'
          )}
        >
          {/* Background fill */}
          <div
            className={cn(
              'absolute inset-y-0 left-0 transition-all duration-700 ease-out',
              'opacity-15 dark:opacity-20',
              colorClass
            )}
            style={{ width: `${percentage}%` }}
          />

          {/* Foreground content */}
          <div
            className={cn(
              'relative z-10 w-full flex justify-between items-center',
              'text-[9px] font-mono',
              'text-slate-700 dark:text-slate-300'
            )}
          >
            <span className="truncate">{label}</span>
            {showPercentage && (
              <span>{Math.round(percentage)}%</span>
            )}
          </div>
        </div>

        {/* Labels outside (for segmented variant) */}
        {(showLabel || secondaryLabel) && (
          <div className="flex justify-between items-center mt-1">
            {label && (
              <span className={cn('text-slate-600 dark:text-slate-400', config.text)}>
                {label}
              </span>
            )}
            {secondaryLabel && (
              <span className={cn('text-slate-500 dark:text-slate-500', config.text)}>
                {secondaryLabel}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = 'Progress';

// ========================================
// CircularProgress Component
// ========================================

export interface CircularProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  colorScheme?: 'blue' | 'green' | 'orange' | 'red';
  strokeWidth?: number;
}

export const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({
    value,
    max = 100,
    size = 'md',
    showPercentage = false,
    colorScheme = 'blue',
    strokeWidth = 8,
    className,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const sizeConfig = {
      sm: { width: 'w-16 h-16', textSize: 'text-xs' },
      md: { width: 'w-24 h-24', textSize: 'text-sm' },
      lg: { width: 'w-32 h-32', textSize: 'text-base' },
    };

    const config = sizeConfig[size];

    const colorClasses = {
      blue: 'stroke-blue-500',
      green: 'stroke-emerald-500',
      orange: 'stroke-amber-500',
      red: 'stroke-red-500',
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-flex items-center justify-center', config.width, className)}
        {...props}
      >
        <svg className="transform -rotate-90" width="100%" height="100%" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn(colorClasses[colorScheme], 'transition-all duration-700 ease-out')}
            strokeLinecap="round"
          />
        </svg>
        {showPercentage && (
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            'font-mono font-medium text-slate-900 dark:text-slate-100',
            config.textSize
          )}>
            {Math.round(percentage)}%
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';
