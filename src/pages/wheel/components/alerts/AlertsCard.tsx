import { Icon } from '@iconify/react';
import React from 'react';

import { useWheelUIStore } from '@/stores/useWheelUIStore';

import { PRIORITY_CONFIG } from './alertTypes';
import { useAlertGeneration } from './useAlertGeneration';

const AlertsCardComponent: React.FC = () => {
  const alerts = useAlertGeneration();
  const openContext = useWheelUIStore(s => s.openContext);

  const urgentCount = alerts.filter(a => a.priority === 'urgent').length;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:bell-alert" className="h-4 w-4" style={{ color: '#F5B342' }} />
          <span className="font-semibold text-slate-100">Alerts</span>
          {alerts.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor:
                  urgentCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 179, 66, 0.2)',
                color: urgentCount > 0 ? '#EF4444' : '#F5B342',
              }}
            >
              {alerts.length}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">auto from data</span>
      </div>

      <div className="space-y-2">
        {alerts.length === 0 && <div className="text-sm text-slate-500">All quiet ✨</div>}

        {alerts.map(alert => {
          const config = PRIORITY_CONFIG[alert.priority];

          return (
            <div
              key={alert.id}
              className="rounded-lg p-3 transition-all hover:scale-[1.01]"
              style={{
                border: `1px solid ${config.borderColor}`,
                backgroundColor: config.bgColor,
                boxShadow: `0 2px 8px ${config.bgColor}`,
              }}
            >
              {/* Priority Badge + Title */}
              <div className="mb-2 flex items-start gap-2">
                <span className="text-sm" title={config.label}>
                  {config.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4
                      className="text-sm leading-tight font-semibold"
                      style={{ color: config.color }}
                    >
                      {alert.title}
                    </h4>
                    <button
                      onClick={() => openContext(alert.ticker)}
                      className="shrink-0 text-xs font-medium transition-colors"
                      style={{
                        color: config.color,
                        opacity: 0.7,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.opacity = '0.7';
                      }}
                    >
                      View →
                    </button>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">{alert.message}</p>
                </div>
              </div>

              {/* Action Buttons */}
              {alert.actions && alert.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {alert.actions.map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (action.callback) {
                          action.callback();
                        } else if (action.action === 'view') {
                          openContext(alert.ticker);
                        }
                      }}
                      className="rounded px-2 py-1 text-xs font-medium transition-all"
                      style={{
                        border: `1px solid ${config.borderColor}`,
                        backgroundColor:
                          action.action === 'close' || action.action === 'roll'
                            ? config.bgColor
                            : 'rgba(0, 0, 0, 0.3)',
                        color: config.color,
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = config.bgColor;
                        e.currentTarget.style.borderColor = config.color;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor =
                          action.action === 'close' || action.action === 'roll'
                            ? config.bgColor
                            : 'rgba(0, 0, 0, 0.3)';
                        e.currentTarget.style.borderColor = config.borderColor;
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

AlertsCardComponent.displayName = 'AlertsCard';

export const AlertsCard = React.memo(AlertsCardComponent);
