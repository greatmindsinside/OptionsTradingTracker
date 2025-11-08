/**
 * useEarningsSync Hook
 *
 * PURPOSE:
 * Manages the fetching and synchronization of earnings calendar dates for stock tickers
 * displayed in the Wheel strategy tracker. Earnings dates are critical for options traders
 * as they represent high-volatility events that can significantly impact option positions.
 *
 * HOW IT WORKS:
 * 1. Takes an array of stock tickers (e.g., ['AAPL', 'TSLA', 'MSFT'])
 * 2. Batch fetches earnings dates from free APIs (Alpha Vantage + FMP fallback)
 * 3. Stores results in localStorage cache (24hr validity) to minimize API calls
 * 4. Updates the Zustand store with earnings data for display in UI
 * 5. Provides loading/progress status for user feedback
 *
 * WHY IT'S USED:
 * - Shows traders when each ticker has upcoming earnings (high-risk event)
 * - Helps plan option positions around earnings (sell before, avoid during, etc.)
 * - Respects free API rate limits with caching (Alpha Vantage: 25/day, FMP: 250/day)
 * - Provides real-time data without manual updates
 *
 * USAGE EXAMPLE (in WheelPage.tsx):
 * ```typescript
 * const tickers = ['AAPL', 'TSLA']; // From user's positions
 * const { syncEarnings, status } = useEarningsSync(tickers);
 *
 * useEffect(() => {
 *   if (tickers.length > 0) {
 *     syncEarnings(); // Auto-fetch on mount
 *   }
 * }, [tickers]);
 *
 * // Show loading indicator
 * {status.isLoading && <div>Syncing {status.progress}/{status.total}</div>}
 * ```
 *
 * API INTEGRATION:
 * - Primary: Alpha Vantage (EARNINGS_CALENDAR endpoint)
 * - Fallback: Financial Modeling Prep (earning_calendar endpoint)
 * - Cache: localStorage (earnings_cache key)
 * - Rate Limiting: 12 second delay between uncached requests
 */

import { useCallback, useState } from 'react';

import { useWheelStore } from '@/stores/useWheelStore';
import { batchGetEarnings } from '@/utils/earningsApi';

/**
 * Sync status interface for tracking fetch progress
 */
interface SyncStatus {
  isLoading: boolean; // True while fetching from APIs
  progress: number; // Number of tickers processed (0 to total)
  total: number; // Total number of tickers to fetch
  error: string | null; // Error message if fetch fails
}

/**
 * Hook to sync earnings data for all tickers
 *
 * @param tickers - Array of stock symbols to fetch earnings for
 * @returns Object with syncEarnings function and status
 */
export function useEarningsSync(tickers: string[]) {
  // Get setter from Zustand store to save fetched earnings
  const setEarnings = useWheelStore(s => s.setEarnings);

  // Local state for tracking sync progress and errors
  const [status, setStatus] = useState<SyncStatus>({
    isLoading: false,
    progress: 0,
    total: 0,
    error: null,
  });

  /**
   * Fetches earnings dates for all tickers
   * - Checks cache first (instant if cached within 24hrs)
   * - Falls back to API calls with progress tracking
   * - Respects rate limits with delays between calls
   * - Updates store and status throughout process
   *
   * Wrapped in useCallback to prevent infinite re-renders
   */
  const syncEarnings = useCallback(async () => {
    // Guard: Skip if no tickers provided
    if (tickers.length === 0) return;

    // Initialize loading state
    setStatus({ isLoading: true, progress: 0, total: tickers.length, error: null });

    try {
      // Batch fetch with progress callback
      // This will check localStorage cache first, then hit APIs as needed
      const earnings = await batchGetEarnings(tickers, (completed, total) => {
        // Update progress as each ticker is processed
        setStatus(prev => ({ ...prev, progress: completed, total }));
      });

      // Save fetched earnings to Zustand store
      // Format: { 'AAPL': '2024-11-15', 'TSLA': '2024-12-20', ... }
      setEarnings(earnings);

      // Mark as complete
      setStatus(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      // Handle fetch errors (network issues, API quota exceeded, etc.)
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sync earnings',
      }));
    }
  }, [tickers, setEarnings]); // Only recreate when tickers or setEarnings changes

  return {
    syncEarnings, // Function to trigger fetch
    status, // Current loading/progress/error state
  };
}
