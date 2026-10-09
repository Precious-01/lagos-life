import { describe, expect, it } from 'vitest';
import type { CameraGoal } from './camera';
import { constrainCameraGoal, type CameraObstacle } from './cameraCollision';

const target = { x: 0, y: 1.2, z: 0 };
const position = { x: 0, y: 5, z: -10 };
const goal: CameraGoal = { position, target };
// Distance from the target to the wanted camera position.
const LENGTH = Math.hypot(0, 3.8, 10);

function wall(overrides: Partial<CameraObstacle>): CameraObstacle {
  return { x: 0, z: -5, width: 10, depth: 2, height: 8, ...overrides };
}

describe('constrainCameraGoal', () => {
  it('returns the same goal when there are no obstacles', () => {
    expect(constrainCameraGoal(goal, [])).toBe(goal);
  });

  it('pulls the camera in front of a wall that is in the way', () => {
    // The wall spans z = -6..-4, so the line from the player enters it at 40% of the way.
    const result = constrainCameraGoal(goal, [wall({})], 0.5);
    const distance = Math.hypot(
      result.position.x - target.x,
      result.position.y - target.y,
      result.position.z - target.z,
    );
    expect(distance).toBeCloseTo(0.4 * LENGTH - 0.5, 6);
    expect(result.position.z).toBeGreaterThan(-4);
    expect(result.target).toBe(target);
  });

  it('lets the camera pass over a wall that is lower than the line of sight', () => {
    expect(constrainCameraGoal(goal, [wall({ height: 2 })])).toBe(goal);
  });

  it('ignores walls beyond the camera', () => {
    expect(constrainCameraGoal(goal, [wall({ z: -20 })])).toBe(goal);
  });

  it('ignores walls behind the player', () => {
    expect(constrainCameraGoal(goal, [wall({ z: 5 })])).toBe(goal);
  });

  it('ignores walls to the side', () => {
    expect(constrainCameraGoal(goal, [wall({ x: 20 })])).toBe(goal);
  });

  it('uses the nearest wall when there are several', () => {
    const near = wall({ z: -3 });
    const far = wall({ z: -7 });
    const alone = constrainCameraGoal(goal, [near]);
    const both = constrainCameraGoal(goal, [far, near]);
    expect(both.position.z).toBeCloseTo(alone.position.z, 9);
  });

  it('moves the camera onto the player when a wall is closer than the margin', () => {
    // The wall spans z = -1.3..-0.3, only 0.32 m of line away, which is less than the 0.5 m margin.
    const result = constrainCameraGoal(goal, [wall({ z: -0.8, depth: 1 })], 0.5);
    expect(result.position.x).toBeCloseTo(target.x, 9);
    expect(result.position.y).toBeCloseTo(target.y, 9);
    expect(result.position.z).toBeCloseTo(target.z, 9);
  });

  it('returns the goal unchanged when the camera is already on the target', () => {
    const onTarget: CameraGoal = { position: { ...target }, target };
    expect(constrainCameraGoal(onTarget, [wall({})])).toBe(onTarget);
  });
});
