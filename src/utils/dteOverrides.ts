interface DteOverride {
  positionId: string;
  ticker: string;
  strike: number;
  originalDte: number;
  overrideDte: number;
  overrideExpiration: string; // YYYY-MM-DD
  timestamp: number;
}

interface DteOverrides {
  [positionId: string]: DteOverride;
}

const STORAGE_KEY = 'wheel_dte_overrides';

/**
 * Load all DTE overrides from localStorage
 */
export function loadDteOverrides(): DteOverrides {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load DTE overrides:', error);
    return {};
  }
}

/**
 * Save a DTE override for a specific position
 */
export function saveDteOverride(
  positionId: string,
  ticker: string,
  strike: number,
  originalDte: number,
  overrideDte: number,
  overrideExpiration: string
): void {
  const overrides = loadDteOverrides();

  overrides[positionId] = {
    positionId,
    ticker,
    strike,
    originalDte,
    overrideDte,
    overrideExpiration,
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    console.log('✅ Saved DTE override:', positionId, overrideDte);
  } catch (error) {
    console.error('Failed to save DTE override:', error);
  }
}

/**
 * Get DTE override for a specific position
 */
export function getDteOverride(positionId: string): DteOverride | null {
  const overrides = loadDteOverrides();
  return overrides[positionId] || null;
}

/**
 * Remove a DTE override
 */
export function removeDteOverride(positionId: string): void {
  const overrides = loadDteOverrides();
  delete overrides[positionId];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    console.log('✅ Removed DTE override:', positionId);
  } catch (error) {
    console.error('Failed to remove DTE override:', error);
  }
}

/**
 * Clear all DTE overrides
 */
export function clearAllDteOverrides(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('✅ Cleared all DTE overrides');
}

/**
 * Apply DTE overrides to positions array
 */
export function applyDteOverrides<T extends { id: string; dte: number }>(positions: T[]): T[] {
  const overrides = loadDteOverrides();

  return positions.map(position => {
    const override = overrides[position.id];
    if (override) {
      console.log('📅 Applying DTE override:', position.id, override.overrideDte);
      return {
        ...position,
        dte: override.overrideDte,
      };
    }
    return position;
  });
}
