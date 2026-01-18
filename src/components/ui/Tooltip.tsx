import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../utils/cn';

// ========================================
// Tooltip Provider Component
// ========================================

const TooltipProvider = TooltipPrimitive.Provider;

// ========================================
// Tooltip Root Component
// ========================================

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  delayDuration?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  sideOffset?: number;
  align?: 'start' | 'center' | 'end';
  alignOffset?: number;
  arrow?: boolean;
}

const Tooltip = ({
  children,
  content,
  delayDuration = 200,
  side = 'top',
  sideOffset = 8,
  align = 'center',
  alignOffset = 0,
  arrow = true,
}: TooltipProps) => {
  return (
    <TooltipPrimitive.Root
      delayDuration={delayDuration}
    >
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={sideOffset}
          align={align}
          alignOffset={alignOffset}
          className={cn(
            'z-tooltip',
            'px-3 py-2',
            'max-w-xs',
            'bg-slate-900 dark:bg-slate-100',
            'text-slate-50 dark:text-slate-900',
            'text-xs',
            'rounded-md',
            'shadow-lg',
            'border border-slate-700 dark:border-slate-300',
            'animate-in fade-in zoom-in-95 duration-normal',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95 data-[state=closed]:duration-normal'
          )}
        >
          {content}
          {arrow && (
            <TooltipPrimitive.Arrow className="fill-slate-900 dark:fill-slate-100" />
          )}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};

Tooltip.displayName = TooltipPrimitive.Root.displayName;

// ========================================
// Exports
// ========================================

export { TooltipProvider, Tooltip };
export type { TooltipProps };
