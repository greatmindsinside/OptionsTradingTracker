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
  for (let i = 0; i < data.length; i++) bin += String.fromCharCode(data[i]!);
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

  // Run migrations for existing databases
  runMigrations();
}

function runMigrations() {
  // Check if audit columns exist
  try {
    const columns = db.exec('PRAGMA table_info(journal)');
    if (columns && columns[0]) {
      const columnNames = columns[0].values.map(col => col[1] as string);

      // Migration 001: Add audit columns if they don't exist
      if (!columnNames.includes('deleted_at')) {
        console.log('Running migration: Add audit columns to journal table');
        db.exec(`
          ALTER TABLE journal ADD COLUMN deleted_at TEXT DEFAULT NULL;
          ALTER TABLE journal ADD COLUMN edited_by TEXT DEFAULT NULL;
          ALTER TABLE journal ADD COLUMN edit_reason TEXT DEFAULT NULL;
          ALTER TABLE journal ADD COLUMN original_entry_id TEXT DEFAULT NULL;
          ALTER TABLE journal ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
          ALTER TABLE journal ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
        `);
        db.exec('CREATE INDEX IF NOT EXISTS idx_journal_deleted_at ON journal(deleted_at);');
        console.log('✅ Migration complete: Audit columns added');
      }
    }
  } catch (e) {
    console.error('Migration error:', e);
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

export function all<T = unknown>(
  sql: string,
  params: (number | string | null)[] = [],
  includeDeleted = false
): T[] {
  let modifiedSql = sql;

  // Automatically filter out deleted entries unless explicitly included
  if (!includeDeleted && sql.toLowerCase().includes('from journal')) {
    const sqlLower = sql.toLowerCase();

    // Check if WHERE clause already exists
    if (sqlLower.includes('where')) {
      // Don't modify if deleted_at is already in the query
      if (!sqlLower.includes('deleted_at')) {
        modifiedSql = sql.replace(/WHERE/i, 'WHERE deleted_at IS NULL AND');
      }
    } else {
      // Add WHERE clause before ORDER BY, GROUP BY, or LIMIT
      const insertPoint = sql.search(/\b(ORDER\s+BY|GROUP\s+BY|LIMIT)\b/i);
      if (insertPoint !== -1) {
        modifiedSql =
          sql.slice(0, insertPoint) + 'WHERE deleted_at IS NULL ' + sql.slice(insertPoint);
      } else {
        modifiedSql = sql + ' WHERE deleted_at IS NULL';
      }
    }
  }

  const stmt = db.prepare(modifiedSql);
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

/**
 * @deprecated This function is no longer used. Expiration updates are now handled via localStorage overrides.
 * See src/utils/dteOverrides.ts for the new implementation.
 * Kept for reference but should not be called by any code.
 */
// Update all journal rows for a given symbol/strike/expiration to a new expiration date (YYYY-MM-DD)
// Returns the number of rows affected (best-effort; not used by callers yet)
export async function updateExpirationForPosition(
  symbol: string,
  strike: number,
  oldExpirationYmd: string,
  newExpirationYmd: string
): Promise<number> {
  // Ensure DB is ready
  if (!ready) await initDb();
  // Store ISO timestamp; journal.expiration is full ISO string
  const newIso = new Date(newExpirationYmd).toISOString();

  console.log('🗄️ updateExpirationForPosition:', {
    symbol,
    strike,
    oldExpirationYmd,
    newExpirationYmd,
    newIso,
  });

  // First, let's see what journal entries exist for this symbol
  const allSymbolEntries = all<{
    id: string;
    strike: number | null;
    expiration: string | null;
    type: string;
    deleted_at: string | null;
  }>(`SELECT id, strike, expiration, type, deleted_at FROM journal WHERE symbol = ?`, [symbol]);
  console.log('📋 All journal entries for symbol', symbol, ':', allSymbolEntries);

  // Check specifically for matching entries
  const debugMatch = all<{
    id: string;
    strike: number | null;
    expiration: string | null;
    deleted_at: string | null;
  }>(
    `SELECT id, strike, substr(expiration,1,10) as exp_ymd, deleted_at FROM journal 
     WHERE symbol = ? AND strike = ? AND substr(expiration,1,10) = ?`,
    [symbol, strike, oldExpirationYmd]
  );
  console.log('🔍 Debug: matching entries WITHOUT deleted_at check:', debugMatch);

  // We update all non-deleted rows that share the same option identity
  // (symbol, strike, expiration by YMD). This covers sell_to_open and option_premium rows.
  const sql = `UPDATE journal
               SET expiration = ?
               WHERE symbol = ?
                 AND strike = ?
                 AND substr(expiration,1,10) = ?
                 AND deleted_at IS NULL`;

  // Estimate affected rows (pre-update)
  const before = all<{ id: string }>(
    `SELECT id FROM journal WHERE symbol = ? AND strike = ? AND substr(expiration,1,10) = ? AND deleted_at IS NULL`,
    [symbol, String(strike), oldExpirationYmd]
  );

  console.log(
    '📊 Rows matching before update (strike=' + strike + ', oldExp=' + oldExpirationYmd + '):',
    before.length,
    before
  );

  run(sql, [newIso, symbol, String(strike), oldExpirationYmd]);
  await saveDb();

  console.log('💾 Database saved');

  return before.length;
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

// Soft delete: mark entry as deleted with timestamp
export function softDelete(entryId: string, reason?: string) {
  const now = new Date().toISOString();

  // Check if audit columns exist
  try {
    const columns = db.exec('PRAGMA table_info(journal)');
    const hasAuditColumns =
      columns && columns[0] && columns[0].values.some(col => col[1] === 'deleted_at');

    if (hasAuditColumns) {
      // Use full update with audit columns
      run(
        `UPDATE journal 
         SET deleted_at = ?, edit_reason = ?, updated_at = ?
         WHERE id = ?`,
        [now, reason || 'User deleted', now, entryId]
      );
    } else {
      // Fallback: use hard delete if audit columns don't exist
      console.warn('Audit columns not found, performing hard delete instead of soft delete');
      run(`DELETE FROM journal WHERE id = ?`, [entryId]);
    }
  } catch (e) {
    console.error('Error in softDelete:', e);
    // Last resort: try hard delete
    run(`DELETE FROM journal WHERE id = ?`, [entryId]);
  }
}

// Restore deleted entry
export function restoreEntry(entryId: string) {
  try {
    const columns = db.exec('PRAGMA table_info(journal)');
    const hasAuditColumns =
      columns && columns[0] && columns[0].values.some(col => col[1] === 'deleted_at');

    if (hasAuditColumns) {
      run(
        `UPDATE journal 
         SET deleted_at = NULL, edit_reason = NULL, updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), entryId]
      );
    } else {
      console.warn(
        'Audit columns not found, restore operation not supported for this database version'
      );
    }
  } catch (e) {
    console.error('Error in restoreEntry:', e);
  }
}

// Hard delete (admin only, for cleanup)
export function hardDelete(entryId: string) {
  run('DELETE FROM journal WHERE id = ?', [entryId]);
}
