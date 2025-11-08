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

      <div className="space-y-1.5">
        {alerts.length === 0 && <div className="text-sm text-slate-500">All quiet ✨</div>}

        {alerts.map(alert => {
          const config = PRIORITY_CONFIG[alert.priority];

          return (
            <div
              key={alert.id}
              onClick={() => openContext(alert.ticker)}
              className="cursor-pointer rounded-lg px-2.5 py-1.5 transition-all hover:scale-[1.01]"
              style={{
                border: `1px solid ${config.borderColor}`,
                backgroundColor: config.bgColor,
                boxShadow: `0 2px 8px ${config.bgColor}`,
              }}
            >
              {/* Compact single/two-line layout */}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 text-xs" title={config.label}>
                  {config.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold" style={{ color: config.color }}>
                    {alert.title}
                  </span>
                  <span className="mx-1.5 text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-300">{alert.message}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

AlertsCardComponent.displayName = 'AlertsCard';

export const AlertsCard = React.memo(AlertsCardComponent);
