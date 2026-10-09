const TWO_PI = Math.PI * 2;

/**
 * Heading convention used everywhere in the game:
 * heading 0 faces +Z, and heading PI/2 faces +X. Positive angles turn towards +X.
 */

/** Wraps an angle in radians into the range [-PI, PI). */
export function normalizeAngle(angle: number): number {
  return ((((angle + Math.PI) % TWO_PI) + TWO_PI) % TWO_PI) - Math.PI;
}

/**
 * Rotates `current` towards `target` by at most `maxDelta` radians,
 * always taking the shorter way round the circle.
 */
export function turnToward(current: number, target: number, maxDelta: number): number {
  const difference = normalizeAngle(target - current);
  if (Math.abs(difference) <= maxDelta) {
    return normalizeAngle(target);
  }
  return normalizeAngle(current + Math.sign(difference) * maxDelta);
}

/** The unit direction on the ground (XZ) plane that a heading faces. */
export function headingToDirection(heading: number): { x: number; z: number } {
  return { x: Math.sin(heading), z: Math.cos(heading) };
}
