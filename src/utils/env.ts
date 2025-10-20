/**
 * Environment configuration with type safety
 *
 * This module provides typed access to environment variables
 * and handles fallbacks for missing values.
 */

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
  const required = ['VITE_APP_TITLE', 'VITE_APP_VERSION'];

  const missing = required.filter(key => !import.meta.env[key]);

  if (missing.length > 0) {
    console.warn('Missing environment variables:', missing);
  }

  // Log configuration in development
  if (env.features.debugMode) {
    console.log('Environment configuration:', env);
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
