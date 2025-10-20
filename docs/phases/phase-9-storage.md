# Phase 9: Storage & Export 💾

## Goals

- Implement data backup and restore functionality
- Provide portable export formats
- Enable demo data reset capability
- Separate domain data from user preferences

## Inputs

- SQLite database with all user data
- User preferences and settings
- Export format requirements

## Outputs

- Database backup/restore system
- JSON export/import functionality
- Demo data management
- Data portability features

## Tasks Checklist

### Backup & Restore System

- [ ] Create `/src/modules/storage/idb.ts` for preferences
- [ ] Implement database backup to downloadable file
- [ ] Build database restore from uploaded file
- [ ] Add data integrity verification
- [ ] Build settings backup/restore separately from data

### Export Formats

- [ ] Create JSON export for all user data
- [ ] Implement JSON import with merge/replace options
- [ ] Implement selective export (date ranges, symbols)
- [ ] Build import/export progress indicators

### Demo Data Management

- [ ] Add "Reset to demo data" functionality
- [ ] Create export scheduling and automation

## Database Backup System

### Backup Implementation

```typescript
interface BackupService {
  // Create full database backup
  createBackup(): Promise<BackupFile>;

  // Restore from backup file
  restoreBackup(file: File): Promise<RestoreResult>;

  // Verify backup integrity
  verifyBackup(file: File): Promise<VerificationResult>;

  // Create incremental backup (changes only)
  createIncrementalBackup(lastBackupDate: Date): Promise<BackupFile>;
}

interface BackupFile {
  metadata: {
    version: string;
    created: Date;
    recordCount: number;
    checksum: string;
    type: 'full' | 'incremental';
  };
  data: {
    trades: any[];
    positions: any[];
    lots: any[];
    wheel: any[];
    prices: any[];
    settings: any[];
  };
}

class SQLiteBackupService implements BackupService {
  async createBackup(): Promise<BackupFile> {
    // Export all tables to JSON structure
    const tables = ['trades', 'positions', 'lots', 'lot_events', 'wheel', 'prices', 'settings'];
    const data: any = {};

    for (const table of tables) {
      data[table] = await db.query(`SELECT * FROM ${table}`);
    }

    const backup: BackupFile = {
      metadata: {
        version: '1.0.0',
        created: new Date(),
        recordCount: Object.values(data).reduce((sum, rows: any[]) => sum + rows.length, 0),
        checksum: await this.calculateChecksum(data),
        type: 'full',
      },
      data,
    };

    return backup;
  }

  async restoreBackup(file: File): Promise<RestoreResult> {
    const backup: BackupFile = JSON.parse(await file.text());

    // Verify backup integrity
    const verification = await this.verifyBackup(file);
    if (!verification.valid) {
      throw new Error(`Backup verification failed: ${verification.errors.join(', ')}`);
    }

    // Begin transaction for atomic restore
    await db.beginTransaction();

    try {
      // Clear existing data (optional - could merge instead)
      await this.clearAllTables();

      // Restore each table
      for (const [table, rows] of Object.entries(backup.data)) {
        await this.restoreTable(table, rows as any[]);
      }

      await db.commitTransaction();

      return {
        success: true,
        recordsRestored: backup.metadata.recordCount,
        version: backup.metadata.version,
      };
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }
  }

  private async calculateChecksum(data: any): Promise<string> {
    // Simple checksum for data integrity
    const dataString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
```

### Backup File Format

```typescript
interface BackupMetadata {
  version: string;          // App version that created backup
  created: Date;           // Backup creation timestamp
  recordCount: number;     // Total number of records
  checksum: string;        // Data integrity checksum
  type: 'full' | 'incremental';
  description?: string;    // User-provided description
  tags?: string[];         // User-provided tags
}

// Backup file structure
{
  "metadata": {
    "version": "1.0.0",
    "created": "2024-10-19T10:30:00.000Z",
    "recordCount": 1250,
    "checksum": "a1b2c3d4...",
    "type": "full",
    "description": "Monthly backup before tax processing"
  },
  "data": {
    "trades": [...],
    "positions": [...],
    "lots": [...],
    // ... other tables
  }
}
```

## JSON Export/Import System

### Structured JSON Export

```typescript
interface JSONExportService {
  // Export all data as structured JSON
  exportAllData(): Promise<ExportResult>;

  // Export filtered data
  exportFiltered(filters: ExportFilters): Promise<ExportResult>;

  // Import JSON data with conflict resolution
  importData(file: File, options: ImportOptions): Promise<ImportResult>;
}

interface ExportFilters {
  dateRange?: {
    start: Date;
    end: Date;
  };
  symbols?: string[];
  tables?: string[];
  includeCalculated?: boolean;
}

interface ImportOptions {
  conflictResolution: 'merge' | 'replace' | 'skip';
  validateData: boolean;
  preserveIds: boolean;
}

class JSONExportService {
  async exportAllData(): Promise<ExportResult> {
    const data = await this.gatherAllData();

    const exportData = {
      metadata: {
        exportedAt: new Date(),
        version: '1.0.0',
        recordCount: this.countRecords(data),
      },
      trades: data.trades,
      positions: data.positions,
      lots: data.lots,
      wheel: data.wheel,
      prices: data.prices,
      settings: data.settings.filter(s => !s.key.startsWith('system.')), // Exclude system settings
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    return {
      blob,
      filename: `options-tracker-export-${new Date().toISOString().slice(0, 10)}.json`,
      recordCount: exportData.metadata.recordCount,
    };
  }

  async exportFiltered(filters: ExportFilters): Promise<ExportResult> {
    const data = await this.gatherFilteredData(filters);

    // Similar to exportAllData but with filtered results
    return this.createExportFromData(data, `filtered-export-${Date.now()}.json`);
  }
}
```

## User Preferences Storage

### IndexedDB Preferences Manager

```typescript
interface PreferencesService {
  // Get user preference
  getPreference<T>(key: string): Promise<T | null>;

  // Set user preference
  setPreference<T>(key: string, value: T): Promise<void>;

  // Export all preferences
  exportPreferences(): Promise<PreferencesExport>;

  // Import preferences
  importPreferences(data: PreferencesExport): Promise<void>;
}

interface PreferencesExport {
  version: string;
  exportedAt: Date;
  preferences: Record<string, any>;
}

class IndexedDBPreferencesService implements PreferencesService {
  private dbName = 'options-tracker-preferences';
  private version = 1;

  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      };
    });
  }

  async getPreference<T>(key: string): Promise<T | null> {
    const db = await this.getDB();
    const transaction = db.transaction(['preferences'], 'readonly');
    const store = transaction.objectStore('preferences');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : null);
      };
    });
  }

  async setPreference<T>(key: string, value: T): Promise<void> {
    const db = await this.getDB();
    const transaction = db.transaction(['preferences'], 'readwrite');
    const store = transaction.objectStore('preferences');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, updatedAt: new Date() });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}
```

## Demo Data Management

### Demo Data Generator

```typescript
interface DemoDataService {
  // Reset to clean demo state
  resetToDemo(): Promise<void>;

  // Generate sample data
  generateSampleData(): Promise<DemoDataSet>;

  // Check if current data is demo data
  isDemoData(): Promise<boolean>;
}

interface DemoDataSet {
  trades: Trade[];
  positions: Position[];
  lots: Lot[];
  wheel: WheelStep[];
  prices: PriceData[];
}

class DemoDataService {
  async resetToDemo(): Promise<void> {
    const demoData = await this.generateSampleData();

    // Clear existing data
    await db.beginTransaction();

    try {
      await this.clearAllTables();
      await this.insertDemoData(demoData);
      await this.markAsDemo();

      await db.commitTransaction();
    } catch (error) {
      await db.rollbackTransaction();
      throw error;
    }
  }

  private async generateSampleData(): Promise<DemoDataSet> {
    // Generate realistic sample trades for common strategies
    const demoTrades: Trade[] = [
      // AAPL Covered Calls
      {
        underlying: 'AAPL',
        type: 'C',
        side: 'Sell',
        qty: 2,
        strike: 180,
        expiration: new Date('2024-01-19'),
        price: 3.5,
        amount: 700,
        fees: 1.3,
        sourceFile: 'demo',
      },

      // SPY Cash-Secured Puts
      {
        underlying: 'SPY',
        type: 'P',
        side: 'Sell',
        qty: 5,
        strike: 420,
        expiration: new Date('2024-02-16'),
        price: 2.8,
        amount: 1400,
        fees: 3.25,
        sourceFile: 'demo',
      },

      // Add more realistic demo trades...
    ];

    return {
      trades: demoTrades,
      positions: this.calculatePositionsFromTrades(demoTrades),
      lots: this.generateDemoLots(),
      wheel: this.generateDemoWheelCycles(),
      prices: this.generateDemoPrices(),
    };
  }
}
```

## File Management UI

### Export/Import Interface

```typescript
interface DataManagementProps {
  onExport: (type: 'backup' | 'json') => void;
  onImport: (file: File, type: 'backup' | 'json') => void;
  onReset: () => void;
}

const DataManagementPage: React.FC<DataManagementProps> = ({
  onExport,
  onImport,
  onReset
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  return (
    <div className="data-management">
      <section className="backup-section">
        <h2>Backup & Restore</h2>

        <div className="backup-actions">
          <button
            onClick={() => onExport('backup')}
            disabled={isProcessing}
          >
            Create Backup
          </button>

          <FileUpload
            accept=".db,.sqlite"
            onUpload={(file) => onImport(file, 'backup')}
            disabled={isProcessing}
          >
            Restore Backup
          </FileUpload>
        </div>

        {lastBackup && (
          <p className="last-backup">
            Last backup: {lastBackup.toLocaleString()}
          </p>
        )}
      </section>

      <section className="export-section">
        <h2>Export & Import</h2>

        <div className="export-actions">
          <button onClick={() => onExport('json')}>
            Export as JSON
          </button>

          <FileUpload
            accept=".json"
            onUpload={(file) => onImport(file, 'json')}
          >
            Import JSON
          </FileUpload>
        </div>
      </section>

      <section className="demo-section">
        <h2>Demo Data</h2>

        <button
          onClick={onReset}
          className="button--danger"
        >
          Reset to Demo Data
        </button>

        <p className="warning-text">
          This will permanently delete all your data and replace it with sample data.
        </p>
      </section>
    </div>
  );
};
```

## Dependencies

- Phase 1 (SQLite database) must be complete
- All data modules for complete export coverage

## Acceptance Tests

- [ ] Database backup creates valid SQLite file
- [ ] Restore recovers all data without corruption
- [ ] JSON export includes all user data
- [ ] JSON import handles conflicts gracefully
- [ ] Demo reset provides clean starting state
- [ ] Settings backup preserves user preferences
- [ ] Large exports complete without errors
- [ ] Data integrity checks pass after import/export
- [ ] Incremental backups capture only changes
- [ ] Export filters work correctly

## Risks & Mitigations

- **Risk:** Data corruption during export/import
  - **Mitigation:** Integrity checks, backup verification, atomic operations
- **Risk:** Large file size limits in browser
  - **Mitigation:** Compression, streaming exports, chunked processing
- **Risk:** Version compatibility between exports
  - **Mitigation:** Version tagging, migration support, format documentation

## Demo Script

```typescript
// Create full backup
const backup = await backupService.createBackup();
console.log(`Backup created: ${backup.metadata.recordCount} records`);

// Export filtered data
const jsonExport = await jsonService.exportFiltered({
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31'),
  },
  symbols: ['AAPL', 'SPY'],
});

// Reset to demo state
await demoService.resetToDemo();
console.log('Reset to demo data complete');

// Import previous backup
const restoreResult = await backupService.restoreBackup(backupFile);
console.log(`Restored ${restoreResult.recordsRestored} records`);

// Verify data integrity
const isValid = await backupService.verifyBackup(backupFile);
console.log(`Backup integrity: ${isValid.valid}`);
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Implement basic database backup functionality

**Previous Phase:** [Phase 8 - UI/UX](./phase-8-ui-ux.md)
**Next Phase:** [Phase 10 - Testing & Fixtures](./phase-10-testing.md)
