import { describe, expect, it } from 'vitest';
import {
  damp,
  followCameraGoal,
  orbitCameraGoal,
  updateCameraYaw,
  type FollowCameraConfig,
} from './camera';
import { createInputState } from './input';

const config: FollowCameraConfig = { distance: 10, height: 6, lookHeight: 1, rotateRate: 1 };

describe('followCameraGoal', () => {
  it('sits behind a player the camera faces along +Z', () => {
    const goal = followCameraGoal({ x: 10, z: 20 }, 0, config);
    expect(goal.position.x).toBeCloseTo(10, 9);
    expect(goal.position.y).toBe(6);
    expect(goal.position.z).toBeCloseTo(10, 9);
    expect(goal.target).toEqual({ x: 10, y: 1, z: 20 });
  });

  it('sits at -X when the camera faces +X', () => {
    const goal = followCameraGoal({ x: 0, z: 0 }, Math.PI / 2, config);
    expect(goal.position.x).toBeCloseTo(-10, 9);
    expect(goal.position.z).toBeCloseTo(0, 9);
  });

  it('keeps the same distance behind the player at any yaw', () => {
    for (const yaw of [0.3, 1.2, -2.5, 3]) {
      const goal = followCameraGoal({ x: 0, z: 0 }, yaw, config);
      expect(Math.hypot(goal.position.x, goal.position.z)).toBeCloseTo(10, 6);
    }
  });
});

describe('orbitCameraGoal', () => {
  it('stays at the requested radius and height, looking at the centre', () => {
    const goal = orbitCameraGoal({ x: 5, z: -5 }, 1.3, 100, 60);
    expect(Math.hypot(goal.position.x - 5, goal.position.z + 5)).toBeCloseTo(100, 6);
    expect(goal.position.y).toBe(60);
    expect(goal.target).toEqual({ x: 5, y: 0, z: -5 });
  });
});

describe('updateCameraYaw', () => {
  it('turns left with Q and right with E', () => {
    const left = createInputState();
    left.rotateLeft = true;
    expect(updateCameraYaw(0, left, 0.5, 2)).toBeCloseTo(1, 9);

    const right = createInputState();
    right.rotateRight = true;
    expect(updateCameraYaw(0, right, 0.5, 2)).toBeCloseTo(-1, 9);
  });

  it('does not turn when nothing or both keys are pressed', () => {
    expect(updateCameraYaw(0.4, createInputState(), 1, 2)).toBeCloseTo(0.4, 9);

    const both = createInputState();
    both.rotateLeft = true;
    both.rotateRight = true;
    expect(updateCameraYaw(0.4, both, 1, 2)).toBeCloseTo(0.4, 9);
  });

  it('wraps around instead of growing without limit', () => {
    const left = createInputState();
    left.rotateLeft = true;
    const yaw = updateCameraYaw(Math.PI - 0.01, left, 0.1, 1);
    expect(yaw).toBeCloseTo(-Math.PI + 0.09, 6);
  });
});

describe('damp', () => {
  it('does not move when no time has passed', () => {
    expect(damp(3, 10, 5, 0)).toBe(3);
  });

  it('approaches the target without overshooting', () => {
    const value = damp(0, 10, 5, 0.1);
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(10);
    expect(value).toBeCloseTo(10 - 10 * Math.exp(-0.5), 9);
  });

  it('effectively reaches the target given enough time', () => {
    expect(damp(0, 10, 5, 100)).toBeCloseTo(10, 9);
  });
});
