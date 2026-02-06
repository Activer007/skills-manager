import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface ModalProps extends React.ComponentPropsWithoutRef<'dialog'> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animation?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  size = 'lg',
  animation = true,
  ...dialogProps
}: ModalProps) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  // 尺寸映射
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full mx-4',
  };

  // 动画类
  const animationClasses = animation
    ? 'animate-in fade-in zoom-in-95 duration-normal'
    : '';

  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (isOpen) {
      modal.showModal();
    } else {
      modal.close();
    }
  }, [isOpen]);

  // Handle ESC key and backdrop click
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target === modal) {
        onClose();
      }
    };

    modal.addEventListener('cancel', handleCancel);
    modal.addEventListener('click', handleBackdropClick);

    return () => {
      modal.removeEventListener('cancel', handleCancel);
      modal.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return createPortal(
    <dialog
      ref={modalRef}
      className={cn(
        "modal modal-bottom sm:modal-middle",
        isOpen && "modal-open"
      )}
      {...dialogProps}
    >
      <div className={cn(
        // 增强圆角：rounded-xl (16px) - 更现代
        // 增强阴影：shadow-soft-lg + 发光效果
        // 毛玻璃背景效果
        "modal-box bg-white/95 dark:bg-base-100/95 p-0 overflow-hidden relative shadow-soft-lg glow-primary rounded-xl border border-gray-200 dark:border-base-300 backdrop-blur-md",
        sizeClasses[size],
        animationClasses,
        className
      )}>
        {/* Header - 增加渐变边框效果 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-base-200 bg-gradient-to-r from-white to-gray-50 dark:from-base-100 dark:to-base-200/30">
          <h3 className="font-bold text-lg text-gradient-primary">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="btn-circle btn-sm hover:bg-slate-100 dark:hover:bg-base-200 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all duration-fast"
            onClick={onClose}
            data-testid="close-dialog"
            aria-label="Close"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer - 毛玻璃效果 */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50/80 dark:bg-base-200/50 backdrop-blur-sm flex justify-end gap-3 border-t border-gray-100 dark:border-base-200">
            {footer}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50 backdrop-blur-sm transition-opacity duration-normal">
        <button>close</button>
      </form>
    </dialog>,
    document.body
  );
};
