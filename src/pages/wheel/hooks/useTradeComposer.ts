import { useCallback, useState } from 'react';
import { z } from 'zod';

import type { OptType, Side } from '@/types/wheel';

/**
 * Zod schema for trade form validation
 */
export const TradeFormSchema = z.object({
  tradeSym: z
    .string()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be 20 characters or less')
    .trim()
    .toUpperCase(),
  tradeType: z.enum(['P', 'C'], { message: 'Type must be Put (P) or Call (C)' }),
  tradeSide: z.enum(['B', 'S'], { message: 'Side must be Buy (B) or Sell (S)' }),
  tradeQty: z
    .number()
    .int('Quantity must be a whole number')
    .positive('Quantity must be greater than 0'),
  tradeDTE: z.number().int('DTE must be a whole number').nonnegative('DTE cannot be negative'),
  tradeStrike: z.number().positive('Strike must be greater than 0'),
  tradeEntry: z.number().positive('Premium must be greater than 0'),
  tradeFees: z.number().nonnegative('Fees cannot be negative'),
});

export type TradeFormData = z.infer<typeof TradeFormSchema>;

export function useTradeComposer() {
  const [tradeSym, setTradeSym] = useState('');
  const [tradeType, setTradeType] = useState<OptType | ''>('');
  const [tradeSide, setTradeSide] = useState<Side | ''>('');
  const [tradeQty, setTradeQty] = useState('0');
  const [tradeDTE, setTradeDTE] = useState('0');
  const [tradeStrike, setTradeStrike] = useState('0');
  const [tradeEntry, setTradeEntry] = useState('0');
  const [tradeFees, setTradeFees] = useState('0');

  const resetForm = useCallback(() => {
    setTradeSym('');
    setTradeType('');
    setTradeSide('');
    setTradeQty('0');
    setTradeDTE('0');
    setTradeStrike('0');
    setTradeEntry('0');
    setTradeFees('0');
  }, []);

  const submitTrade = useCallback(() => {
    // Validation and submission logic can call into useJournal or useWheelStore
    // This stays UI-focused; persistence handled upstream
    // Note: Type and Side must be set before calling this
    if (!tradeType || (tradeType !== 'P' && tradeType !== 'C')) {
      throw new Error('Type must be Put (P) or Call (C)');
    }
    if (!tradeSide || (tradeSide !== 'B' && tradeSide !== 'S')) {
      throw new Error('Side must be Buy (B) or Sell (S)');
    }

    const formData: TradeFormData = {
      tradeSym,
      tradeType: tradeType as 'P' | 'C',
      tradeSide: tradeSide as 'B' | 'S',
      tradeQty: parseInt(tradeQty) || 0,
      tradeDTE: parseInt(tradeDTE) || 0,
      tradeStrike: parseFloat(tradeStrike) || 0,
      tradeEntry: parseFloat(tradeEntry) || 0,
      tradeFees: parseFloat(tradeFees) || 0,
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
