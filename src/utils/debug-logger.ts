/**
 * Debug logger that intercepts console.log and forwards to terminal
 */

import { useTerminalStore } from '@/stores/useTerminalStore';

let originalConsoleLog: typeof console.log;
let originalConsoleWarn: typeof console.warn;
let originalConsoleError: typeof console.error;

let isIntercepted = false;

/**
 * Safely convert a value to a string, handling objects that can't be converted to primitives
 */
function safeStringify(arg: unknown): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';

  const type = typeof arg;

  if (type === 'string') return arg as string;
  if (type === 'number' || type === 'boolean' || type === 'bigint' || type === 'symbol') {
    return String(arg);
  }

  // For objects, try JSON.stringify with error handling
  if (type === 'object') {
    try {
      // Handle Error objects specially
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}${arg.stack ? '\n' + arg.stack : ''}`;
      }

      // Try JSON.stringify for other objects
      return JSON.stringify(arg, null, 2);
    } catch {
      // If JSON.stringify fails, fall back to object type
      return `[${arg?.constructor?.name || 'Object'}]`;
    }
  }

  // Fallback for any other types
  try {
    return String(arg);
  } catch {
    return '[Unable to convert to string]';
  }
}

/**
 * Safely call a console method, handling React DevTools formatting issues
 * React DevTools intercepts console methods and tries to format arguments,
 * which can fail with objects that can't be converted to primitives.
 */
function safeConsoleCall(originalMethod: typeof console.log, args: unknown[]): void {
  // Use setTimeout to defer the call, which can help avoid React DevTools interception
  // However, to preserve console behavior, we'll try synchronously first
  try {
    originalMethod(...args);
    return;
  } catch {
    // If synchronous call fails (React DevTools formatting issue),
    // try with safe stringified arguments
    try {
      const safeArgs = args.map(arg => safeStringify(arg));
      originalMethod(...safeArgs);
      return;
    } catch {
      // If that also fails, try calling with just one safe string argument
      try {
        const safeMessage = args.map(arg => safeStringify(arg)).join(' ');
        originalMethod(safeMessage);
        return;
      } catch {
        // Last resort: defer the call using setTimeout to bypass interceptors
        // This ensures the app doesn't break even if console fails
        setTimeout(() => {
          try {
            const safeMessage = args.map(arg => safeStringify(arg)).join(' ');
            // Use Function.prototype.apply to call the original method
            // This bypasses any proxy/wrapper that might be causing issues
            (Function.prototype.apply.call as typeof console.log)(originalMethod, null, [
              safeMessage,
            ]);
          } catch {
            // Completely ignore - don't break the app
          }
        }, 0);
      }
    }
  }
}

/**
 * Intercept console methods and forward to terminal store
 */
export function interceptConsoleLog() {
  if (isIntercepted) return;

  originalConsoleLog = console.log;
  originalConsoleWarn = console.warn;
  originalConsoleError = console.error;

  console.log = (...args: unknown[]) => {
    safeConsoleCall(originalConsoleLog, args);
    const store = useTerminalStore.getState();
    if (store.isUnlocked && store.isOpen) {
      try {
        const message = args.map(arg => safeStringify(arg)).join(' ');
        store.addLog(`[LOG] ${message}`);
      } catch {
        // Ignore errors in terminal logging
      }
    }
  };

  console.warn = (...args: unknown[]) => {
    safeConsoleCall(originalConsoleWarn, args);
    const store = useTerminalStore.getState();
    if (store.isUnlocked && store.isOpen) {
      try {
        const message = args.map(arg => safeStringify(arg)).join(' ');
        store.addLog(`[WARN] ${message}`);
      } catch {
        // Ignore errors in terminal logging
      }
    }
  };

  console.error = (...args: unknown[]) => {
    safeConsoleCall(originalConsoleError, args);
    const store = useTerminalStore.getState();
    if (store.isUnlocked && store.isOpen) {
      try {
        const message = args.map(arg => safeStringify(arg)).join(' ');
        store.addLog(`[ERROR] ${message}`);
      } catch {
        // Ignore errors in terminal logging
      }
    }
  };

  isIntercepted = true;
}

/**
 * Restore original console methods
 */
export function restoreConsoleLog() {
  if (!isIntercepted) return;

  console.log = originalConsoleLog;
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;

  isIntercepted = false;
}
