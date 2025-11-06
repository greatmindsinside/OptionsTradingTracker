import { useMemo } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import { daysTo,pctMaxShortCall } from '@/utils/wheel-calculations';

export function useAlertGeneration() {
  const positions = useWheelStore(s => s.positions);
  const earnings = useWheelStore(s => s.earnings);

  return useMemo(() => {
    const alerts: { id: string; text: string; sym: string }[] = [];
    positions.forEach(p => {
      if (p.type === 'C' && p.side === 'S') {
        const pct = pctMaxShortCall(p.entry, p.mark);
        if (pct >= 60)
          alerts.push({
            id: `t-${p.id}`,
            sym: p.ticker,
            text: `${p.ticker} call ${p.strike} at ${pct.toFixed(0)}% max profit. Consider close or roll.`,
          });
      }
      if (p.dte <= 2)
        alerts.push({
          id: `d-${p.id}`,
          sym: p.ticker,
          text: `${p.ticker} ${p.type} ${p.strike} expires in ${p.dte} day${p.dte === 1 ? '' : 's'}. Plan action.`,
        });
    });
    Object.entries(earnings).forEach(([t, d]) => {
      if (daysTo(d) <= 7)
        alerts.push({ id: `e-${t}`, sym: t, text: `${t} earnings ${d}. Mind assignment risk.` });
    });
    return alerts;
  }, [positions, earnings]);
}
