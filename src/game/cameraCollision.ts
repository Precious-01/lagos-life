import type { CameraGoal, Vec3 } from './camera';
import type { Rect } from './types';

/** A building as the camera sees it: a footprint plus a height, standing on the ground (y = 0). */
export interface CameraObstacle extends Rect {
  height: number;
}

/** How far in front of a wall the camera stops, in metres. Keeps the near plane clear of it. */
export const DEFAULT_CAMERA_MARGIN = 0.5;

/**
 * Slab test of a ray against an axis-aligned box.
 * The ray is origin + t * direction. Returns the t at which it enters the box,
 * or null when it does not touch the box within 0 <= t <= 1.
 */
function rayBoxEntry(origin: Vec3, direction: Vec3, box: CameraObstacle): number | null {
  const mins: [number, number, number] = [box.x - box.width / 2, 0, box.z - box.depth / 2];
  const maxs: [number, number, number] = [box.x + box.width / 2, box.height, box.z + box.depth / 2];
  const o: [number, number, number] = [origin.x, origin.y, origin.z];
  const d: [number, number, number] = [direction.x, direction.y, direction.z];

  let tNear = -Infinity;
  let tFar = Infinity;

  for (let axis = 0; axis < 3; axis += 1) {
    if (d[axis] === 0) {
      // Parallel to this slab: the ray either stays inside it forever or never touches it.
      if (o[axis] < mins[axis] || o[axis] > maxs[axis]) {
        return null;
      }
      continue;
    }
    const t1 = (mins[axis] - o[axis]) / d[axis];
    const t2 = (maxs[axis] - o[axis]) / d[axis];
    tNear = Math.max(tNear, Math.min(t1, t2));
    tFar = Math.min(tFar, Math.max(t1, t2));
    if (tNear > tFar) {
      return null;
    }
  }

  if (tFar < 0 || tNear > 1) {
    return null;
  }
  return Math.max(tNear, 0);
}

/**
 * Keeps the camera from passing through buildings.
 * Looks along the line from the camera's target to its wanted position; if a building is in the
 * way, the camera is moved back along that line to `margin` metres before the building.
 * Returns the SAME goal object when nothing is in the way.
 */
export function constrainCameraGoal(
  goal: CameraGoal,
  obstacles: readonly CameraObstacle[],
  margin: number = DEFAULT_CAMERA_MARGIN,
): CameraGoal {
  const { position, target } = goal;
  const direction: Vec3 = {
    x: position.x - target.x,
    y: position.y - target.y,
    z: position.z - target.z,
  };
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (length === 0) {
    return goal;
  }

  let nearest = Infinity;
  for (const obstacle of obstacles) {
    const t = rayBoxEntry(target, direction, obstacle);
    if (t !== null && t < nearest) {
      nearest = t;
    }
  }
  if (nearest === Infinity) {
    return goal;
  }

  const allowedDistance = Math.max(nearest * length - margin, 0);
  const ratio = allowedDistance / length;
  return {
    position: {
      x: target.x + direction.x * ratio,
      y: target.y + direction.y * ratio,
      z: target.z + direction.z * ratio,
    },
    target,
  };
}
