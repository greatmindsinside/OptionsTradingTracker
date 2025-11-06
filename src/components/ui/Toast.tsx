import React, { useEffect, useState } from 'react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
  undo?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 3000, onClose, undo }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 300); // Wait for fade out
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeStyles = {
    success: 'bg-green-500/20 border-green-500/50 text-green-400',
    error: 'bg-red-500/20 border-red-500/50 text-red-400',
    info: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-50 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${
        typeStyles[type]
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span>{message}</span>
        {undo && (
          <button
            onClick={() => {
              undo();
              setVisible(false);
              setTimeout(() => onClose?.(), 300);
            }}
            className="ml-2 rounded px-2 py-1 text-xs font-semibold text-current underline opacity-80 hover:opacity-100"
            aria-label="Undo"
          >
            Undo
          </button>
        )}
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="ml-2 text-current opacity-70 hover:opacity-100"
          aria-label="Close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export interface ToastContainerProps {
  toasts: Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' | 'warning'; undo?: () => void }>;
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          undo={toast.undo}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
};

