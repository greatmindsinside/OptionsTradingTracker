import { useState, useCallback } from 'react';
import type { OptType, Side } from '@/types/wheel';

export function useTradeComposer() {
  const [tradeSym, setTradeSym] = useState('');
  const [tradeType, setTradeType] = useState<OptType>('P');
  const [tradeSide, setTradeSide] = useState<Side>('S');
  const [tradeQty, setTradeQty] = useState(1);
  const [tradeDTE, setTradeDTE] = useState(30);
  const [tradeStrike, setTradeStrike] = useState(100);
  const [tradeEntry, setTradeEntry] = useState(1);
  const [tradeFees, setTradeFees] = useState(0);

  const resetForm = useCallback(() => {
    setTradeSym('');
    setTradeType('P');
    setTradeSide('S');
    setTradeQty(1);
    setTradeDTE(30);
    setTradeStrike(100);
    setTradeEntry(1);
    setTradeFees(0);
  }, []);

  const submitTrade = useCallback(() => {
    // Validation and submission logic can call into useJournal or useWheelStore
    // This stays UI-focused; persistence handled upstream
    if (!tradeSym) throw new Error('Symbol required');
    if (tradeQty <= 0) throw new Error('Qty must be > 0');
    if (tradeStrike <= 0) throw new Error('Strike must be > 0');
    if (tradeEntry < 0) throw new Error('Premium cannot be negative');
  }, [tradeSym, tradeQty, tradeStrike, tradeEntry]);

  return {
    form: {
      tradeSym,
      setTradeSym,
      tradeType,
      setTradeType,
      tradeSide,
      setTradeSide,
      tradeQty,
      setTradeQty,
      tradeDTE,
      setTradeDTE,
      tradeStrike,
      setTradeStrike,
      tradeEntry,
      setTradeEntry,
      tradeFees,
      setTradeFees,
    },
    resetForm,
    submitTrade,
  };
}
