/**
 * Shared template payload types for journal entry creation
 * Centralized type definitions to avoid duplication
 */

export type TemplateKind =
  | 'tmplSellPut'
  | 'tmplPutAssigned'
  | 'tmplSellCoveredCall'
  | 'tmplCallAssigned'
  | 'tmplDividend'
  | 'tmplFee'
  | 'tmplCorrection';

export interface TemplatePayloads {
  tmplSellPut: {
    contracts: number;
    premiumPerContract: number;
    strike: number;
    expiration: string | Date;
    fee?: number;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
  tmplPutAssigned: {
    contracts: number;
    strike: number;
    expiration: string | Date;
    fee?: number;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
  tmplSellCoveredCall: {
    contracts: number;
    premiumPerContract: number;
    strike: number;
    expiration: string | Date;
    fee?: number;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
  tmplCallAssigned: {
    contracts: number;
    strike: number;
    expiration: string | Date;
    fee?: number;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
  tmplDividend: {
    amount: number;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
  tmplFee: {
    amount: number;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
  tmplCorrection: {
    amount: number;
    note?: string;
    date?: string | Date;
    accountId?: string;
    symbol?: string;
  };
}
