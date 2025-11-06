import { useCallback,useState } from 'react';
import { z } from 'zod';

import type { OptType, Side } from '@/types/wheel';

/**
 * Zod schema for trade form validation
 */
export const TradeFormSchema = z.object({
  tradeSym: z.string().min(1, 'Symbol is required').max(20, 'Symbol must be 20 characters or less').trim().toUpperCase(),
  tradeType: z.enum(['P', 'C'], { message: 'Type must be Put (P) or Call (C)' }),
  tradeSide: z.enum(['B', 'S'], { message: 'Side must be Buy (B) or Sell (S)' }),
  tradeQty: z.number().int('Quantity must be a whole number').positive('Quantity must be greater than 0'),
  tradeDTE: z.number().int('DTE must be a whole number').nonnegative('DTE cannot be negative'),
  tradeStrike: z.number().positive('Strike must be greater than 0'),
  tradeEntry: z.number().nonnegative('Premium cannot be negative'),
  tradeFees: z.number().nonnegative('Fees cannot be negative'),
});

export type TradeFormData = z.infer<typeof TradeFormSchema>;

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
    const formData: TradeFormData = {
      tradeSym,
      tradeType,
      tradeSide,
      tradeQty,
      tradeDTE,
      tradeStrike,
      tradeEntry,
      tradeFees,
    };

    const result = TradeFormSchema.safeParse(formData);

    if (!result.success) {
      // Get the first validation error message for backward compatibility
      const firstError = result.error.issues[0];
      throw new Error(firstError?.message || 'Invalid form data');
    }
  }, [tradeSym, tradeType, tradeSide, tradeQty, tradeDTE, tradeStrike, tradeEntry, tradeFees]);

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
