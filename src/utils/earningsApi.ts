interface EarningsResponse {
  symbol: string;
  date: string | null;
  source: 'alpha-vantage' | 'fmp' | 'cache' | 'none';
}

interface EarningsCache {
  [symbol: string]: {
    date: string | null;
    timestamp: number;
  };
}

const CACHE_KEY = 'earnings_cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load earnings cache from localStorage
 */
export function loadCache(): EarningsCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

/**
 * Save earnings to cache
 */
function saveToCache(symbol: string, date: string | null): void {
  const cache = loadCache();
  cache[symbol] = {
    date,
    timestamp: Date.now(),
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

/**
 * Check if cached earnings is still valid
 */
function isCacheValid(symbol: string): boolean {
  const cache = loadCache();
  const entry = cache[symbol];
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_DURATION_MS;
}

/**
 * Get cached earnings date
 */
function getCachedDate(symbol: string): string | null {
  const cache = loadCache();
  return cache[symbol]?.date || null;
}

/**
 * Fetch from Alpha Vantage
 */
async function fetchAlphaVantage(symbol: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://www.alphavantage.co/query?function=EARNINGS_CALENDAR&symbol=${symbol}&apikey=${apiKey}`
    );

    if (!response.ok) return null;

    const text = await response.text();
    const lines = text.split('\n');

    // CSV format: symbol,reportDate,fiscalDateEnding,estimate,currency
    if (lines.length > 1 && lines[1]) {
      const parts = lines[1].split(',');
      const reportDate = parts[1];
      return reportDate?.trim() || null;
    }

    return null;
  } catch (error) {
    console.warn(`Alpha Vantage error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch from Financial Modeling Prep
 */
async function fetchFMP(symbol: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_FMP_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/earning_calendar/${symbol}?apikey=${apiKey}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Return the next upcoming earnings date
    if (Array.isArray(data) && data.length > 0) {
      const now = new Date();
      const upcoming = data.find((item: { date?: string }) => {
        return item.date && new Date(item.date) >= now;
      });
      return upcoming?.date || data[0]?.date || null;
    }

    return null;
  } catch (error) {
    console.warn(`FMP error for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch earnings date for a symbol with caching and fallback
 */
export async function getEarningsDate(symbol: string): Promise<EarningsResponse> {
  // Check cache first
  if (isCacheValid(symbol)) {
    return {
      symbol,
      date: getCachedDate(symbol),
      source: 'cache',
    };
  }

  // Try Alpha Vantage first
  let date = await fetchAlphaVantage(symbol);
  if (date) {
    saveToCache(symbol, date);
    return { symbol, date, source: 'alpha-vantage' };
  }

  // Fallback to FMP
  date = await fetchFMP(symbol);
  if (date) {
    saveToCache(symbol, date);
    return { symbol, date, source: 'fmp' };
  }

  // Cache the failure to avoid repeated API calls
  saveToCache(symbol, null);
  return { symbol, date: null, source: 'none' };
}

/**
 * Batch fetch earnings for multiple symbols
 * Respects rate limits by adding delays
 */
export async function batchGetEarnings(
  symbols: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  const DELAY_MS = 12000 / 5; // Alpha Vantage: max 5 calls per minute

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    if (!symbol) continue;

    // Check cache first (instant)
    if (isCacheValid(symbol)) {
      const cached = getCachedDate(symbol);
      if (cached) results[symbol] = cached;
      onProgress?.(i + 1, symbols.length);
      continue;
    }

    // Fetch from API with delay
    const response = await getEarningsDate(symbol);
    if (response.date) {
      results[symbol] = response.date;
    }

    onProgress?.(i + 1, symbols.length);

    // Add delay between API calls (except for last one)
    if (i < symbols.length - 1 && response.source !== 'cache') {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }

  return results;
}
