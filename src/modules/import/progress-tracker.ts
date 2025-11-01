/**
 * Import Progress Tracking System
 * Real-time progress tracking for batch import operations
 */

export interface ImportProgress {
  id: string; // Unique import session ID
  status:
    | 'preparing'
    | 'parsing'
    | 'validating'
    | 'importing'
    | 'completed'
    | 'failed'
    | 'cancelled';
  startTime: Date;
  endTime?: Date;

  // Overall progress
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  skippedRecords: number;

  // Current operation
  currentPhase: string;
  currentRecord?: number;

  // Performance metrics
  recordsPerSecond?: number;
  estimatedTimeRemaining?: number; // in milliseconds

  // Error tracking
  errors: ImportError[];
  warnings: ImportWarning[];

  // Summary stats
  summary?: ImportSummary;
}

export interface ImportError {
  recordIndex: number;
  recordData?: Record<string, unknown>;
  field?: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
  timestamp: Date;
}

export interface ImportWarning {
  recordIndex: number;
  recordData?: Record<string, unknown>;
  field?: string;
  message: string;
  suggestion?: string;
  timestamp: Date;
}

export interface ImportSummary {
  duration: number; // Total time in milliseconds
  averageRecordsPerSecond: number;
  successRate: number; // 0-1

  // Breakdown by broker (if detected)
  brokerBreakdown?: Record<
    string,
    {
      records: number;
      successful: number;
      failed: number;
    }
  >;

  // Common issues found
  commonErrors: Array<{
    message: string;
    count: number;
    affectedRecords: number[];
  }>;

  commonWarnings: Array<{
    message: string;
    count: number;
    affectedRecords: number[];
  }>;
}

/**
 * Progress update callback type
 */
export type ProgressCallback = (progress: ImportProgress) => void;

/**
 * Import progress tracker
 */
export class ImportProgressTracker {
  private progress: ImportProgress;
  private callbacks: Set<ProgressCallback> = new Set();
  private updateInterval?: NodeJS.Timeout;
  private lastUpdateTime = 0;

  constructor(importId: string, totalRecords: number) {
    this.progress = {
      id: importId,
      status: 'preparing',
      startTime: new Date(),
      totalRecords,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      currentPhase: 'Initializing',
      errors: [],
      warnings: [],
    };
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Update current phase
   */
  setPhase(phase: string): void {
    this.progress.currentPhase = phase;
    this.notifyCallbacks();
  }

  /**
   * Update status
   */
  setStatus(status: ImportProgress['status']): void {
    this.progress.status = status;

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      this.progress.endTime = new Date();
      this.calculateSummary();
      this.stopPerformanceTracking();
    }

    this.notifyCallbacks();
  }

  /**
   * Record a successful import
   */
  recordSuccess(recordIndex: number): void {
    this.progress.processedRecords++;
    this.progress.successfulRecords++;
    this.progress.currentRecord = recordIndex;
    this.updatePerformanceMetrics();
    this.notifyCallbacks();
  }

  /**
   * Record a failed import
   */
  recordFailure(recordIndex: number, error: Omit<ImportError, 'recordIndex' | 'timestamp'>): void {
    this.progress.processedRecords++;
    this.progress.failedRecords++;
    this.progress.currentRecord = recordIndex;

    this.progress.errors.push({
      ...error,
      recordIndex,
      timestamp: new Date(),
    });

    this.updatePerformanceMetrics();
    this.notifyCallbacks();
  }

  /**
   * Record a skipped record
   */
  recordSkip(recordIndex: number, reason: string): void {
    this.progress.processedRecords++;
    this.progress.skippedRecords++;
    this.progress.currentRecord = recordIndex;

    this.progress.warnings.push({
      recordIndex,
      message: `Record skipped: ${reason}`,
      timestamp: new Date(),
    });

    this.updatePerformanceMetrics();
    this.notifyCallbacks();
  }

  /**
   * Record a warning
   */
  recordWarning(
    recordIndex: number,
    warning: Omit<ImportWarning, 'recordIndex' | 'timestamp'>
  ): void {
    this.progress.warnings.push({
      ...warning,
      recordIndex,
      timestamp: new Date(),
    });

    this.notifyCallbacks();
  }

  /**
   * Batch update multiple records (for performance)
   */
  batchUpdate(updates: {
    successful?: number;
    failed?: number;
    skipped?: number;
    errors?: Omit<ImportError, 'timestamp'>[];
    warnings?: Omit<ImportWarning, 'timestamp'>[];
  }): void {
    if (updates.successful) {
      this.progress.processedRecords += updates.successful;
      this.progress.successfulRecords += updates.successful;
    }

    if (updates.failed) {
      this.progress.processedRecords += updates.failed;
      this.progress.failedRecords += updates.failed;
    }

    if (updates.skipped) {
      this.progress.processedRecords += updates.skipped;
      this.progress.skippedRecords += updates.skipped;
    }

    if (updates.errors) {
      const now = new Date();
      this.progress.errors.push(
        ...updates.errors.map(error => ({
          ...error,
          timestamp: now,
        }))
      );
    }

    if (updates.warnings) {
      const now = new Date();
      this.progress.warnings.push(
        ...updates.warnings.map(warning => ({
          ...warning,
          timestamp: now,
        }))
      );
    }

    this.updatePerformanceMetrics();
    this.notifyCallbacks();
  }

  /**
   * Get current progress snapshot
   */
  getProgress(): ImportProgress {
    return { ...this.progress };
  }

  /**
   * Calculate estimated time remaining
   */
  private updatePerformanceMetrics(): void {
    const now = Date.now();
    const elapsed = now - this.progress.startTime.getTime();

    if (elapsed > 0 && this.progress.processedRecords > 0) {
      // Calculate records per second
      this.progress.recordsPerSecond = (this.progress.processedRecords * 1000) / elapsed;

      // Calculate estimated time remaining
      const remainingRecords = this.progress.totalRecords - this.progress.processedRecords;
      if (this.progress.recordsPerSecond > 0) {
        this.progress.estimatedTimeRemaining =
          (remainingRecords / this.progress.recordsPerSecond) * 1000;
      }
    }
  }

  /**
   * Start performance tracking (periodic updates)
   */
  startPerformanceTracking(intervalMs = 1000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.updatePerformanceMetrics();
      this.notifyCallbacks();
    }, intervalMs);
  }

  /**
   * Stop performance tracking
   */
  stopPerformanceTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
  }

  /**
   * Calculate final summary
   */
  private calculateSummary(): void {
    const duration = this.progress.endTime!.getTime() - this.progress.startTime.getTime();
    const averageRecordsPerSecond =
      duration > 0 ? (this.progress.processedRecords * 1000) / duration : 0;
    const successRate =
      this.progress.totalRecords > 0
        ? this.progress.successfulRecords / this.progress.totalRecords
        : 0;

    // Group errors by message
    const errorGroups = new Map<string, number[]>();
    for (const error of this.progress.errors) {
      const key = error.message;
      if (!errorGroups.has(key)) {
        errorGroups.set(key, []);
      }
      errorGroups.get(key)!.push(error.recordIndex);
    }

    const commonErrors = Array.from(errorGroups.entries())
      .map(([message, recordIndices]) => ({
        message,
        count: recordIndices.length,
        affectedRecords: recordIndices,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 errors

    // Group warnings by message
    const warningGroups = new Map<string, number[]>();
    for (const warning of this.progress.warnings) {
      const key = warning.message;
      if (!warningGroups.has(key)) {
        warningGroups.set(key, []);
      }
      warningGroups.get(key)!.push(warning.recordIndex);
    }

    const commonWarnings = Array.from(warningGroups.entries())
      .map(([message, recordIndices]) => ({
        message,
        count: recordIndices.length,
        affectedRecords: recordIndices,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 warnings

    this.progress.summary = {
      duration,
      averageRecordsPerSecond,
      successRate,
      commonErrors,
      commonWarnings,
    };
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(): void {
    const now = Date.now();

    // Throttle updates (max 10 updates per second)
    if (now - this.lastUpdateTime < 100) {
      return;
    }

    this.lastUpdateTime = now;

    for (const callback of this.callbacks) {
      try {
        callback(this.getProgress());
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    }
  }

  /**
   * Cancel the import
   */
  cancel(): void {
    this.setStatus('cancelled');
  }

  /**
   * Reset progress (for restarting)
   */
  reset(): void {
    this.progress = {
      ...this.progress,
      status: 'preparing',
      startTime: new Date(),
      endTime: undefined,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      currentPhase: 'Initializing',
      currentRecord: undefined,
      recordsPerSecond: undefined,
      estimatedTimeRemaining: undefined,
      errors: [],
      warnings: [],
      summary: undefined,
    };

    this.stopPerformanceTracking();
    this.notifyCallbacks();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPerformanceTracking();
    this.callbacks.clear();
  }
}

/**
 * Progress tracker factory
 */
export class ImportProgressFactory {
  private static trackers = new Map<string, ImportProgressTracker>();

  /**
   * Create a new progress tracker
   */
  static create(importId: string, totalRecords: number): ImportProgressTracker {
    const tracker = new ImportProgressTracker(importId, totalRecords);
    this.trackers.set(importId, tracker);
    return tracker;
  }

  /**
   * Get existing tracker
   */
  static get(importId: string): ImportProgressTracker | undefined {
    return this.trackers.get(importId);
  }

  /**
   * Remove tracker
   */
  static remove(importId: string): void {
    const tracker = this.trackers.get(importId);
    if (tracker) {
      tracker.destroy();
      this.trackers.delete(importId);
    }
  }

  /**
   * Get all active trackers
   */
  static getAll(): ImportProgressTracker[] {
    return Array.from(this.trackers.values());
  }

  /**
   * Clean up completed trackers
   */
  static cleanup(): void {
    for (const [, tracker] of this.trackers.entries()) {
      const progress = tracker.getProgress();
      if (['completed', 'failed', 'cancelled'].includes(progress.status)) {
        // Keep completed trackers for a while (can be removed manually)
        // tracker.destroy();
        // this.trackers.delete(id);
      }
    }
  }
}

/**
 * Utility functions for progress formatting
 */
export class ProgressFormatter {
  /**
   * Format progress as percentage
   */
  static formatPercentage(progress: ImportProgress): string {
    if (progress.totalRecords === 0) return '0%';
    const percent = (progress.processedRecords / progress.totalRecords) * 100;
    return `${Math.round(percent)}%`;
  }

  /**
   * Format estimated time remaining
   */
  static formatTimeRemaining(milliseconds?: number): string {
    if (!milliseconds || milliseconds <= 0) return 'Unknown';

    const seconds = Math.round(milliseconds / 1000);

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format records per second
   */
  static formatRecordsPerSecond(rps?: number): string {
    if (!rps) return '0 rec/s';
    if (rps < 1) return `${(rps * 60).toFixed(1)} rec/min`;
    return `${Math.round(rps)} rec/s`;
  }

  /**
   * Format duration
   */
  static formatDuration(milliseconds: number): string {
    return this.formatTimeRemaining(milliseconds);
  }

  /**
   * Format success rate
   */
  static formatSuccessRate(rate: number): string {
    return `${Math.round(rate * 100)}%`;
  }
}
