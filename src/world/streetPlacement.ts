import type { Vec2 } from '../game/collision';
import type { LonLat } from './projection';
import { lonLatToWorld, worldToLonLat, type WorldFrame } from './worldFrame';

/**
 * Where the hand-authored street sits in the world.
 *
 * The street's local frame (see game/street.ts): origin at the middle of the street, x east along
 * the road, z south (the north building row is at -Z), heading 0 faces +Z.
 *
 * world = anchorWorld + rotateY(rotationY) * local, using the same rotation convention as three.js
 * and the player's heading:
 *   worldX = anchorX + localX * cos(r) + localZ * sin(r)
 *   worldZ = anchorZ - localX * sin(r) + localZ * cos(r)
 * A positive rotationY therefore turns the street's east direction towards world north.
 */
export interface StreetPlacement {
  /** Degrees. The street's local origin sits here. */
  anchor: LonLat;
  /** Radians. See the formula above. */
  rotationY: number;
  /** False while the position is a placeholder and not a real Lagos street. */
  aligned: boolean;
  note: string;
}

/**
 * PLACEHOLDER. The street is put at the middle of the region with no rotation. This is NOT a real
 * Lagos street. When a real street is chosen, set `anchor`, `rotationY` and `aligned: true` here
 * and nowhere else.
 */
export const PROVISIONAL_STREET_PLACEMENT: StreetPlacement = {
  anchor: { lon: 3.385, lat: 6.485 },
  rotationY: 0,
  aligned: false,
  note: 'Placeholder at the region origin. Not a real street location.',
};

export function streetToWorld(frame: WorldFrame, placement: StreetPlacement, local: Vec2): Vec2 {
  const anchor = lonLatToWorld(frame, placement.anchor);
  const cos = Math.cos(placement.rotationY);
  const sin = Math.sin(placement.rotationY);
  return {
    x: anchor.x + local.x * cos + local.z * sin,
    z: anchor.z - local.x * sin + local.z * cos,
  };
}

export function worldToStreet(frame: WorldFrame, placement: StreetPlacement, world: Vec2): Vec2 {
  const anchor = lonLatToWorld(frame, placement.anchor);
  const dx = world.x - anchor.x;
  const dz = world.z - anchor.z;
  const cos = Math.cos(placement.rotationY);
  const sin = Math.sin(placement.rotationY);
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos,
  };
}

export function streetToLonLat(frame: WorldFrame, placement: StreetPlacement, local: Vec2): LonLat {
  return worldToLonLat(frame, streetToWorld(frame, placement, local));
}

/** A heading in the street's frame becomes this heading in the world frame (radians). */
export function streetHeadingToWorld(placement: StreetPlacement, heading: number): number {
  return heading + placement.rotationY;
}
