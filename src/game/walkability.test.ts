import { describe, expect, it } from 'vitest';
import { analyzeWalkability, cellIndexAt, isPointReachable } from './walkability';
import type { Rect } from './types';

const bounds: Rect = { x: 0, z: 0, width: 20, depth: 20 };
const RADIUS = 0.4;
const CELL = 0.5;

function analyze(obstacles: Rect[], start = { x: -5, z: 0 }) {
  return analyzeWalkability({ obstacles, bounds, radius: RADIUS, cellSize: CELL }, start);
}

describe('analyzeWalkability', () => {
  it('lets the player reach all of an open field', () => {
    const grid = analyze([]);
    // 40 x 40 cells; the outer ring of cells is too close to the edge for the player's radius.
    expect(grid.columns).toBe(40);
    expect(grid.rows).toBe(40);
    expect(grid.walkableCount).toBe(38 * 38);
    expect(grid.reachableCount).toBe(grid.walkableCount);
  });

  it('finds a route through a gap that is wide enough', () => {
    const grid = analyze([
      { x: 0, z: -6, width: 1, depth: 8 },
      { x: 0, z: 6, width: 1, depth: 8 },
    ]);
    expect(isPointReachable(grid, { x: -5, z: 0 })).toBe(true);
    expect(isPointReachable(grid, { x: 5, z: 0 })).toBe(true);
    expect(isPointReachable(grid, { x: 5, z: 8 })).toBe(true);
  });

  it('does not find a route through a gap that is narrower than the player', () => {
    const grid = analyze([
      { x: 0, z: -5.15, width: 1, depth: 9.7 },
      { x: 0, z: 5.15, width: 1, depth: 9.7 },
    ]);
    expect(isPointReachable(grid, { x: -5, z: 0 })).toBe(true);
    expect(isPointReachable(grid, { x: 5, z: 0 })).toBe(false);
  });

  it('reports an area sealed off by a wall as unreachable', () => {
    const grid = analyze([{ x: 0, z: 0, width: 1, depth: 20 }]);
    expect(isPointReachable(grid, { x: -5, z: 5 })).toBe(true);
    expect(isPointReachable(grid, { x: 5, z: 0 })).toBe(false);
    expect(grid.reachableCount).toBeLessThan(grid.walkableCount);
  });

  it('reaches nothing when the start is inside an obstacle', () => {
    const grid = analyze([{ x: -5, z: 0, width: 4, depth: 4 }]);
    expect(grid.reachableCount).toBe(0);
    expect(isPointReachable(grid, { x: 5, z: 5 })).toBe(false);
  });

  it('reaches nothing when the start is outside the bounds', () => {
    const grid = analyze([], { x: 50, z: 50 });
    expect(grid.reachableCount).toBe(0);
  });

  it('treats points outside the bounds as unreachable', () => {
    const grid = analyze([]);
    expect(isPointReachable(grid, { x: 100, z: 0 })).toBe(false);
  });

  it('rejects a non-positive cell size', () => {
    expect(() =>
      analyzeWalkability({ obstacles: [], bounds, radius: RADIUS, cellSize: 0 }, { x: 0, z: 0 }),
    ).toThrow(RangeError);
  });
});

describe('cellIndexAt', () => {
  const grid = analyze([]);

  it('maps points to cells', () => {
    expect(cellIndexAt(grid, { x: -9.9, z: -9.9 })).toBe(0);
    expect(cellIndexAt(grid, { x: -9.4, z: -9.9 })).toBe(1);
    expect(cellIndexAt(grid, { x: -9.9, z: -9.4 })).toBe(40);
  });

  it('returns null outside the grid', () => {
    expect(cellIndexAt(grid, { x: -10.1, z: 0 })).toBeNull();
    expect(cellIndexAt(grid, { x: 10, z: 0 })).toBeNull();
  });
});
