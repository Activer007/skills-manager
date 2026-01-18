import { createPortal } from 'react-dom';
import Toast from './Toast';
import { useToastStore } from '../../store/useToastStore';

const ToastContainer = () => {
    const { toasts, removeToast } = useToastStore();

    return createPortal(
        <div className="fixed top-24 right-8 z-[200] flex flex-col gap-3 pointer-events-none">
            <div className="flex flex-col gap-3 pointer-events-auto">
                {toasts.map(toast => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </div>,
        document.body
    );
};

export default ToastContainer;
