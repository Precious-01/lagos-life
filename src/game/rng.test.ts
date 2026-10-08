import { describe, expect, it } from 'vitest';
import { createRng, pickOne, randomInRange } from './rng';

describe('createRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 5 }, () => a());
    const seqB = Array.from({ length: 5 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('only returns values in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe('randomInRange', () => {
  it('stays within the requested range', () => {
    const rng = createRng(99);
    for (let i = 0; i < 500; i += 1) {
      const value = randomInRange(rng, 5, 10);
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThan(10);
    }
  });
});

describe('pickOne', () => {
  it('returns an element of the array', () => {
    const rng = createRng(3);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 50; i += 1) {
      expect(items).toContain(pickOne(rng, items));
    }
  });

  it('throws on an empty array', () => {
    expect(() => pickOne(createRng(1), [])).toThrow(RangeError);
  });
});
