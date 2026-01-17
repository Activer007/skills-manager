import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: {
    switch: 'w-8 h-5',
    thumb: 'h-3 w-3',
    translate: 14, // 32 - 4(padding) - 12(thumb) = 16? No, padding 2px. 32 - 4 - 12 = 16. Translate X should be around 14ish.
    // Let's calculate: w=32px, p=2px. thumb=12px. off=2px. on=32-2-12=18px. diff=16px.
  },
  md: {
    switch: 'w-11 h-6',
    thumb: 'h-5 w-5',
    translate: 20, // 44 - 4 - 20 = 20.
  },
  lg: {
    switch: 'w-14 h-8',
    thumb: 'h-7 w-7',
    translate: 24,
  },
};

export const Switch = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
  label,
}: SwitchProps) => {
  const toggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const currentSize = sizeClasses[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={toggle}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div
        className={cn(
          'relative rounded-full transition-colors duration-200 ease-in-out border-2 border-transparent',
          checked ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700',
          currentSize.switch
        )}
      >
        <motion.div
          initial={false}
          animate={{
            x: checked ? currentSize.translate : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 30,
          }}
          className={cn(
            'pointer-events-none absolute top-0.5 left-0.5 rounded-full bg-white shadow-sm ring-0',
            currentSize.thumb
          )}
        />
      </div>
      {label && (
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 select-none">
          {label}
        </span>
      )}
    </div>
  );
};
