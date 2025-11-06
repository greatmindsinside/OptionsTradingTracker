/**
 * Environment configuration with type safety
 *
 * This module provides typed access to environment variables
 * and handles fallbacks for missing values.
 */

import { z } from 'zod';

interface EnvironmentConfig {
  // Application metadata
  app: {
    title: string;
    version: string;
    description: string;
  };

  // API configuration
  api: {
    baseUrl: string;
    timeout: number;
  };

  // Feature flags
  features: {
    debugMode: boolean;
    analytics: boolean;
    performanceMonitoring: boolean;
    // New feature flags
    journalEditDrawer?: boolean; // Slide-in editor for Journal entries
    journalEditFlow?: boolean; // Enable full-field edit flow
    tradeDTE?: boolean; // Trade drawer DTE UI (date picker + advanced input)
  };

  // Database configuration
  database: {
    name: string;
    version: number;
  };

  // CSV import settings
  csv: {
    maxFileSizeMB: number;
    supportedBrokers: string[];
  };

  // Chart configuration
  chart: {
    theme: 'light' | 'dark';
    animationDuration: number;
  };

  // Environment type
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Parse boolean environment variable with fallback
 */
function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === 'true';
}

/**
 * Parse number environment variable with fallback
 */
function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Parse array environment variable with fallback
 */
function parseArray(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

/**
 * Get current environment configuration
 */
export const env: EnvironmentConfig = {
  app: {
    title: import.meta.env.VITE_APP_TITLE || 'Options Trading Tracker',
    version: import.meta.env.VITE_APP_VERSION || '0.1.0',
    description:
      import.meta.env.VITE_APP_DESCRIPTION || 'Track and analyze your options trading strategies',
  },

  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    timeout: parseNumber(import.meta.env.VITE_API_TIMEOUT, 10000),
  },

  features: {
    debugMode: parseBool(import.meta.env.VITE_ENABLE_DEBUG_MODE, import.meta.env.DEV),
    analytics: parseBool(import.meta.env.VITE_ENABLE_ANALYTICS, false),
    performanceMonitoring: parseBool(import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING, false),
    journalEditDrawer: parseBool(import.meta.env.VITE_FEATURE_JOURNAL_EDIT_DRAWER, false),
    journalEditFlow: parseBool(import.meta.env.VITE_FEATURE_JOURNAL_EDIT_FLOW, false),
    // Trade DTE feature flag (drawer UI for expiration + advanced DTE)
    tradeDTE: parseBool(import.meta.env.VITE_FEATURE_TRADE_DTE, false),
  },

  database: {
    name: import.meta.env.VITE_DB_NAME || 'options_tracker',
    version: parseNumber(import.meta.env.VITE_DB_VERSION, 1),
  },

  csv: {
    maxFileSizeMB: parseNumber(import.meta.env.VITE_MAX_FILE_SIZE_MB, 50),
    supportedBrokers: parseArray(import.meta.env.VITE_SUPPORTED_BROKERS, [
      'td_ameritrade',
      'schwab',
      'robinhood',
      'etrade',
      'interactive_brokers',
    ]),
  },

  chart: {
    theme: (import.meta.env.VITE_CHART_THEME as 'light' | 'dark') || 'light',
    animationDuration: parseNumber(import.meta.env.VITE_CHART_ANIMATION_DURATION, 300),
  },

  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isTest: import.meta.env.MODE === 'test',
};

/**
 * Validate required environment variables
 */
export function validateEnvironment(): void {
  // Warn-only Zod validation of the resolved env config
  const EnvSchema = z.object({
    app: z.object({
      title: z.string().min(1),
      version: z.string().min(1),
      description: z.string().min(1),
    }),
    api: z.object({
      baseUrl: z.string().url().or(z.string().startsWith('http')),
      timeout: z.number().int().positive(),
    }),
    features: z.object({
      debugMode: z.boolean(),
      analytics: z.boolean(),
      performanceMonitoring: z.boolean(),
      journalEditDrawer: z.boolean().optional(),
      journalEditFlow: z.boolean().optional(),
      tradeDTE: z.boolean().optional(),
    }),
    database: z.object({
      name: z.string().min(1),
      version: z.number().int().nonnegative(),
    }),
    csv: z.object({
      maxFileSizeMB: z.number().int().positive(),
      supportedBrokers: z.array(z.string().min(1)).min(1),
    }),
    chart: z.object({
      theme: z.union([z.literal('light'), z.literal('dark')]),
      animationDuration: z.number().int().nonnegative(),
    }),
    isDevelopment: z.boolean(),
    isProduction: z.boolean(),
    isTest: z.boolean(),
  });

  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    console.warn('[env] Validation warnings:', result.error.flatten());
  }

  // Log configuration in development
  if (env.features.debugMode) {
    console.log('[env] Resolved configuration:', env);
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvConfig<T>(configs: {
  development?: T;
  production?: T;
  test?: T;
  default: T;
}): T {
  if (env.isTest && configs.test) return configs.test;
  if (env.isDevelopment && configs.development) return configs.development;
  if (env.isProduction && configs.production) return configs.production;
  return configs.default;
}

// Validate environment on module load
validateEnvironment();
