import { toIso, uid } from '@/lib/format';
import { type JournalRow } from '@/models/journal';

// Multiplier for options (shares per contract)
const OPT_MULT = 100;

type Common = {
  accountId: string;
  symbol: string;
  date: string | Date;
  underlyingPrice?: number;
  notes?: string;
};

// Helper to create a base row with all required fields
function baseRow(
  p: Common,
  type: JournalRow['type'],
  amount: number,
  extra?: Partial<
    Omit<
      JournalRow,
      'id' | 'ts' | 'account_id' | 'symbol' | 'type' | 'amount' | 'underlying_price' | 'notes'
    >
  >
): JournalRow {
  return {
    id: uid(),
    ts: toIso(p.date),
    account_id: p.accountId,
    symbol: p.symbol,
    type,
    qty: null,
    amount,
    strike: null,
    expiration: null,
    underlying_price: p.underlyingPrice ?? null,
    notes: p.notes ?? null,
    meta: {},
    ...extra,
  };
}

export function tmplSellPut(
  p: Common & {
    contracts: number;
    premiumPerContract: number;
    strike: number;
    expiration: string | Date;
    fee?: number;
  }
): JournalRow[] {
  const exp = toIso(p.expiration);
  const rows: JournalRow[] = [
    baseRow(p, 'sell_to_open', p.premiumPerContract * OPT_MULT * p.contracts, {
      qty: p.contracts,
      strike: p.strike,
      expiration: exp,
      meta: { leg: 'put', template: 'tmplSellPut' },
    }),
  ];
  if (p.fee && p.fee !== 0) {
    rows.push(baseRow(p, 'fee', -Math.abs(p.fee), { meta: { template: 'tmplSellPut' } }));
  }
  // add zero-amount expiration to close the leg later
  rows.push(
    baseRow({ ...p, date: exp }, 'expiration', 0, {
      qty: p.contracts,
      strike: p.strike,
      expiration: exp,
      meta: { closes: 'sell_to_open' },
    })
  );
  return rows;
}

export function tmplPutAssigned(
  p: Common & { contracts: number; strike: number; expiration: string | Date; fee?: number }
): JournalRow[] {
  const exp = toIso(p.expiration);
  const rows: JournalRow[] = [
    // Close option leg via expiration zero
    baseRow(p, 'expiration', 0, {
      qty: p.contracts,
      strike: p.strike,
      expiration: exp,
      meta: { assigned: true },
    }),
    // Assigned shares purchase (cash out)
    baseRow(p, 'assignment_shares', -(p.strike * OPT_MULT * p.contracts), {
      qty: p.contracts * OPT_MULT,
      strike: p.strike,
      expiration: exp,
      meta: { from: 'put' },
    }),
  ];
  if (p.fee && p.fee !== 0) {
    rows.push(baseRow(p, 'fee', -Math.abs(p.fee), { meta: { template: 'tmplPutAssigned' } }));
  }
  return rows;
}

export function tmplSellCoveredCall(
  p: Common & {
    contracts: number;
    premiumPerContract: number;
    strike: number;
    expiration: string | Date;
    fee?: number;
  }
): JournalRow[] {
  const exp = toIso(p.expiration);
  const rows: JournalRow[] = [
    baseRow(p, 'sell_to_open', p.premiumPerContract * OPT_MULT * p.contracts, {
      qty: p.contracts,
      strike: p.strike,
      expiration: exp,
      meta: { leg: 'call', template: 'tmplSellCoveredCall' },
    }),
  ];
  if (p.fee && p.fee !== 0) {
    rows.push(baseRow(p, 'fee', -Math.abs(p.fee), { meta: { template: 'tmplSellCoveredCall' } }));
  }
  rows.push(
    baseRow({ ...p, date: exp }, 'expiration', 0, {
      qty: p.contracts,
      strike: p.strike,
      expiration: exp,
      meta: { closes: 'sell_to_open' },
    })
  );
  return rows;
}

export function tmplCallAssigned(
  p: Common & { contracts: number; strike: number; expiration: string | Date; fee?: number }
): JournalRow[] {
  const exp = toIso(p.expiration);
  const rows: JournalRow[] = [
    // Option closes
    baseRow(p, 'expiration', 0, {
      qty: p.contracts,
      strike: p.strike,
      expiration: exp,
      meta: { assigned: true },
    }),
    // Shares called away (cash in)
    baseRow(p, 'share_sale', p.strike * OPT_MULT * p.contracts, {
      qty: p.contracts * OPT_MULT,
      strike: p.strike,
      expiration: exp,
      meta: { from: 'call' },
    }),
  ];
  if (p.fee && p.fee !== 0) {
    rows.push(baseRow(p, 'fee', -Math.abs(p.fee), { meta: { template: 'tmplCallAssigned' } }));
  }
  return rows;
}

export function tmplDividend(p: Common & { amount: number }): JournalRow[] {
  return [baseRow(p, 'dividend', Math.abs(p.amount))];
}

export function tmplFee(p: Common & { amount: number }): JournalRow[] {
  return [baseRow(p, 'fee', -Math.abs(p.amount))];
}

export function tmplCorrection(p: Common & { amount: number; note?: string }): JournalRow[] {
  return [baseRow(p, 'correction', p.amount, { meta: { note: p.note } })];
}

export function tmplBuyShares(
  p: Common & { shares: number; pricePerShare: number; fee?: number }
): JournalRow[] {
  const rows: JournalRow[] = [
    // Purchase shares (cash out)
    baseRow(p, 'assignment_shares', -(p.pricePerShare * p.shares), {
      qty: p.shares,
      strike: p.pricePerShare,
      meta: { from: 'direct_purchase', template: 'tmplBuyShares' },
    }),
  ];
  if (p.fee && p.fee !== 0) {
    rows.push(baseRow(p, 'fee', -Math.abs(p.fee), { meta: { template: 'tmplBuyShares' } }));
  }
  return rows;
}

export function tmplSellShares(
  p: Common & { shares: number; pricePerShare: number; fee?: number }
): JournalRow[] {
  const rows: JournalRow[] = [
    // Sell shares (cash in)
    baseRow(p, 'share_sale', p.pricePerShare * p.shares, {
      qty: p.shares,
      strike: p.pricePerShare,
      meta: { from: 'direct_sale', template: 'tmplSellShares' },
    }),
  ];
  if (p.fee && p.fee !== 0) {
    rows.push(baseRow(p, 'fee', -Math.abs(p.fee), { meta: { template: 'tmplSellShares' } }));
  }
  return rows;
}
