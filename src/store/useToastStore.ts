import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastStore {
    toasts: ToastItem[];
    addToast: (message: string, type?: ToastType, duration?: number) => void;
    removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
    toasts: [],
    addToast: (message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((state) => ({
            toasts: [...state.toasts, { id, message, type, duration }]
        }));
    },
    removeToast: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }));
    }
}));

// Helper for non-hook usage
export const toast = {
    success: (message: string, duration?: number) => useToastStore.getState().addToast(message, 'success', duration),
    error: (message: string, duration?: number) => useToastStore.getState().addToast(message, 'error', duration),
    info: (message: string, duration?: number) => useToastStore.getState().addToast(message, 'info', duration),
    warning: (message: string, duration?: number) => useToastStore.getState().addToast(message, 'warning', duration),
};
