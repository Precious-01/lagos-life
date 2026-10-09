import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ORBIT_LIMITS,
  DEFAULT_ORBIT_VIEW,
  applyLookDelta,
  applyZoom,
  clampView,
  orbitFollowGoal,
  type OrbitView,
} from './cameraControl';

const view: OrbitView = { yaw: 0, pitch: 0.5, distance: 10 };

describe('applyLookDelta', () => {
  it('turns right when dragging right', () => {
    const next = applyLookDelta(view, 100, 0, 0.005);
    expect(next.yaw).toBeCloseTo(-0.5, 9);
    expect(next.pitch).toBeCloseTo(0.5, 9);
  });

  it('turns left when dragging left', () => {
    expect(applyLookDelta(view, -100, 0, 0.005).yaw).toBeCloseTo(0.5, 9);
  });

  it('raises the camera when dragging down and lowers it when dragging up', () => {
    expect(applyLookDelta(view, 0, 20, 0.005).pitch).toBeCloseTo(0.6, 9);
    expect(applyLookDelta(view, 0, -20, 0.005).pitch).toBeCloseTo(0.4, 9);
  });

  it('never goes beyond the pitch limits', () => {
    expect(applyLookDelta(view, 0, 100000).pitch).toBe(DEFAULT_ORBIT_LIMITS.maxPitch);
    expect(applyLookDelta(view, 0, -100000).pitch).toBe(DEFAULT_ORBIT_LIMITS.minPitch);
  });

  it('keeps yaw wrapped and does not mutate the old view', () => {
    const next = applyLookDelta({ yaw: Math.PI - 0.01, pitch: 0.5, distance: 10 }, -10, 0, 0.01);
    expect(next.yaw).toBeGreaterThanOrEqual(-Math.PI);
    expect(next.yaw).toBeLessThan(Math.PI);
    expect(view).toEqual({ yaw: 0, pitch: 0.5, distance: 10 });
  });
});

describe('applyZoom', () => {
  it('does not change the distance for a zero wheel delta', () => {
    expect(applyZoom(view, 0).distance).toBe(10);
  });

  it('zooms out for positive deltas and in for negative deltas', () => {
    expect(applyZoom(view, 100, 0.001).distance).toBeCloseTo(10 * Math.exp(0.1), 9);
    expect(applyZoom(view, -100, 0.001).distance).toBeCloseTo(10 * Math.exp(-0.1), 9);
  });

  it('never goes beyond the distance limits', () => {
    expect(applyZoom(view, 1e6).distance).toBe(DEFAULT_ORBIT_LIMITS.maxDistance);
    expect(applyZoom(view, -1e6).distance).toBe(DEFAULT_ORBIT_LIMITS.minDistance);
  });

  it('leaves yaw and pitch alone', () => {
    const next = applyZoom({ yaw: 1, pitch: 0.7, distance: 8 }, 50);
    expect(next.yaw).toBe(1);
    expect(next.pitch).toBe(0.7);
  });
});

describe('clampView', () => {
  it('pulls every value back inside the limits', () => {
    const clamped = clampView({ yaw: 0.2, pitch: 5, distance: 1000 });
    expect(clamped.pitch).toBe(DEFAULT_ORBIT_LIMITS.maxPitch);
    expect(clamped.distance).toBe(DEFAULT_ORBIT_LIMITS.maxDistance);
    expect(clamped.yaw).toBeCloseTo(0.2, 9);
  });

  it('leaves the default view unchanged', () => {
    expect(clampView(DEFAULT_ORBIT_VIEW)).toEqual(DEFAULT_ORBIT_VIEW);
  });
});

describe('orbitFollowGoal', () => {
  it('sits behind a player the camera faces along +Z', () => {
    const goal = orbitFollowGoal({ x: 10, z: 20 }, { yaw: 0, pitch: 0, distance: 8 }, 1.2);
    expect(goal.position.x).toBeCloseTo(10, 9);
    expect(goal.position.y).toBeCloseTo(1.2, 9);
    expect(goal.position.z).toBeCloseTo(12, 9);
    expect(goal.target).toEqual({ x: 10, y: 1.2, z: 20 });
  });

  it('is exactly `distance` metres from the target at any yaw and pitch', () => {
    for (const yaw of [0, 0.9, -2.2, 3]) {
      for (const pitch of [0.12, 0.6, 1.25]) {
        const goal = orbitFollowGoal({ x: 3, z: -4 }, { yaw, pitch, distance: 9 }, 1.2);
        const distance = Math.hypot(
          goal.position.x - goal.target.x,
          goal.position.y - goal.target.y,
          goal.position.z - goal.target.z,
        );
        expect(distance).toBeCloseTo(9, 9);
      }
    }
  });

  it('rises as the pitch increases', () => {
    const low = orbitFollowGoal({ x: 0, z: 0 }, { yaw: 0, pitch: 0.2, distance: 10 }, 1.2);
    const high = orbitFollowGoal({ x: 0, z: 0 }, { yaw: 0, pitch: 1, distance: 10 }, 1.2);
    expect(high.position.y).toBeGreaterThan(low.position.y);
  });
});
