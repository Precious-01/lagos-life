import { describe, expect, it } from 'vitest';
import { rectContains, rectsOverlap } from './rect';

const base = { x: 0, z: 0, width: 10, depth: 10 };

describe('rectsOverlap', () => {
  it('detects overlapping rectangles', () => {
    expect(rectsOverlap(base, { x: 5, z: 5, width: 10, depth: 10 })).toBe(true);
  });

  it('does not count touching edges as overlap', () => {
    expect(rectsOverlap(base, { x: 10, z: 0, width: 10, depth: 10 })).toBe(false);
  });

  it('returns false for separated rectangles', () => {
    expect(rectsOverlap(base, { x: 30, z: 30, width: 4, depth: 4 })).toBe(false);
  });
});

describe('rectContains', () => {
  it('returns true when inner is fully inside outer', () => {
    expect(rectContains(base, { x: 1, z: -1, width: 4, depth: 4 })).toBe(true);
  });

  it('returns false when inner sticks out of outer', () => {
    expect(rectContains(base, { x: 4, z: 0, width: 4, depth: 4 })).toBe(false);
  });
});
