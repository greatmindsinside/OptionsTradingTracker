import { Icon } from '@iconify/react';
import React, { useState } from 'react';

import { AlertDetailModal } from './AlertDetailModal';
import type { Alert } from './alertTypes';
import { PRIORITY_CONFIG } from './alertTypes';
import { useAlertGeneration } from './useAlertGeneration';

const AlertsCardComponent: React.FC = () => {
  const alerts = useAlertGeneration();
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const urgentCount = alerts.filter(a => a.priority === 'urgent').length;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="mdi:bell-alert" className="h-4 w-4" style={{ color: '#F5B342' }} />
          <span className="font-semibold text-slate-100">Alerts</span>
          {alerts.length > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold backdrop-blur-sm"
              style={{
                backgroundColor:
                  urgentCount > 0 ? 'rgba(217, 119, 6, 0.25)' : 'rgba(245, 179, 66, 0.2)',
                color: urgentCount > 0 ? '#D97706' : '#F5B342',
                boxShadow: urgentCount > 0
                  ? '0 0 8px rgba(217, 119, 6, 0.3)'
                  : '0 0 6px rgba(245, 179, 66, 0.2)',
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

        {alerts.map((alert, index) => {
          const config = PRIORITY_CONFIG[alert.priority];
          const isUrgent = alert.priority === 'urgent';
          const isHighPriority = alert.priority === 'urgent' || alert.priority === 'warning';

          // Glassmorphic background with transparency
          const glassmorphicBg = `linear-gradient(135deg, rgba(2, 3, 5, 0.4) 0%, rgba(4, 6, 8, 0.35) 100%)`;

          // Color-based glow effect
          const glowColor = config.color;
          const glowShadow = isUrgent
            ? `0 0 12px ${glowColor}40, 0 0 20px ${glowColor}20, 0 2px 8px rgba(0, 0, 0, 0.5)`
            : `0 0 8px ${glowColor}30, 0 0 16px ${glowColor}15, 0 2px 6px rgba(0, 0, 0, 0.4)`;

          return (
            <div
              key={alert.id}
              onClick={() => setSelectedAlert(alert)}
              className={`alert-entrance glass-card cursor-pointer rounded-lg px-3 py-1.5 transition-all duration-300 hover:scale-[1.02] ${
                isUrgent ? 'alert-urgent-shimmer alert-urgent-pulse' : ''
              } ${isHighPriority ? 'alert-gradient-border' : ''}`}
              style={{
                animationDelay: `${index * 0.05}s`,
                background: glassmorphicBg,
                backdropFilter: 'blur(12px) saturate(120%)',
                WebkitBackdropFilter: 'blur(12px) saturate(120%)',
                border: isHighPriority ? 'none' : `1px solid ${config.borderColor}30`,
                boxShadow: glowShadow,
                transition: 'transform 0.2s ease, box-shadow 0.3s ease, border-color 0.3s ease',
              }}
              onMouseEnter={e => {
                if (!isUrgent) {
                  e.currentTarget.style.boxShadow = `0 0 16px ${glowColor}50, 0 0 24px ${glowColor}25, 0 4px 12px rgba(0, 0, 0, 0.6)`;
                  e.currentTarget.style.borderColor = config.borderColor.replace('0.3', '0.5').replace('0.4', '0.6');
                }
              }}
              onMouseLeave={e => {
                if (!isUrgent) {
                  e.currentTarget.style.boxShadow = glowShadow;
                  e.currentTarget.style.borderColor = config.borderColor.replace('0.4', '0.3').replace('0.5', '0.3');
                }
              }}
            >
              {/* Alert title only - no icon, no truncation */}
              <div className="relative z-10 flex items-center">
                <div className="flex-1">
                  <span className="text-xs leading-relaxed text-slate-200" style={{ color: config.color }}>
                    {alert.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
      )}
    </div>
  );
};

AlertsCardComponent.displayName = 'AlertsCard';

export const AlertsCard = React.memo(AlertsCardComponent);
