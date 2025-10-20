import { describe, it, expect } from 'vitest';

describe('Math utilities', () => {
  it('should add two numbers correctly', () => {
    expect(1 + 1).toBe(2);
  });

  it('should calculate percentage correctly', () => {
    const calculatePercentage = (value: number, total: number): number => {
      return (value / total) * 100;
    };

    expect(calculatePercentage(25, 100)).toBe(25);
    expect(calculatePercentage(1, 4)).toBe(25);
  });
});
