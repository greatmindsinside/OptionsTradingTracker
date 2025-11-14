import { X } from 'lucide-react';
import React, { useEffect } from 'react';

import type { Alert } from './alertTypes';
import { PRIORITY_CONFIG } from './alertTypes';

interface AlertDetailModalProps {
  alert: Alert;
  onClose: () => void;
}

export const AlertDetailModal: React.FC<AlertDetailModalProps> = ({ alert, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const config = PRIORITY_CONFIG[alert.priority];

  return (
    <div className="modal-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div
        className="modal max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: config.bgColor,
                color: config.color,
                border: `1px solid ${config.borderColor}`,
                boxShadow: `0 0 8px ${config.color}30`,
              }}
            >
              {config.label}
            </span>
            <h2 id="alert-modal-title" className="modal-title">
              {alert.ticker}
            </h2>
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          <div className="space-y-4">
            {/* Title and Message */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Title</h3>
              <p className="text-sm text-slate-200" style={{ color: config.color }}>
                {alert.title}
              </p>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Message</h3>
              <p className="text-sm text-slate-200">{alert.message}</p>
            </div>

            {/* Category */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-300">Category</h3>
              <p className="text-sm text-slate-400 capitalize">
                {alert.category.replace('_', ' ')}
              </p>
            </div>

            {/* Metadata */}
            {alert.metadata && Object.keys(alert.metadata).length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-300">Details</h3>
                <div className="space-y-1">
                  {Object.entries(alert.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                      <span className="text-slate-200">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {alert.actions && alert.actions.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-300">Actions</h3>
                <div className="flex flex-wrap gap-2">
                  {alert.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (action.callback) {
                          action.callback();
                        }
                        onClose();
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: config.bgColor,
                        color: config.color,
                        border: `1px solid ${config.borderColor}`,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = config.bgColor.replace(
                          '0.15',
                          '0.25'
                        );
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = config.bgColor;
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
