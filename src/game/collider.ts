import type { BuildingSpec, Rect } from './types';

export type ColliderKind = 'building' | 'kiosk' | 'fence' | 'vehicle' | 'prop';

/**
 * A solid object as the game logic sees it: an axis-aligned footprint plus a height.
 * It is independent of how the object is drawn. A Collider can be passed anywhere a Rect
 * (player movement) or a CameraObstacle (camera collision) is expected.
 */
export interface Collider extends Rect {
  kind: ColliderKind;
  height: number;
}

export function createCollider(kind: ColliderKind, rect: Rect, height: number): Collider {
  if (rect.width <= 0 || rect.depth <= 0 || height <= 0) {
    throw new RangeError('A collider needs a positive width, depth and height');
  }
  return {
    kind,
    x: rect.x,
    z: rect.z,
    width: rect.width,
    depth: rect.depth,
    height,
  };
}

/** Turns generated buildings into colliders, copying only what collision needs. */
export function buildingsToColliders(buildings: readonly BuildingSpec[]): Collider[] {
  return buildings.map((building) => createCollider('building', building, building.height));
}
