import { z } from 'zod';

// Allowed journal entry types
export const EntryType = z.union([
  z.literal('option_premium'),
  z.literal('assignment_shares'),
  z.literal('share_sale'),
  z.literal('expiration'),
  z.literal('buy_to_close'),
  z.literal('sell_to_open'),
  z.literal('dividend'),
  z.literal('fee'),
  z.literal('transfer'),
  z.literal('correction'),
]);
export type EntryType = z.infer<typeof EntryType>;

export const JournalRow = z.object({
  id: z.string(),
  ts: z.string(), // ISO string
  account_id: z.string(),
  symbol: z.string().default(''),
  type: EntryType,
  qty: z.number().nullable().default(null), // shares or contracts (contracts for options)
  amount: z.number(), // + cash in, - cash out
  strike: z.number().nullable().default(null),
  expiration: z.string().nullable().default(null), // ISO date or yyyy-MM-dd
  underlying_price: z.number().nullable().default(null), // Stock price at entry (for wheel analysis)
  notes: z.string().nullable().default(null), // Trade notes, tags, or commentary
  meta: z.record(z.string(), z.any()).optional(), // arbitrary metadata
});
export type JournalRow = z.infer<typeof JournalRow>;
