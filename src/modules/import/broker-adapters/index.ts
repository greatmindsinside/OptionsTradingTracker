/**
 * Broker Adapter Registry
 * Central registry and factory for all broker adapters
 */

import { BaseBrokerAdapter, BrokerType } from './base-adapter';
import type { BrokerDetectionResult } from './base-adapter';
import { TDAmeritradeBrokerAdapter } from './td-ameritrade-adapter';
import { SchwabBrokerAdapter } from './schwab-adapter';
import { RobinhoodBrokerAdapter } from './robinhood-adapter';
import { EtradeBrokerAdapter } from './etrade-adapter';
import { InteractiveBrokersBrokerAdapter } from './interactive-brokers-adapter';

/**
 * Registry of all available broker adapters
 */
export class BrokerAdapterRegistry {
  private adapters: Map<BrokerType, BaseBrokerAdapter> = new Map();

  constructor() {
    this.registerAdapters();
  }

  /**
   * Register all available adapters
   */
  private registerAdapters(): void {
    const adapters = [
      new TDAmeritradeBrokerAdapter(),
      new SchwabBrokerAdapter(),
      new RobinhoodBrokerAdapter(),
      new EtradeBrokerAdapter(),
      new InteractiveBrokersBrokerAdapter(),
    ];

    for (const adapter of adapters) {
      this.adapters.set(adapter.brokerName, adapter);
    }
  }

  /**
   * Get a specific adapter by broker type
   */
  getAdapter(brokerType: BrokerType): BaseBrokerAdapter | null {
    return this.adapters.get(brokerType) || null;
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): BaseBrokerAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get all supported broker types
   */
  getSupportedBrokers(): BrokerType[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Auto-detect the best adapter for given CSV headers
   */
  detectBroker(headers: string[]): BrokerDetectionResult | null {
    const results: BrokerDetectionResult[] = [];

    // Test all adapters
    for (const adapter of this.adapters.values()) {
      const result = adapter.canHandle(headers);
      if (result.confidence > 0) {
        results.push(result);
      }
    }

    // Sort by confidence (highest first)
    results.sort((a, b) => b.confidence - a.confidence);

    // Return the best match (if any)
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get detection results for all adapters (for debugging)
   */
  getAllDetectionResults(headers: string[]): BrokerDetectionResult[] {
    const results: BrokerDetectionResult[] = [];

    for (const adapter of this.adapters.values()) {
      results.push(adapter.canHandle(headers));
    }

    // Sort by confidence
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Create adapter instance by broker type
   */
  createAdapter(brokerType: BrokerType): BaseBrokerAdapter | null {
    const AdapterClass = this.getAdapterClass(brokerType);
    return AdapterClass ? new AdapterClass() : null;
  }

  /**
   * Get adapter class by broker type (for factory pattern)
   */
  private getAdapterClass(brokerType: BrokerType): (new () => BaseBrokerAdapter) | null {
    switch (brokerType) {
      case 'td_ameritrade':
        return TDAmeritradeBrokerAdapter;
      case 'schwab':
        return SchwabBrokerAdapter;
      case 'robinhood':
        return RobinhoodBrokerAdapter;
      case 'etrade':
        return EtradeBrokerAdapter;
      case 'interactive_brokers':
        return InteractiveBrokersBrokerAdapter;
      default:
        return null;
    }
  }
}

/**
 * Global registry instance
 */
export const brokerRegistry = new BrokerAdapterRegistry();

/**
 * Convenience functions for common operations
 */
export function getBrokerAdapter(brokerType: BrokerType): BaseBrokerAdapter | null {
  return brokerRegistry.getAdapter(brokerType);
}

export function detectBrokerFromHeaders(headers: string[]): BrokerDetectionResult | null {
  return brokerRegistry.detectBroker(headers);
}

export function getAllSupportedBrokers(): BrokerType[] {
  return brokerRegistry.getSupportedBrokers();
}

/**
 * Export adapter types for convenience
 */
export {
  TDAmeritradeBrokerAdapter,
  SchwabBrokerAdapter,
  RobinhoodBrokerAdapter,
  EtradeBrokerAdapter,
  InteractiveBrokersBrokerAdapter,
};

export type { BaseBrokerAdapter, BrokerType, BrokerDetectionResult } from './base-adapter';
