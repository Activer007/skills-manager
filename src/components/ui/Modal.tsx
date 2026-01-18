import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../utils/cn';

interface ModalProps {
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
    >
      <div className={cn(
        // 统一圆角：rounded-lg (12px)
        // 统一阴影：shadow-2xl
        // 动画效果
        "modal-box bg-white dark:bg-base-100 p-0 overflow-hidden relative shadow-2xl rounded-lg border border-gray-100 dark:border-base-300",
        sizeClasses[size],
        animationClasses,
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-base-200 bg-white dark:bg-base-100">
          <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 leading-none">{title}</h3>
          <Button
            variant="ghost"
            size="sm"
            className="btn-circle btn-sm hover:bg-slate-100 dark:hover:bg-base-200 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            onClick={onClose}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-gray-50 dark:bg-base-200/50 flex justify-end gap-3 border-t border-gray-100 dark:border-base-200">
            {footer}
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop bg-black/40 backdrop-blur-sm">
        <button>close</button>
      </form>
    </dialog>,
    document.body
  );
};
