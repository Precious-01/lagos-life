import { describe, expect, it } from 'vitest';
import { float32Spacing } from './precision';

describe('float32Spacing', () => {
  it('is 2^-12 metres (about 0.24 mm) at 4 km', () => {
    expect(float32Spacing(4000)).toBeCloseTo(2 ** -12, 12);
  });

  it('is finer than a millimetre everywhere inside the first region (5 km from the origin)', () => {
    expect(float32Spacing(5000)).toBeLessThan(0.001);
  });

  it('grows to centimetres at 100 km, which is when a floating origin starts to matter', () => {
    expect(float32Spacing(100000)).toBeGreaterThan(0.005);
  });

  it('matches what Math.fround actually does', () => {
    const problems: string[] = [];
    for (const distance of [10, 100, 1234.5, 4000.0001, 5000.7, 60000.3]) {
      const error = Math.abs(Math.fround(distance) - distance);
      if (error > float32Spacing(distance) / 2 + 1e-12) {
        problems.push(String(distance));
      }
    }
    expect(problems).toEqual([]);
  });

  it('returns 0 for a distance of 0 and treats negatives like positives', () => {
    expect(float32Spacing(0)).toBe(0);
    expect(float32Spacing(-4000)).toBe(float32Spacing(4000));
  });
});
