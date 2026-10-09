import { createCollider, type Collider, type ColliderKind } from './collider';
import type { Vec2 } from './collision';
import type { Rect } from './types';

/** The street runs along X. All sizes are in metres. */
export const STREET_LENGTH = 80;
export const STREET_DEPTH = 44;
export const ROAD_WIDTH = 14;
export const SIDEWALK_WIDTH = 5;
/** Distance from the street's centre line to the front wall of every building. */
export const FRONTAGE_Z = ROAD_WIDTH / 2 + SIDEWALK_WIDTH;
export const GROUND_FLOOR_HEIGHT = 3.8;
export const UPPER_FLOOR_HEIGHT = 3.2;

export type StreetBuildingKind = 'shopfront' | 'apartment' | 'office' | 'house';
export type RoofStyle = 'flat' | 'corrugated' | 'hipped';
/** Which way a building's front faces. North-row buildings face +Z, south-row buildings face -Z. */
export type FrontSide = 'plusZ' | 'minusZ';

export interface StreetBuildingSpec extends Rect {
  id: string;
  kind: StreetBuildingKind;
  floors: number;
  height: number;
  front: FrontSide;
  /** CSS hex colours. */
  wallColor: string;
  trimColor: string;
  roofStyle: RoofStyle;
  roofColor: string;
  /** Text for a shop signboard, or null when the building has no sign. */
  sign: string | null;
}

export type StreetPropType =
  | 'kiosk'
  | 'market-stall'
  | 'danfo'
  | 'fence'
  | 'palm'
  | 'utility-pole'
  | 'streetlight';

export interface StreetPropSpec extends Rect {
  id: string;
  type: StreetPropType;
  height: number;
}

export interface StreetRoute {
  id: string;
  /** A place the player must be able to walk to from the spawn point. */
  point: Vec2;
}

export interface StreetSurfaces {
  road: Rect;
  sidewalks: readonly [Rect, Rect];
}

export interface StreetLayout {
  bounds: Rect;
  surfaces: StreetSurfaces;
  buildings: StreetBuildingSpec[];
  props: StreetPropSpec[];
  /** One collider per building and per prop. Used by the player AND the camera. */
  colliders: Collider[];
  spawn: Vec2;
  /** Direction the player faces on spawn, in radians (see angles.ts). */
  spawnHeading: number;
  routes: StreetRoute[];
}

export function buildingHeight(floors: number): number {
  return GROUND_FLOOR_HEIGHT + (floors - 1) * UPPER_FLOOR_HEIGHT;
}

interface LotDefinition {
  id: string;
  row: 'north' | 'south';
  xMin: number;
  xMax: number;
  depth: number;
  floors: number;
  kind: StreetBuildingKind;
  wallColor: string;
  trimColor: string;
  roofStyle: RoofStyle;
  roofColor: string;
  sign: string | null;
}

/**
 * Hand-authored building lots. Neighbours touch, except for the alleys:
 * north alleys at x -18..-14 and 18..22, south alleys at x -18..-15 and 17..21.
 * The colours are warm, weathered plaster tones; signs are generic shop types.
 */
const LOTS: readonly LotDefinition[] = [
  {
    id: 'n-1', row: 'north', xMin: -40, xMax: -28, depth: 10, floors: 4, kind: 'apartment',
    wallColor: '#e0a35c', trimColor: '#f3e6c8', roofStyle: 'flat', roofColor: '#8d8478', sign: null,
  },
  {
    id: 'n-2', row: 'north', xMin: -28, xMax: -18, depth: 9, floors: 2, kind: 'shopfront',
    wallColor: '#6ba292', trimColor: '#f3e6c8', roofStyle: 'corrugated', roofColor: '#4f7f9a', sign: 'PROVISIONS',
  },
  {
    id: 'n-3', row: 'north', xMin: -14, xMax: -4, depth: 10, floors: 5, kind: 'apartment',
    wallColor: '#d9728a', trimColor: '#f7efe0', roofStyle: 'flat', roofColor: '#7d746a', sign: null,
  },
  {
    id: 'n-4', row: 'north', xMin: -4, xMax: 6, depth: 9, floors: 2, kind: 'shopfront',
    wallColor: '#f0c14b', trimColor: '#7a3b2a', roofStyle: 'corrugated', roofColor: '#8a5a44', sign: 'PHARMACY',
  },
  {
    id: 'n-5', row: 'north', xMin: 6, xMax: 18, depth: 10, floors: 6, kind: 'office',
    wallColor: '#c9b99a', trimColor: '#e9e2d2', roofStyle: 'flat', roofColor: '#6e6a64', sign: 'PLAZA',
  },
  {
    id: 'n-6', row: 'north', xMin: 22, xMax: 32, depth: 9, floors: 3, kind: 'house',
    wallColor: '#7a9bb5', trimColor: '#f3e6c8', roofStyle: 'hipped', roofColor: '#b5573d', sign: null,
  },
  {
    id: 'n-7', row: 'north', xMin: 32, xMax: 40, depth: 10, floors: 3, kind: 'apartment',
    wallColor: '#c8553d', trimColor: '#f3e6c8', roofStyle: 'flat', roofColor: '#7d746a', sign: null,
  },
  {
    id: 's-1', row: 'south', xMin: -40, xMax: -30, depth: 9, floors: 2, kind: 'shopfront',
    wallColor: '#e8d3a8', trimColor: '#c8553d', roofStyle: 'corrugated', roofColor: '#9aa0a6', sign: 'BARBING SALOON',
  },
  {
    id: 's-2', row: 'south', xMin: -30, xMax: -18, depth: 10, floors: 4, kind: 'apartment',
    wallColor: '#8fb8a8', trimColor: '#f7efe0', roofStyle: 'flat', roofColor: '#7d746a', sign: null,
  },
  {
    id: 's-3', row: 'south', xMin: -15, xMax: -5, depth: 9, floors: 2, kind: 'shopfront',
    wallColor: '#e0a35c', trimColor: '#f7efe0', roofStyle: 'corrugated', roofColor: '#4f7f9a', sign: 'FABRICS',
  },
  {
    id: 's-4', row: 'south', xMin: -5, xMax: 7, depth: 10, floors: 5, kind: 'office',
    wallColor: '#7a9bb5', trimColor: '#e9e2d2', roofStyle: 'flat', roofColor: '#6e6a64', sign: 'BUSINESS CENTRE',
  },
  {
    id: 's-5', row: 'south', xMin: 7, xMax: 17, depth: 9, floors: 1, kind: 'shopfront',
    wallColor: '#d9728a', trimColor: '#f3e6c8', roofStyle: 'corrugated', roofColor: '#6f7f6a', sign: 'BUKA',
  },
  {
    id: 's-6', row: 'south', xMin: 21, xMax: 31, depth: 10, floors: 3, kind: 'apartment',
    wallColor: '#f0c14b', trimColor: '#7a3b2a', roofStyle: 'hipped', roofColor: '#8a5a44', sign: null,
  },
  {
    id: 's-7', row: 'south', xMin: 31, xMax: 40, depth: 9, floors: 2, kind: 'house',
    wallColor: '#c9b99a', trimColor: '#f3e6c8', roofStyle: 'corrugated', roofColor: '#9aa0a6', sign: null,
  },
];

function lotToBuilding(lot: LotDefinition): StreetBuildingSpec {
  const northRow = lot.row === 'north';
  return {
    id: lot.id,
    kind: lot.kind,
    x: (lot.xMin + lot.xMax) / 2,
    z: (northRow ? -1 : 1) * (FRONTAGE_Z + lot.depth / 2),
    width: lot.xMax - lot.xMin,
    depth: lot.depth,
    floors: lot.floors,
    height: buildingHeight(lot.floors),
    front: northRow ? 'plusZ' : 'minusZ',
    wallColor: lot.wallColor,
    trimColor: lot.trimColor,
    roofStyle: lot.roofStyle,
    roofColor: lot.roofColor,
    sign: lot.sign,
  };
}

const PROPS: readonly StreetPropSpec[] = [
  // Roadside traders, set against the building fronts.
  { id: 'kiosk-1', type: 'kiosk', x: -5, z: -10.9, width: 3, depth: 2.2, height: 2.6 },
  { id: 'stall-1', type: 'market-stall', x: -12, z: 10.9, width: 3, depth: 2.2, height: 2.4 },
  // A parked yellow danfo on the road. Scenery only.
  { id: 'danfo-1', type: 'danfo', x: 12, z: 4.6, width: 7, depth: 2.4, height: 2.6 },
  // Low fences along the kerb. The sidewalks stay open beside and behind them.
  { id: 'fence-n1', type: 'fence', x: -9, z: -7.3, width: 8, depth: 0.2, height: 1.1 },
  { id: 'fence-s1', type: 'fence', x: -24, z: 7.3, width: 12, depth: 0.2, height: 1.1 },
  // Palms.
  { id: 'palm-1', type: 'palm', x: -26, z: -8.4, width: 0.8, depth: 0.8, height: 7 },
  { id: 'palm-2', type: 'palm', x: 16, z: -8.4, width: 0.8, depth: 0.8, height: 7 },
  { id: 'palm-3', type: 'palm', x: 30, z: -8.4, width: 0.8, depth: 0.8, height: 7 },
  { id: 'palm-4', type: 'palm', x: -27, z: 8.4, width: 0.8, depth: 0.8, height: 7 },
  { id: 'palm-5', type: 'palm', x: 22, z: 8.4, width: 0.8, depth: 0.8, height: 7 },
  // Utility poles on the south kerb.
  { id: 'pole-1', type: 'utility-pole', x: -33, z: 7.4, width: 0.4, depth: 0.4, height: 9 },
  { id: 'pole-2', type: 'utility-pole', x: -8, z: 7.4, width: 0.4, depth: 0.4, height: 9 },
  { id: 'pole-3', type: 'utility-pole', x: 16, z: 7.4, width: 0.4, depth: 0.4, height: 9 },
  { id: 'pole-4', type: 'utility-pole', x: 34, z: 7.4, width: 0.4, depth: 0.4, height: 9 },
  // Streetlights on the north kerb.
  { id: 'light-1', type: 'streetlight', x: -20, z: -7.4, width: 0.4, depth: 0.4, height: 7 },
  { id: 'light-2', type: 'streetlight', x: 4, z: -7.4, width: 0.4, depth: 0.4, height: 7 },
  { id: 'light-3', type: 'streetlight', x: 28, z: -7.4, width: 0.4, depth: 0.4, height: 7 },
];

/** Which kind of collider each prop produces. */
export function colliderKindFor(type: StreetPropType): ColliderKind {
  switch (type) {
    case 'kiosk':
    case 'market-stall':
      return 'kiosk';
    case 'danfo':
      return 'vehicle';
    case 'fence':
      return 'fence';
    case 'palm':
    case 'utility-pole':
    case 'streetlight':
      return 'prop';
  }
}

/** Places the player must be able to reach. The layout test walks a flood fill to every one. */
const ROUTES: readonly StreetRoute[] = [
  { id: 'road-west', point: { x: -36, z: 0 } },
  { id: 'road-east', point: { x: 36, z: 0 } },
  { id: 'north-sidewalk-west', point: { x: -34, z: -9.5 } },
  { id: 'north-sidewalk-east', point: { x: 36, z: -9.5 } },
  { id: 'kiosk-front', point: { x: -5, z: -8.6 } },
  { id: 'stall-front', point: { x: -12, z: 8.6 } },
  { id: 'danfo-road-side', point: { x: 12, z: 1.5 } },
  { id: 'danfo-sidewalk-side', point: { x: 12, z: 9 } },
  { id: 'north-alley-west', point: { x: -16, z: -18 } },
  { id: 'north-alley-east', point: { x: 20, z: -18 } },
  { id: 'south-alley-west', point: { x: -16.4, z: 18 } },
  { id: 'south-alley-east', point: { x: 19, z: 18 } },
];

/** Builds the street. Pure and deterministic: every call returns an equal layout. */
export function buildStreetLayout(): StreetLayout {
  const buildings = LOTS.map(lotToBuilding);
  const props = PROPS.map((prop) => ({ ...prop }));

  const colliders: Collider[] = [
    ...buildings.map((building) => createCollider('building', building, building.height)),
    ...props.map((prop) => createCollider(colliderKindFor(prop.type), prop, prop.height)),
  ];

  const sidewalkCentreZ = ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2;

  return {
    bounds: { x: 0, z: 0, width: STREET_LENGTH, depth: STREET_DEPTH },
    surfaces: {
      road: { x: 0, z: 0, width: STREET_LENGTH, depth: ROAD_WIDTH },
      sidewalks: [
        { x: 0, z: -sidewalkCentreZ, width: STREET_LENGTH, depth: SIDEWALK_WIDTH },
        { x: 0, z: sidewalkCentreZ, width: STREET_LENGTH, depth: SIDEWALK_WIDTH },
      ],
    },
    buildings,
    props,
    colliders,
    spawn: { x: -2, z: 0 },
    spawnHeading: Math.PI / 2,
    routes: ROUTES.map((route) => ({ id: route.id, point: { ...route.point } })),
  };
}

export const DEFAULT_STREET_LAYOUT: StreetLayout = buildStreetLayout();
