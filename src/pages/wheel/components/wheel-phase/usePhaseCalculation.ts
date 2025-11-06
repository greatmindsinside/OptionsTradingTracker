import { useMemo } from 'react';

import { useWheelPhase } from '@/pages/wheel/hooks/useWheelPhase';

export function usePhaseCalculation(ticker: string) {
  const phase = useWheelPhase(ticker);
  return useMemo(() => ({ phase }), [phase]);
}
