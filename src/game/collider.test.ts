import { describe, expect, it } from 'vitest';
import type { CameraGoal } from './camera';
import { constrainCameraGoal } from './cameraCollision';
import { resolveCircleCollisions } from './collision';
import { buildingsToColliders, createCollider } from './collider';
import { DEFAULT_DISTRICT_CONFIG, generateDistrict } from './district';

describe('createCollider', () => {
  it('copies the footprint and records the kind and height', () => {
    const collider = createCollider('kiosk', { x: 1, z: 2, width: 3, depth: 4 }, 2.5);
    expect(collider).toEqual({ kind: 'kiosk', x: 1, z: 2, width: 3, depth: 4, height: 2.5 });
  });

  it('rejects non-positive sizes', () => {
    const rect = { x: 0, z: 0, width: 1, depth: 1 };
    expect(() => createCollider('prop', { ...rect, width: 0 }, 1)).toThrow(RangeError);
    expect(() => createCollider('prop', { ...rect, depth: -1 }, 1)).toThrow(RangeError);
    expect(() => createCollider('prop', rect, 0)).toThrow(RangeError);
  });
});

describe('buildingsToColliders', () => {
  it('creates one building collider per building with the same footprint and height', () => {
    const { buildings } = generateDistrict(DEFAULT_DISTRICT_CONFIG);
    const colliders = buildingsToColliders(buildings);
    expect(colliders).toHaveLength(buildings.length);
    colliders.forEach((collider, index) => {
      const building = buildings[index];
      expect(collider.kind).toBe('building');
      expect(collider.x).toBe(building.x);
      expect(collider.z).toBe(building.z);
      expect(collider.width).toBe(building.width);
      expect(collider.depth).toBe(building.depth);
      expect(collider.height).toBe(building.height);
    });
  });
});

describe('colliders work with the existing collision code', () => {
  const bounds = { x: 0, z: 0, width: 100, depth: 100 };

  it('blocks a walking circle', () => {
    const kiosk = createCollider('kiosk', { x: 10, z: 0, width: 4, depth: 4 }, 2.5);
    const resolved = resolveCircleCollisions({ x: 7.8, z: 0 }, 0.5, [kiosk], bounds);
    expect(resolved.x).toBeCloseTo(7.5, 9);
  });

  it('blocks the camera', () => {
    const wall = createCollider('building', { x: 0, z: -5, width: 10, depth: 2 }, 8);
    const goal: CameraGoal = {
      position: { x: 0, y: 5, z: -10 },
      target: { x: 0, y: 1.2, z: 0 },
    };
    expect(constrainCameraGoal(goal, [wall])).not.toBe(goal);
  });
});
