import { z } from 'zod';

/**
 * Trade/Entry Types for Journal
 */
export const TradeTypeSchema = z.enum([
  'sell_to_open',
  'buy_to_close',
  'expiration',
  'assignment_shares',
  'share_sale',
  'dividend',
  'fee',
  'transfer',
  'correction',
  'option_premium',
]);

export type TradeType = z.infer<typeof TradeTypeSchema>;

/**
 * Journal Entry Schema with Zod validation
 */
export const EntrySchema = z.object({
  id: z.string(),
  ts: z.string(), // ISO date string
  account_id: z.string(),
  symbol: z.string(),
  type: TradeTypeSchema,
  qty: z.number().nullable(),
  amount: z.number(),
  strike: z.number().nullable(),
  expiration: z.string().nullable(), // ISO date string
  underlying_price: z.number().nullable(),
  notes: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()).optional(),
  // Audit trail fields
  deleted_at: z.string().nullable().optional(),
  edited_by: z.string().nullable().optional(),
  edit_reason: z.string().nullable().optional(),
  original_entry_id: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});

export type Entry = z.infer<typeof EntrySchema>;

/**
 * Filter state shape
 */
export const FilterStateSchema = z.object({
  symbol: z.string(),
  type: z.union([z.literal(''), TradeTypeSchema]),
  from: z.string(), // Date string (YYYY-MM-DD)
  to: z.string(),
  status: z.enum(['all', 'open', 'closed']),
});

export type FilterState = z.infer<typeof FilterStateSchema>;

/**
 * Summary totals
 */
export interface Totals {
  inc: number;
  out: number;
  net: number;
}

/**
 * Form data for new entries
 */
export interface NewEntryFormData {
  date: string;
  symbol: string;
  type: 'sellPut' | 'putAssigned' | 'sellCC' | 'callAssigned' | 'dividend' | 'fee';
  contracts: number;
  strike: number;
  premium: number;
  expiration: string;
  fee: number;
  amount: number;
  underlyingPrice: number;
  notes: string;
}
