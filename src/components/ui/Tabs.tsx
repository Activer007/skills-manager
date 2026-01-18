import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../utils/cn';

// ========================================
// Tabs Root Component
// ========================================

interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

const Tabs = ({ className, children, ...props }: TabsProps) => (
    <TabsPrimitive.Root
      className={cn('tabs-component', className)}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
);
Tabs.displayName = TabsPrimitive.Root.displayName;

// ========================================
// Tabs List Component
// ========================================

interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  variant?: 'underline' | 'pills';
  children: React.ReactNode;
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, variant = 'underline', children, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex items-center justify-start',
        // Underline variant - 增加间距以改善可读性
        variant === 'underline' && 'border-b border-gray-200 dark:border-base-200 gap-6 sm:gap-8',
        // Pills variant
        variant === 'pills' && 'flex-wrap gap-1 bg-gray-100 dark:bg-base-200 rounded-lg p-1',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
);
TabsList.displayName = TabsPrimitive.List.displayName;

// ========================================
// Tabs Trigger Component
// ========================================

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  variant?: 'underline' | 'pills';
  badge?: number | string;
  children: React.ReactNode;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, variant = 'underline', badge, children, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 whitespace-nowrap transition-all duration-normal',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        'disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed',
        // Underline variant styles
        variant === 'underline' && cn(
          'pb-3 text-sm font-medium border-b-2 -mb-px',
          'data-[state=active]:border-primary data-[state=active]:text-primary',
          'data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 dark:data-[state=inactive]:text-slate-400',
          'hover:data-[state=inactive]:text-slate-700 dark:hover:data-[state=inactive]:text-slate-300'
        ),
        // Pills variant styles
        variant === 'pills' && cn(
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          'data-[state=active]:bg-white dark:data-[state=active]:bg-base-100',
          'data-[state=active]:text-primary data-[state=active]:shadow-sm',
          'data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-400',
          'hover:data-[state=inactive]:text-slate-900 dark:hover:data-[state=inactive]:text-slate-200',
          'hover:data-[state=inactive]:bg-gray-200/50 dark:hover:data-[state=inactive]:bg-base-300/50'
        ),
        className
      )}
      {...props}
    >
      {children}
      {badge !== undefined && badge !== null && (
        <span
          className={cn(
            'inline-flex items-center justify-center',
            'px-2 py-0.5 rounded-full text-xs font-medium',
            'transition-colors duration-normal',
            // Underline variant badge
            variant === 'underline' && cn(
              'bg-slate-100 dark:bg-slate-800',
              'text-slate-600 dark:text-slate-400',
              'data-[state=active]:bg-primary/10 data-[state=active]:text-primary'
            ),
            // Pills variant badge
            variant === 'pills' && cn(
              'bg-primary/10 text-primary',
              'data-[state=active]:bg-primary/20'
            )
          )}
        >
          {badge}
        </span>
      )}
    </TabsPrimitive.Trigger>
  )
);
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

// ========================================
// Tabs Content Component
// ========================================

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  children: React.ReactNode;
  value: string;
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, children, ...props }, ref) => (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
        'animate-in fade-in zoom-in-95 duration-normal',
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Content>
  )
);
TabsContent.displayName = TabsPrimitive.Content.displayName;

// ========================================
// Exports
// ========================================

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps };
