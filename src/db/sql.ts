// Types from sql.js
import type { Database, SqlJsStatic } from 'sql.js';
import schemaSql from '@/db/schema.sql?raw';
import type { JournalRow } from '@/models/journal';
// In Vite, import the wasm asset as a URL so sql.js can locate it at runtime
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – Vite will resolve the asset URL
// Note: We keep the wasm in public/sql-wasm.wasm via locateFile; URL import not required here.

let SQL: SqlJsStatic; // sql.js module
let db: Database; // SQL.Database
let ready = false;
const DB_NAME = 'options-tracker.db';

type OPFSRoot = FileSystemDirectoryHandle; // OPFS directory handle
let opfsRoot: OPFSRoot | null = null;

async function getOpfsRoot(): Promise<OPFSRoot | null> {
  try {
    if (navigator?.storage?.getDirectory) {
      return await navigator.storage.getDirectory();
    }
    return null;
  } catch {
    return null;
  }
}

async function opfsReadFile(name: string): Promise<Uint8Array | null> {
  try {
    if (!opfsRoot) return null;
    const handle = await opfsRoot.getFileHandle(name, { create: false });
    const file = await handle.getFile();
    const buf = await file.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function opfsWriteFile(name: string, data: Uint8Array) {
  if (!opfsRoot) return;
  const handle = await opfsRoot.getFileHandle(name, { create: true });
  const stream = await handle.createWritable();
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  await stream.write(new Blob([buf]));
  await stream.close();
}

function lsGet(name: string): Uint8Array | null {
  const b64 = localStorage.getItem(name);
  if (!b64) return null;
  try {
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
  } catch {
    return null;
  }
}

function lsSet(name: string, data: Uint8Array) {
  let bin = '';
  for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]);
  const b64 = btoa(bin);
  localStorage.setItem(name, b64);
}

function applySchemaIfNeeded() {
  const exists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='journal'");
  if (!exists || !exists[0] || exists[0].values.length === 0) {
    db.exec(schemaSql);
    // minimal seed: one account and an example row
    db.run('INSERT INTO accounts (id, name) VALUES (?, ?) ON CONFLICT(id) DO NOTHING;', [
      'acct-1',
      'Primary',
    ]);
    db.run(
      'INSERT INTO journal (id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [
        'seed-1',
        new Date().toISOString(),
        'acct-1',
        'AAPL',
        'dividend',
        0,
        5.0,
        null,
        null,
        null,
        null,
        JSON.stringify({ note: 'Welcome seed' }),
      ]
    );
  }
}

export async function initDb() {
  if (ready) return;
  // Align with wheel module's loader to avoid divergence.
  let initSqlJsFn: ((opts?: Record<string, unknown>) => Promise<SqlJsStatic>) | undefined;

  try {
    // Attempt to import the UMD which registers window.initSqlJs under Vite
    await import('sql.js');
    initSqlJsFn = (window as unknown as { initSqlJs?: (config?: unknown) => Promise<SqlJsStatic> })
      .initSqlJs as ((opts?: Record<string, unknown>) => Promise<SqlJsStatic>) | undefined;
  } catch (e) {
    console.warn('[sql] Primary import of sql.js failed; will try script fallback', e);
  }

  if (typeof initSqlJsFn !== 'function') {
    // Fallback: dynamically add script tag as in modules/db/sqlite.ts
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/node_modules/sql.js/dist/sql-wasm.js';
      script.type = 'text/javascript';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load sql-wasm.js'));
      document.head.appendChild(script);
    });
    initSqlJsFn = (window as unknown as { initSqlJs?: (config?: unknown) => Promise<SqlJsStatic> })
      .initSqlJs as ((opts?: Record<string, unknown>) => Promise<SqlJsStatic>) | undefined;
  }

  if (typeof initSqlJsFn !== 'function') {
    console.error(
      '[sql] initSqlJs not found on window. Keys:',
      Object.keys(window).filter(k => k.toLowerCase().includes('sql'))
    );
    throw new Error('Failed to load sql.js initializer');
  }

  // Ensure the WASM file can be fetched; use public/sql-wasm.wasm when requested
  SQL = await initSqlJsFn({
    locateFile: (file: string) => (file.endsWith('.wasm') ? '/sql-wasm.wasm' : file),
  });

  opfsRoot = await getOpfsRoot();

  let data: Uint8Array | null = null;
  if (opfsRoot) data = await opfsReadFile(DB_NAME);
  if (!data) data = lsGet(DB_NAME);

  db = data ? new SQL.Database(data) : new SQL.Database();
  applySchemaIfNeeded();
  ready = true;
}

export function all<T = unknown>(sql: string, params: (number | string | null)[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as unknown as import('sql.js').BindParams);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    return rows;
  } finally {
    stmt.free();
  }
}

export function run(sql: string, params: (number | string | null)[] = []) {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as unknown as import('sql.js').BindParams);
    stmt.step();
  } finally {
    stmt.free();
  }
}

export async function saveDb() {
  const data = db.export();
  const u8 = new Uint8Array(data);
  if (opfsRoot) await opfsWriteFile(DB_NAME, u8);
  else lsSet(DB_NAME, u8);
}

export async function insertJournalRows(rows: JournalRow[]) {
  const insert = db.prepare(
    'INSERT INTO journal (id, ts, account_id, symbol, type, qty, amount, strike, expiration, underlying_price, notes, meta) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
  );
  try {
    db.run('BEGIN');
    for (const r of rows) {
      insert.run([
        r.id,
        r.ts,
        r.account_id,
        r.symbol,
        r.type,
        r.qty ?? null,
        r.amount,
        r.strike ?? null,
        r.expiration ?? null,
        r.underlying_price ?? null,
        r.notes ?? null,
        r.meta ? JSON.stringify(r.meta) : null,
      ]);
    }
    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  } finally {
    insert.free();
  }
}
