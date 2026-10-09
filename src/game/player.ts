import { headingToDirection, turnToward } from './angles';
import { circleIntersectsRect, resolveCircleCollisions, type Vec2 } from './collision';
import type { InputState } from './input';
import type { Rect } from './types';

export interface PlayerState {
  x: number;
  z: number;
  /** Facing direction in radians. 0 faces +Z. See angles.ts. */
  heading: number;
  /** Current walking speed in metres per second (0 when standing still). */
  speed: number;
}

/** What the player can bump into. Kept separate from District so other sources can be added. */
export interface MovementContext {
  obstacles: readonly Rect[];
  bounds: Rect;
}

export interface PlayerConfig {
  /** Collision radius in metres. */
  radius: number;
  walkSpeed: number;
  sprintSpeed: number;
  /** Maximum turning speed in radians per second. */
  turnRate: number;
  /** Longest simulation step in seconds. Longer frames are clamped so nobody tunnels through walls. */
  maxStep: number;
}

export const DEFAULT_PLAYER_CONFIG: PlayerConfig = {
  radius: 0.4,
  walkSpeed: 4,
  sprintSpeed: 7.5,
  turnRate: 10,
  maxStep: 0.05,
};

export function createPlayer(spawn: Vec2, heading = 0): PlayerState {
  return { x: spawn.x, z: spawn.z, heading, speed: 0 };
}

/**
 * Converts held keys into a unit direction in world space, relative to where the camera looks.
 * "Forward" walks away from the camera. Returns (0, 0) when nothing is pressed.
 */
export function getMoveIntent(input: InputState, cameraYaw: number): Vec2 {
  const forwardAxis = (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
  const rightAxis = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (forwardAxis === 0 && rightAxis === 0) {
    return { x: 0, z: 0 };
  }

  const forward = headingToDirection(cameraYaw);
  // Looking along +Z, the viewer's right-hand side is -X. This is (-forward.z, forward.x).
  const right = { x: -forward.z, z: forward.x };

  const x = forward.x * forwardAxis + right.x * rightAxis;
  const z = forward.z * forwardAxis + right.z * rightAxis;
  const length = Math.hypot(x, z);
  return { x: x / length, z: z / length };
}

/**
 * Advances the player by one frame. Pure: returns a new state and never mutates the old one.
 */
export function stepPlayer(
  player: PlayerState,
  input: InputState,
  cameraYaw: number,
  deltaSeconds: number,
  context: MovementContext,
  config: PlayerConfig = DEFAULT_PLAYER_CONFIG,
): PlayerState {
  const dt = Math.min(Math.max(deltaSeconds, 0), config.maxStep);
  if (dt === 0) {
    return player;
  }

  const intent = getMoveIntent(input, cameraYaw);
  if (intent.x === 0 && intent.z === 0) {
    return { ...player, speed: 0 };
  }

  const speed = input.sprint ? config.sprintSpeed : config.walkSpeed;
  const desired = {
    x: player.x + intent.x * speed * dt,
    z: player.z + intent.z * speed * dt,
  };
  const resolved = resolveCircleCollisions(desired, config.radius, context.obstacles, context.bounds);
  const targetHeading = Math.atan2(intent.x, intent.z);

  return {
    x: resolved.x,
    z: resolved.z,
    heading: turnToward(player.heading, targetHeading, config.turnRate * dt),
    speed,
  };
}

/**
 * Finds the free spot closest to the middle of the bounds, with `clearance` metres to spare
 * around the player. Throws if the map has no free space at all.
 */
export function findSpawnPoint(
  context: MovementContext,
  radius: number,
  clearance = 1,
  step = 2,
): Vec2 {
  const { bounds, obstacles } = context;
  const margin = radius + clearance;
  const countX = Math.max(Math.floor((bounds.width / 2 - margin) / step), 0);
  const countZ = Math.max(Math.floor((bounds.depth / 2 - margin) / step), 0);

  const candidates: Vec2[] = [];
  for (let ix = -countX; ix <= countX; ix += 1) {
    for (let iz = -countZ; iz <= countZ; iz += 1) {
      candidates.push({ x: bounds.x + ix * step, z: bounds.z + iz * step });
    }
  }

  const distanceFromCentre = (point: Vec2): number =>
    (point.x - bounds.x) * (point.x - bounds.x) + (point.z - bounds.z) * (point.z - bounds.z);
  candidates.sort((a, b) => distanceFromCentre(a) - distanceFromCentre(b));

  const free = candidates.find(
    (candidate) => !obstacles.some((obstacle) => circleIntersectsRect(candidate, margin, obstacle)),
  );
  if (!free) {
    throw new Error('No free spawn point found inside the district');
  }
  return free;
}
