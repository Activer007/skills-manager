import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

export type ModalType = 'confirm' | 'success' | 'error' | 'info';

export interface ModalDialogProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    type?: ModalType;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
    children?: React.ReactNode;
}

export default function ModalDialog({
    isOpen,
    title,
    message,
    type = 'confirm',
    onConfirm,
    onCancel,
    confirmText,
    cancelText,
    isDestructive = false,
    isLoading = false,
    children
}: ModalDialogProps) {
    const { t } = useTranslation();
    const finalConfirmText = confirmText || t('confirm', 'Confirm');
    const finalCancelText = cancelText || t('cancel', 'Cancel');

    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-7 h-7 text-green-500" />;
            case 'error':
                return <XCircle className="w-7 h-7 text-red-500" />;
            case 'info':
                return <Info className="w-7 h-7 text-blue-500" />;
            case 'confirm':
            default:
                return isDestructive ? <AlertTriangle className="w-7 h-7 text-red-500" /> : <AlertTriangle className="w-7 h-7 text-blue-500" />;
        }
    };

    const getIconBg = () => {
        switch (type) {
            case 'success': return 'bg-green-50 dark:bg-green-900/20';
            case 'error': return 'bg-red-50 dark:bg-red-900/20';
            case 'info': return 'bg-blue-50 dark:bg-blue-900/20';
            case 'confirm': default: return isDestructive ? 'bg-red-50 dark:bg-red-900/20' : 'bg-blue-50 dark:bg-blue-900/20';
        }
    };

    const showCancel = (type === 'confirm' || !!onCancel) && !isLoading;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
             {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" 
                onClick={!isLoading ? onCancel : undefined}
            />

            {/* Draggable Top Region (if needed for small modals acting as popups) */}
            <div data-tauri-drag-region className="fixed top-0 left-0 right-0 h-8 z-[110]" />

            <div className="relative z-[101] bg-white dark:bg-base-100 shadow-2xl rounded-2xl max-w-sm w-full mx-4 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-base-300">
                <div className="flex flex-col items-center text-center p-6 pt-8">
                    <div className={cn("w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm", getIconBg())}>
                        {getIcon()}
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 dark:text-base-content mb-2">{title}</h3>
                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed px-2 w-full">
                        {message}
                        {children}
                    </div>

                    <div className="flex gap-3 w-full">
                        {showCancel && (
                            <button
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-base-200 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-base-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-base-300 disabled:opacity-50"
                                onClick={onCancel}
                                disabled={isLoading}
                            >
                                {finalCancelText}
                            </button>
                        )}
                        {onConfirm && (
                             <button
                                className={cn(
                                    "flex-1 px-4 py-2.5 text-white font-medium rounded-xl shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center",
                                    isDestructive && type === 'confirm'
                                        ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500 shadow-red-100 dark:shadow-red-900/30'
                                        : 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 shadow-blue-100 dark:shadow-blue-900/30'
                                )}
                                onClick={onConfirm}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <span className="loading loading-spinner loading-sm"></span>
                                ) : (
                                    finalConfirmText
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
