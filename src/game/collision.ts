import type { Rect } from './types';

/** A point or direction on the ground (XZ) plane. */
export interface Vec2 {
  x: number;
  z: number;
}

/** A few passes let a circle settle when it is pressed into a corner. */
const MAX_RESOLVE_ITERATIONS = 4;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** True when a circle overlaps the interior of a rectangle. Exactly touching is NOT overlap. */
export function circleIntersectsRect(centre: Vec2, radius: number, rect: Rect): boolean {
  const offsetX = centre.x - rect.x;
  const offsetZ = centre.z - rect.z;
  const dx = offsetX - clamp(offsetX, -rect.width / 2, rect.width / 2);
  const dz = offsetZ - clamp(offsetZ, -rect.depth / 2, rect.depth / 2);
  return dx * dx + dz * dz < radius * radius;
}

/**
 * Moves a circle out of a rectangle by the smallest distance.
 * Returns the SAME object when there is no overlap, so callers can detect "nothing changed".
 */
export function pushCircleOutOfRect(centre: Vec2, radius: number, rect: Rect): Vec2 {
  const halfWidth = rect.width / 2;
  const halfDepth = rect.depth / 2;
  const offsetX = centre.x - rect.x;
  const offsetZ = centre.z - rect.z;
  const dx = offsetX - clamp(offsetX, -halfWidth, halfWidth);
  const dz = offsetZ - clamp(offsetZ, -halfDepth, halfDepth);
  const distanceSquared = dx * dx + dz * dz;

  if (distanceSquared >= radius * radius) {
    return centre;
  }

  if (distanceSquared > 0) {
    // The circle's centre is outside the rectangle: push straight away from the nearest point.
    const distance = Math.sqrt(distanceSquared);
    const push = radius - distance;
    return {
      x: centre.x + (dx / distance) * push,
      z: centre.z + (dz / distance) * push,
    };
  }

  // The centre is inside the rectangle: leave through the nearest face.
  const exitDistanceX = halfWidth - Math.abs(offsetX);
  const exitDistanceZ = halfDepth - Math.abs(offsetZ);
  if (exitDistanceX < exitDistanceZ) {
    const sideX = offsetX < 0 ? -1 : 1;
    return { x: rect.x + sideX * (halfWidth + radius), z: centre.z };
  }
  const sideZ = offsetZ < 0 ? -1 : 1;
  return { x: centre.x, z: rect.z + sideZ * (halfDepth + radius) };
}

/** Keeps a circle fully inside a bounding rectangle. */
export function clampToBounds(position: Vec2, radius: number, bounds: Rect): Vec2 {
  const halfWidth = Math.max(bounds.width / 2 - radius, 0);
  const halfDepth = Math.max(bounds.depth / 2 - radius, 0);
  return {
    x: clamp(position.x, bounds.x - halfWidth, bounds.x + halfWidth),
    z: clamp(position.z, bounds.z - halfDepth, bounds.z + halfDepth),
  };
}

/**
 * Pushes a circle out of every obstacle and back inside the bounds.
 * Because the push is the smallest possible, a circle moving into a wall slides along it.
 */
export function resolveCircleCollisions(
  position: Vec2,
  radius: number,
  obstacles: readonly Rect[],
  bounds: Rect,
): Vec2 {
  let current = clampToBounds(position, radius, bounds);

  for (let iteration = 0; iteration < MAX_RESOLVE_ITERATIONS; iteration += 1) {
    let moved = false;
    for (const obstacle of obstacles) {
      const next = pushCircleOutOfRect(current, radius, obstacle);
      if (next !== current) {
        current = next;
        moved = true;
      }
    }
    current = clampToBounds(current, radius, bounds);
    if (!moved) {
      break;
    }
  }

  return current;
}
