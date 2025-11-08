import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  undo?: () => void;
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>(set => ({
  toasts: [],
  addToast: toast =>
    set(state => ({
      toasts: [...state.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: id =>
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id),
    })),
}));

// Convenience function to show success toast
export const showSuccess = (message: string) => {
  useToastStore.getState().addToast({ message, type: 'success' });
};

// Convenience function to show error toast
export const showError = (message: string) => {
  useToastStore.getState().addToast({ message, type: 'error' });
};
