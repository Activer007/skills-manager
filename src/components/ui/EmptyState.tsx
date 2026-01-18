import * as React from 'react';
import { cn } from '../../utils/cn';

// ========================================
// EmptyState Component
// ========================================

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  variant?: 'centered' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
}

export const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({
    icon,
    title,
    description,
    action,
    variant = 'centered',
    size = 'md',
    className,
    ...props
  }, ref) => {
    // Size configurations
    const sizeConfig = {
      sm: {
        container: 'py-12',
        icon: 'w-10 h-10 text-slate-400',
        iconContainer: 'w-16 h-16 mb-3',
        title: 'text-base font-semibold',
        description: 'text-sm',
      },
      md: {
        container: 'py-20',
        icon: 'w-12 h-12 text-slate-400',
        iconContainer: 'w-20 h-20 mb-4',
        title: 'text-lg font-semibold',
        description: 'text-sm',
      },
      lg: {
        container: 'py-24',
        icon: 'w-16 h-16 text-slate-400',
        iconContainer: 'w-24 h-24 mb-6',
        title: 'text-xl font-semibold',
        description: 'text-base',
      },
    };

    const config = sizeConfig[size];

    // Centered variant (default) - with border and background
    if (variant === 'centered') {
      return (
        <div
          ref={ref}
          className={cn(
            'flex flex-col items-center justify-center text-center',
            'bg-white dark:bg-base-100',
            'rounded-lg',
            'border border-dashed border-gray-200 dark:border-base-300',
            config.container,
            className
          )}
          {...props}
        >
          {/* Icon with background */}
          {icon && (
            <div
              className={cn(
                'flex items-center justify-center rounded-full',
                'bg-slate-50 dark:bg-slate-900/20',
                config.iconContainer
              )}
            >
              {typeof icon === 'string' || React.isValidElement(icon) ? (
                <div className={config.icon}>{icon}</div>
              ) : null}
            </div>
          )}

          {/* Title */}
          <h3 className={cn('text-slate-900 dark:text-slate-100 mb-2', config.title)}>
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className={cn('text-slate-500 dark:text-slate-400 max-w-md mb-0', config.description)}>
              {description}
            </p>
          )}

          {/* Action Button */}
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'mt-6 inline-flex items-center gap-2',
                'px-4 py-2 rounded-lg text-sm font-medium',
                'transition-all duration-normal',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                // Variant styles
                action.variant === 'primary' && 'bg-primary text-primary-content hover:bg-primary-hover shadow-sm hover:shadow-md',
                action.variant === 'secondary' && 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
                (!action.variant || action.variant === 'outline') && 'border border-gray-200 dark:border-base-300 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-base-200'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          )}
        </div>
      );
    }

    // Minimal variant - without border and background, simpler layout
    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          config.container,
          className
        )}
        {...props}
      >
        {/* Icon */}
        {icon && (
          <div className={cn(config.icon, 'mb-4')}>
            {icon}
          </div>
        )}

        {/* Title */}
        <h3 className={cn('text-slate-900 dark:text-slate-100 mb-2', config.title)}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className={cn('text-slate-500 dark:text-slate-400 max-w-md mb-0', config.description)}>
            {description}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className={cn(
              'mt-6 inline-flex items-center gap-2',
              'px-4 py-2 rounded-lg text-sm font-medium',
              'transition-all duration-normal',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              // Variant styles
              action.variant === 'primary' && 'bg-primary text-primary-content hover:bg-primary-hover shadow-sm hover:shadow-md',
              action.variant === 'secondary' && 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
              (!action.variant || action.variant === 'outline') && 'border border-gray-200 dark:border-base-300 text-slate-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-base-200'
            )}
          >
            {action.icon}
            {action.label}
          </button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

// ========================================
// Common Presets
// ========================================

// Preset: No Data
export const EmptyStateNoData = ({ action, ...props }: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={<FolderOpen />}
    title="暂无数据"
    description="这里还没有任何数据，开始添加您的第一个项目吧"
    action={action}
    {...props}
  />
);

// Preset: No Results
export const EmptyStateNoResults = ({ action, ...props }: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={<Search />}
    title="未找到匹配的结果"
    description="尝试调整搜索关键词或筛选条件"
    action={action}
    {...props}
  />
);

// Preset: No Skills
export const EmptyStateNoSkills = ({ action, ...props }: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={<Package />}
    title="暂无 Skills"
    description="浏览市场或从本地导入您的第一个 Skill"
    action={action}
    {...props}
  />
);

// Preset: Error
export const EmptyStateError = ({ action, ...props }: Partial<EmptyStateProps>) => (
  <EmptyState
    icon={<AlertCircle />}
    title="出错了"
    description="加载失败，请稍后重试"
    action={action}
    variant="minimal"
    {...props}
  />
);

// Import icons
function FolderOpen() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 14 1.5-2.9A2 2 0 0 1 9.1 10H22"/>
      <path d="M22 16.9V9a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.6-.9l-.6-.8A2 2 0 0 0 8.1 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-1.1"/>
    </svg>
  );
}

function Search() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

function Package() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22v-9"/>
    </svg>
  );
}

function AlertCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" x2="12" y1="8" y2="12"/>
      <line x1="12" x2="12.01" y1="16" y2="16"/>
    </svg>
  );
}
