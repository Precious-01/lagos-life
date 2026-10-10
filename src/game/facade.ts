import { GROUND_FLOOR_HEIGHT, UPPER_FLOOR_HEIGHT, type StreetBuildingSpec } from './street';

export type FacadeFeatureType = 'window' | 'shop-opening' | 'door' | 'awning' | 'signboard';

/** A box attached to a building's front face. x/y/z are the CENTRE of the box. */
export interface FacadeFeature {
  type: FacadeFeatureType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
}

export const WINDOW_WIDTH = 1.2;
export const WINDOW_HEIGHT = 1.4;
const FEATURE_DEPTH = 0.12;
const AWNING_DEPTH = 1.2;
const SIGN_DEPTH = 0.2;

/** +1 when the front faces +Z, -1 when it faces -Z. */
export function frontNormal(building: Pick<StreetBuildingSpec, 'front'>): 1 | -1 {
  return building.front === 'plusZ' ? 1 : -1;
}

/** The z coordinate of the building's front wall. */
export function frontFaceZ(building: Pick<StreetBuildingSpec, 'front' | 'z' | 'depth'>): number {
  return building.z + (frontNormal(building) * building.depth) / 2;
}

/** How many windows fit on one floor of a facade of the given width. */
export function windowsPerFloor(width: number): number {
  return Math.max(1, Math.floor((width - 1.5) / 2.4));
}

/**
 * Windows, doors, shop openings, awnings and signboards for one building's front.
 * Pure and deterministic. Every feature sits on the front wall and stays inside the building's
 * width and height. Awnings project over the sidewalk but never reach the road.
 */
export function facadeFeatures(building: StreetBuildingSpec): FacadeFeature[] {
  const normal = frontNormal(building);
  const faceZ = frontFaceZ(building);
  /** The z of a box of the given thickness that sits exactly on the front wall. */
  const onSurface = (thickness: number): number => faceZ + (normal * thickness) / 2;
  const features: FacadeFeature[] = [];

  const count = windowsPerFloor(building.width);
  const spacing = building.width / count;
  for (let floor = 1; floor < building.floors; floor += 1) {
    const floorBase = GROUND_FLOOR_HEIGHT + (floor - 1) * UPPER_FLOOR_HEIGHT;
    for (let i = 0; i < count; i += 1) {
      features.push({
        type: 'window',
        x: building.x - building.width / 2 + spacing * (i + 0.5),
        y: floorBase + 1.7,
        z: onSurface(FEATURE_DEPTH),
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT,
        depth: FEATURE_DEPTH,
      });
    }
  }

  if (building.kind === 'shopfront') {
    features.push({
      type: 'shop-opening',
      x: building.x,
      y: 1.2,
      z: onSurface(FEATURE_DEPTH),
      width: building.width * 0.6,
      height: 2.4,
      depth: FEATURE_DEPTH,
    });
    features.push({
      type: 'awning',
      x: building.x,
      y: 2.75,
      z: onSurface(AWNING_DEPTH),
      width: building.width * 0.8,
      height: 0.12,
      depth: AWNING_DEPTH,
    });
    if (building.sign !== null) {
      features.push({
        type: 'signboard',
        x: building.x,
        y: 3.4,
        z: onSurface(SIGN_DEPTH),
        width: building.width * 0.6,
        height: 0.7,
        depth: SIGN_DEPTH,
      });
    }
  } else {
    features.push({
      type: 'door',
      x: building.x,
      y: 1.15,
      z: onSurface(FEATURE_DEPTH),
      width: 1.4,
      height: 2.3,
      depth: FEATURE_DEPTH,
    });
  }

  return features;
}
