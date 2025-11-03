import { useMemo } from 'react';
import type { Entry } from '@/types/entry';
import type { TickerSummary, WheelMetrics } from '@/types/wheel';

/**
 * Custom hook to calculate wheel strategy metrics
 *
 * Purely computational: consumes the already-fetched (and filtered) entries array
 * from the store/UI and derives useful aggregates for the Wheel strategy views.
 * No database I/O happens here; the heavy lifting is done upstream when the
 * Journal page requests entries and totals from the sql.js database.
 */
export function useWheelCalculations(entries: Entry[]) {
  return useMemo(() => {
    // Calculate total IN, OUT, NET
    let totalIn = 0;
    let totalOut = 0;

    entries.forEach(entry => {
      if (entry.amount > 0) {
        totalIn += entry.amount;
      } else {
        totalOut += Math.abs(entry.amount);
      }
    });

    const netPL = totalIn - totalOut;

    // Group by ticker and calculate per-ticker metrics
    const byTicker = new Map<string, TickerSummary>();

    entries.forEach(entry => {
      if (!entry.symbol) return;

      if (!byTicker.has(entry.symbol)) {
        byTicker.set(entry.symbol, {
          symbol: entry.symbol,
          premiumCollected: 0,
          netPL: 0,
          sharesOwned: 0,
          avgCost: 0,
          openPuts: 0,
          openCalls: 0,
          dividends: 0,
          fees: 0,
          firstTrade: entry.ts,
          daysActive: 0,
        });
      }

      const summary = byTicker.get(entry.symbol)!;

      // Track first trade
      if (entry.ts < summary.firstTrade) {
        summary.firstTrade = entry.ts;
      }

      // Premium from selling options
      if (entry.type === 'sell_to_open' && entry.amount > 0) {
        summary.premiumCollected += entry.amount;
        if (entry.meta?.leg === 'put') summary.openPuts += entry.qty || 0;
        if (entry.meta?.leg === 'call') summary.openCalls += entry.qty || 0;
      }

      // Close positions
      if (entry.type === 'expiration' || entry.type === 'buy_to_close') {
        if (entry.meta?.leg === 'put' || entry.strike) {
          summary.openPuts = Math.max(0, summary.openPuts - (entry.qty || 0));
        }
        if (entry.meta?.leg === 'call') {
          summary.openCalls = Math.max(0, summary.openCalls - (entry.qty || 0));
        }
      }

      // Track shares
      if (entry.type === 'assignment_shares') {
        summary.sharesOwned += entry.qty || 0;
        if (entry.strike && entry.qty) {
          // Update average cost
          const prevTotal = summary.avgCost * (summary.sharesOwned - entry.qty);
          const newTotal = prevTotal + entry.strike * entry.qty;
          summary.avgCost = summary.sharesOwned > 0 ? newTotal / summary.sharesOwned : 0;
        }
      }

      if (entry.type === 'share_sale') {
        summary.sharesOwned -= entry.qty || 0;
      }

      // Track dividends and fees
      if (entry.type === 'dividend') {
        summary.dividends += entry.amount;
      }
      if (entry.type === 'fee') {
        summary.fees += Math.abs(entry.amount);
      }

      // Net P&L
      summary.netPL += entry.amount;
    });

    // Calculate days active for each ticker
    const now = new Date();
    byTicker.forEach(summary => {
      const firstDate = new Date(summary.firstTrade);
      summary.daysActive = Math.ceil((now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    });

    return {
      totalIn,
      totalOut,
      netPL,
      byTicker: Array.from(byTicker.values()),
    };
  }, [entries]);
}

/**
 * Calculate break-even and annualized return for a trade
 */
export function calculateWheelMetrics(
  tradeType: 'sellPut' | 'sellCC',
  strike: number,
  premium: number,
  dte: number,
  contracts: number
): WheelMetrics {
  let breakEven: number | null = null;
  let annualizedReturn: number | null = null;

  if (tradeType === 'sellPut' && strike > 0 && premium > 0) {
    breakEven = strike - premium;
  } else if (tradeType === 'sellCC' && strike > 0 && premium > 0) {
    breakEven = strike + premium;
  }

  if (premium > 0 && dte > 0 && strike > 0) {
    const totalPremium = premium * 100 * contracts;
    const collateral = strike * 100 * contracts;
    annualizedReturn = (totalPremium / collateral) * (365 / dte) * 100;
  }

  return {
    breakEven,
    dte,
    annualizedReturn,
  };
}
