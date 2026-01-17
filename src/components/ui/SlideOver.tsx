import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  width?: 'md' | 'lg' | 'xl' | '2xl';
}

const widthClasses = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const SlideOver = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  width = 'lg',
}: SlideOverProps) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col bg-white dark:bg-base-100 shadow-2xl',
              widthClasses[width],
              className
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-gray-100 dark:border-base-200 px-6 py-4">
              <div className="flex flex-col gap-1">
                {title && (
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-500 -mr-2"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="border-t border-gray-100 dark:border-base-200 bg-gray-50/50 dark:bg-base-200/50 px-6 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
