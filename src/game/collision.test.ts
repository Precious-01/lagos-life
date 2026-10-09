import { describe, expect, it } from 'vitest';
import {
  circleIntersectsRect,
  clampToBounds,
  pushCircleOutOfRect,
  resolveCircleCollisions,
} from './collision';
import { DEFAULT_DISTRICT_CONFIG, generateDistrict } from './district';
import { createRng } from './rng';
import type { Rect } from './types';

// Spans -5..5 on both axes.
const wall: Rect = { x: 0, z: 0, width: 10, depth: 10 };

describe('circleIntersectsRect', () => {
  it('detects a circle overlapping an edge', () => {
    expect(circleIntersectsRect({ x: 5.2, z: 0 }, 0.5, wall)).toBe(true);
  });

  it('detects a circle whose centre is inside', () => {
    expect(circleIntersectsRect({ x: 1, z: 1 }, 0.5, wall)).toBe(true);
  });

  it('is false for a separated circle', () => {
    expect(circleIntersectsRect({ x: 6, z: 0 }, 0.5, wall)).toBe(false);
  });

  it('does not count exact touching as overlap', () => {
    expect(circleIntersectsRect({ x: 5.5, z: 0 }, 0.5, wall)).toBe(false);
  });
});

describe('pushCircleOutOfRect', () => {
  it('returns the same object when there is no overlap', () => {
    const centre = { x: 8, z: 0 };
    expect(pushCircleOutOfRect(centre, 0.5, wall)).toBe(centre);
  });

  it('pushes a circle straight out of a side', () => {
    const pushed = pushCircleOutOfRect({ x: 5.2, z: 0 }, 0.5, wall);
    expect(pushed.x).toBeCloseTo(5.5, 9);
    expect(pushed.z).toBeCloseTo(0, 9);
  });

  it('pushes a circle diagonally away from a corner', () => {
    const pushed = pushCircleOutOfRect({ x: 5.1, z: 5.1 }, 0.5, wall);
    expect(Math.hypot(pushed.x - 5, pushed.z - 5)).toBeCloseTo(0.5, 6);
  });

  it('moves a circle whose centre is inside out through the nearest face', () => {
    const pushed = pushCircleOutOfRect({ x: 4, z: 0 }, 0.5, wall);
    expect(pushed.x).toBeCloseTo(5.5, 9);
    expect(pushed.z).toBeCloseTo(0, 9);

    const pushedTowardsNegativeZ = pushCircleOutOfRect({ x: 0, z: -4.5 }, 0.5, wall);
    expect(pushedTowardsNegativeZ.x).toBeCloseTo(0, 9);
    expect(pushedTowardsNegativeZ.z).toBeCloseTo(-5.5, 9);
  });
});

describe('clampToBounds', () => {
  it('keeps a circle inside the bounds, allowing for its radius', () => {
    const bounds: Rect = { x: 0, z: 0, width: 100, depth: 100 };
    const clamped = clampToBounds({ x: 60, z: -70 }, 1, bounds);
    expect(clamped.x).toBeCloseTo(49, 9);
    expect(clamped.z).toBeCloseTo(-49, 9);
  });
});

describe('resolveCircleCollisions', () => {
  it('pushes a circle out of an obstacle', () => {
    const obstacle: Rect = { x: 10, z: 0, width: 4, depth: 4 };
    const bounds: Rect = { x: 0, z: 0, width: 100, depth: 100 };
    const resolved = resolveCircleCollisions({ x: 7.8, z: 0 }, 0.5, [obstacle], bounds);
    expect(resolved.x).toBeCloseTo(7.5, 9);
    expect(resolved.z).toBeCloseTo(0, 9);
  });

  it('never leaves a circle inside a building or outside the district', () => {
    const district = generateDistrict(DEFAULT_DISTRICT_CONFIG);
    const rng = createRng(11);
    const radius = 0.4;
    const tolerance = 1e-9;
    const problems: string[] = [];

    for (let i = 0; i < 500; i += 1) {
      const start = {
        x: (rng() - 0.5) * district.width,
        z: (rng() - 0.5) * district.depth,
      };
      const resolved = resolveCircleCollisions(start, radius, district.buildings, district.bounds);

      if (
        Math.abs(resolved.x) > district.width / 2 - radius + tolerance ||
        Math.abs(resolved.z) > district.depth / 2 - radius + tolerance
      ) {
        problems.push(`outside bounds: start ${start.x},${start.z} -> ${resolved.x},${resolved.z}`);
      }
      for (const building of district.buildings) {
        if (circleIntersectsRect(resolved, radius - 1e-6, building)) {
          problems.push(`inside ${building.id}: start ${start.x},${start.z}`);
        }
      }
    }

    // One assertion for the whole sweep keeps the test fast and lists any failures.
    expect(problems).toEqual([]);
  });
});
