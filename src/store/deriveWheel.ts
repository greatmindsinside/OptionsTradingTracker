import type { JournalEntry } from './journal';

export type Side = 'B' | 'S';
export type OptType = 'C' | 'P';

export type Position = {
  id: string;
  ticker: string;
  qty: number; // contracts
  strike: number;
  entry: number; // open premium
  mark: number; // placeholder (0)
  dte: number;
  type: OptType;
  side: Side; // 'S' for short
  opened: string; // YYYY-MM-DD
};

export type Lot = {
  id: string;
  ticker: string;
  qty: number; // shares (+/-)
  cost: number; // cost per share
  opened: string;
};

export function deriveWheelState(entries: JournalEntry[]) {
  const lots: Lot[] = [];
  const positions: Position[] = [];
  const earnings: Record<string, string> = {};

  const ymd = (iso: string) => (iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10));

  const pushLot = (ticker: string, shares: number, price: number, when: string) => {
    lots.push({
      id: crypto.randomUUID(),
      ticker,
      qty: shares,
      cost: price,
      opened: ymd(when),
    });
  };

  const openPos = (
    ticker: string,
    type: OptType,
    strike: number,
    contracts: number,
    premium: number,
    dte: number,
    when: string
  ) => {
    positions.push({
      id: crypto.randomUUID(),
      ticker,
      qty: contracts,
      strike,
      entry: premium,
      mark: 0,
      dte,
      type,
      side: 'S',
      opened: ymd(when),
    });
  };

  const closeAgainst = (ticker: string, type: OptType, strike: number, contracts: number) => {
    let remain = contracts;
    for (const p of positions) {
      if (remain <= 0) break;
      if (p.ticker === ticker && p.type === type && p.side === 'S' && p.strike === strike) {
        const use = Math.min(p.qty, remain);
        p.qty -= use;
        remain -= use;
      }
    }
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i].qty <= 0) positions.splice(i, 1);
    }
  };

  for (const e of entries) {
    const sym = (e.symbol || '').toUpperCase();
    switch (e.kind) {
      case 'earnings_set':
        if (sym && typeof e.meta?.date === 'string') earnings[sym] = e.meta.date as string;
        break;
      case 'sell_put':
        if (sym)
          openPos(sym, 'P', e.strike ?? 0, e.contracts ?? 1, e.premium ?? 0, e.dte ?? 0, e.when);
        break;
      case 'sell_call':
        if (sym)
          openPos(sym, 'C', e.strike ?? 0, e.contracts ?? 1, e.premium ?? 0, e.dte ?? 0, e.when);
        break;
      case 'buy_close':
        if (sym && e.type) closeAgainst(sym, e.type, e.strike ?? 0, e.contracts ?? 1);
        break;
      case 'roll_put':
        if (sym) {
          closeAgainst(sym, 'P', (e.meta?.fromStrike as number) ?? 0, e.contracts ?? 1);
          openPos(sym, 'P', e.strike ?? 0, e.contracts ?? 1, e.premium ?? 0, e.dte ?? 0, e.when);
        }
        break;
      case 'roll_call':
        if (sym) {
          closeAgainst(sym, 'C', (e.meta?.fromStrike as number) ?? 0, e.contracts ?? 1);
          openPos(sym, 'C', e.strike ?? 0, e.contracts ?? 1, e.premium ?? 0, e.dte ?? 0, e.when);
        }
        break;
      case 'put_assigned':
        if (sym) pushLot(sym, (e.contracts ?? 1) * 100, e.price ?? 0, e.when);
        break;
      case 'call_assigned':
        if (sym) pushLot(sym, -(e.contracts ?? 1) * 100, e.price ?? 0, e.when);
        break;
      case 'dividend':
      case 'fee':
      case 'symbol_tracked':
      default:
        break;
    }
  }

  const compactPositions = positions.filter(p => p.qty > 0);

  return { lots, positions: compactPositions, earnings };
}
