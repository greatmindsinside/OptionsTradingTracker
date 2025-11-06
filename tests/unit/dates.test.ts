import { describe, expect,it } from 'vitest';

import { calcDTE, dateFromDTE, isValidYmd } from '@/utils/dates';

describe('dates utils - DTE', () => {
  const now = new Date('2024-02-28T12:34:56'); // Leap year context

  it('calcDTE returns 0 for same-day expiration', () => {
    expect(calcDTE('2024-02-28', now)).toBe(0);
  });

  it('calcDTE returns 1 for next day', () => {
    expect(calcDTE('2024-02-29', now)).toBe(1);
  });

  it('calcDTE returns negative for past dates', () => {
    expect(calcDTE('2024-02-27', now)).toBe(-1);
  });

  it('dateFromDTE produces expected local date', () => {
    expect(dateFromDTE(0, now)).toBe('2024-02-28');
    expect(dateFromDTE(1, now)).toBe('2024-02-29');
  });

  it('isValidYmd validates YYYY-MM-DD strings', () => {
    expect(isValidYmd('2024-02-29')).toBe(true);
    expect(isValidYmd('2024-02-30')).toBe(false); // invalid date
    expect(isValidYmd('02/29/2024')).toBe(false);
    expect(isValidYmd('')).toBe(false);
  });
});
