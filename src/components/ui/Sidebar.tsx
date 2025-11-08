import React from 'react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  children,
  title,
  width = '400px',
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className="fixed top-0 right-0 z-50 h-full overflow-y-auto border-l border-zinc-700 bg-zinc-900 shadow-2xl transition-transform duration-300 ease-in-out"
        style={{ width, transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          {title && (
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-700 bg-zinc-900 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
              <button
                onClick={onClose}
                className="rounded p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                aria-label="Close sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 p-6">{children}</div>
        </div>
      </div>
    </>
  );
};
