/**
 * Lightweight Telemetry Utility
 *
 * - Controlled by env.features.analytics
 * - Persists recent events to localStorage for quick verification in dev
 * - Optionally POSTs to a custom endpoint if VITE_ANALYTICS_ENDPOINT is provided
 */
import { env } from '@/utils/env';

export type TelemetryEventName =
  | 'journal_edit_open'
  | 'journal_edit_close'
  | 'journal_edit_save'
  | 'journal_edit_error'
  | 'journal_drawer_open'
  | 'journal_drawer_close'
  // Trade drawer + DTE feature events
  | 'trade_dte_toggle_advanced'
  | 'trade_dte_date_change'
  | 'trade_add_success'
  | 'trade_add_error'
  | 'trade_dte_past_date_warn';

export interface TelemetryEvent {
  name: TelemetryEventName;
  ts: string; // ISO timestamp
  props?: Record<string, unknown>;
}

const STORAGE_KEY = 'telemetry.events';
const ENDPOINT = (import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined) || undefined;

function persistEvent(e: TelemetryEvent) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr: TelemetryEvent[] = raw ? JSON.parse(raw) : [];
    arr.push(e);
    // Limit to last 200 events to avoid unbounded growth
    const trimmed = arr.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    // Non-blocking
    if (env.features.debugMode) console.warn('telemetry.persistEvent failed', err);
  }
}

async function postEvent(e: TelemetryEvent) {
  if (!ENDPOINT) return; // No-op
  try {
    await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(e),
      keepalive: true,
    });
  } catch (err) {
    if (env.features.debugMode) console.warn('telemetry.postEvent failed', err);
  }
}

export function track(name: TelemetryEventName, props?: Record<string, unknown>) {
  const event: TelemetryEvent = { name, props, ts: new Date().toISOString() };

  // Always console.log in dev to make visibility easy
  if (env.isDevelopment) {
    console.log(`[telemetry] ${name}`, props || {});
  }

  if (!env.features.analytics) return; // Disabled

  persistEvent(event);
  void postEvent(event);
}

export function getRecentEvents(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
}
