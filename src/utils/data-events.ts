/**
 * Data update event system
 * Simple event system to notify components when data changes
 */

export type DataUpdateEventType = 'trades_imported' | 'wheel_updated' | 'portfolio_updated';

export interface DataUpdateEvent {
  type: DataUpdateEventType;
  timestamp: number;
  data?: unknown;
}

class DataUpdateEventEmitter {
  private listeners: Map<DataUpdateEventType, Set<(event: DataUpdateEvent) => void>> = new Map();

  /**
   * Subscribe to data update events
   */
  subscribe(type: DataUpdateEventType, callback: (event: DataUpdateEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(callback);
    };
  }

  /**
   * Emit a data update event
   */
  emit(type: DataUpdateEventType, data?: unknown): void {
    const event: DataUpdateEvent = {
      type,
      timestamp: Date.now(),
      data,
    };

    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in data update listener for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event type
   */
  removeAllListeners(type: DataUpdateEventType): void {
    this.listeners.delete(type);
  }

  /**
   * Remove all listeners
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Global instance
export const dataUpdateEmitter = new DataUpdateEventEmitter();

/**
 * React hook for subscribing to data updates
 */
import { useEffect } from 'react';

export function useDataUpdates(
  type: DataUpdateEventType,
  callback: (event: DataUpdateEvent) => void
): void {
  useEffect(() => {
    const unsubscribe = dataUpdateEmitter.subscribe(type, callback);
    return unsubscribe; // Cleanup on unmount
  }, [type, callback]);
}
