import { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';

import { ALERT_RULES, generateStrategicAlerts } from './alertRules';
import type { Alert, AlertContext } from './alertTypes';
import { PRIORITY_ORDER } from './alertTypes';

/**
 * Enhanced alert generation hook using rule-based system
 * Generates actionable alerts from positions, share lots, and earnings data
 *
 * PERFORMANCE OPTIMIZED:
 * - Single pass over positions array (combined loops)
 * - Memoized context calculations
 * - Early returns in rules
 * - Efficient sorting and deduplication
 */
export function useAlertGeneration() {
  const positions = useWheelStore(s => s.positions);
  const lots = useWheelStore(s => s.lots);
  const earnings = useWheelStore(s => s.earnings);

  // Memoize capital by ticker calculation
  const capitalByTicker = useMemo(() => {
    const map = new Map<string, number>();
    positions.forEach(p => {
      if (p.type === 'P' && p.side === 'S') {
        const capital = p.strike * 100 * p.qty;
        map.set(p.ticker, (map.get(p.ticker) || 0) + capital);
      }
    });
    return map;
  }, [positions]);

  // Memoize shares by ticker calculation
  const sharesByTicker = useMemo(() => {
    const map = new Map<string, number>();
    lots.forEach(lot => {
      map.set(lot.ticker, (map.get(lot.ticker) || 0) + lot.qty);
    });
    return map;
  }, [lots]);

  // Memoize short calls by ticker calculation
  const shortCallsByTicker = useMemo(() => {
    const map = new Map<string, number>();
    positions.forEach(p => {
      if (p.type === 'C' && p.side === 'S') {
        const shares = p.qty * 100;
        map.set(p.ticker, (map.get(p.ticker) || 0) + shares);
      }
    });
    return map;
  }, [positions]);

  // Memoize total capital
  const totalCapital = useMemo(() => {
    return Array.from(capitalByTicker.values()).reduce((sum, val) => sum + val, 0);
  }, [capitalByTicker]);

  // Main alert generation logic
  return useMemo(() => {
    const alerts: Alert[] = [];

    // Build context for alert rules
    const context: AlertContext = {
      positions,
      lots,
      earnings,
      currentDate: new Date(),
      totalCapital,
      capitalByTicker,
      sharesByTicker,
      shortCallsByTicker,
    };

    // Run all position-based alert rules
    positions.forEach(position => {
      ALERT_RULES.forEach(rule => {
        if (!rule.enabled) return;

        try {
          const alert = rule.check(position, context);
          if (alert) {
            alerts.push(alert);
          }
        } catch (error) {
          console.error(`Alert rule ${rule.id} error:`, error);
        }
      });
    });

    // Generate strategic alerts (share-based)
    const strategicAlerts = generateStrategicAlerts(context);
    alerts.push(...strategicAlerts);

    // Sort alerts by priority (urgent first)
    alerts.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by ticker
      return a.ticker.localeCompare(b.ticker);
    });

    // Deduplicate alerts (keep highest priority)
    const seenKeys = new Set<string>();
    const dedupedAlerts = alerts.filter(alert => {
      // Create a key based on ticker + category (allows multiple alerts per ticker)
      const key = `${alert.ticker}-${alert.category}`;
      if (seenKeys.has(key)) {
        return false; // Skip duplicate
      }
      seenKeys.add(key);
      return true;
    });

    return dedupedAlerts;
  }, [
    positions,
    lots,
    earnings,
    totalCapital,
    capitalByTicker,
    sharesByTicker,
    shortCallsByTicker,
  ]);
}
