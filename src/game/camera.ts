import { headingToDirection, normalizeAngle } from './angles';
import type { Vec2 } from './collision';
import type { InputState } from './input';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Where a camera wants to be, and what it wants to look at. */
export interface CameraGoal {
  position: Vec3;
  target: Vec3;
}

export interface FollowCameraConfig {
  /** Horizontal distance behind the player, in metres. */
  distance: number;
  /** Camera height above the ground. */
  height: number;
  /** Height of the point the camera looks at (roughly the player's head). */
  lookHeight: number;
  /** How fast Q/E turn the camera, in radians per second. */
  rotateRate: number;
}

export const DEFAULT_FOLLOW_CAMERA: FollowCameraConfig = {
  distance: 9,
  height: 5,
  lookHeight: 1.2,
  rotateRate: 1.8,
};

/** A camera `distance` metres behind the player, looking the way `yaw` faces. */
export function followCameraGoal(
  player: Vec2,
  yaw: number,
  config: FollowCameraConfig = DEFAULT_FOLLOW_CAMERA,
): CameraGoal {
  const forward = headingToDirection(yaw);
  return {
    position: {
      x: player.x - forward.x * config.distance,
      y: config.height,
      z: player.z - forward.z * config.distance,
    },
    target: { x: player.x, y: config.lookHeight, z: player.z },
  };
}

/** A camera circling `centre` at the given radius and height. Used on the title screen. */
export function orbitCameraGoal(
  centre: Vec2,
  angle: number,
  radius: number,
  height: number,
): CameraGoal {
  const direction = headingToDirection(angle);
  return {
    position: {
      x: centre.x + direction.x * radius,
      y: height,
      z: centre.z + direction.z * radius,
    },
    target: { x: centre.x, y: 0, z: centre.z },
  };
}

/** Q turns the camera left, E turns it right. Returns the new yaw. */
export function updateCameraYaw(
  yaw: number,
  input: InputState,
  deltaSeconds: number,
  rate: number,
): number {
  const axis = (input.rotateLeft ? 1 : 0) - (input.rotateRight ? 1 : 0);
  return normalizeAngle(yaw + axis * rate * deltaSeconds);
}

/**
 * Frame-rate independent smoothing: moves `current` towards `target`.
 * Higher `lambda` is snappier. With deltaSeconds = 0 the value does not change.
 */
export function damp(
  current: number,
  target: number,
  lambda: number,
  deltaSeconds: number,
): number {
  return target + (current - target) * Math.exp(-lambda * deltaSeconds);
}
