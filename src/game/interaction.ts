import type { Vec2 } from './collision';
import type { StreetLayout, StreetPropSpec } from './street';
import type { Rect } from './types';

/**
 * Places in the street the player can interact with. Pure logic: it knows nothing about React,
 * Three.js or the economy. The scene and the economy both read it.
 *
 * Distances are measured from the player's centre to the EDGE of an interaction's area, so a wide
 * object (a stall) can be used from anywhere along its front.
 */

export type InteractionKind = 'supplier' | 'kiosk' | 'selling-spot';

/**
 * 'press': becomes the on-screen prompt when it is the nearest one in reach.
 * 'zone': simply being inside it counts (for example standing at your selling spot).
 */
export type InteractionActivation = 'press' | 'zone';

export interface InteractionPoint {
  id: string;
  kind: InteractionKind;
  activation: InteractionActivation;
  /** Name of the place, for example "Market stall". */
  label: string;
  /** Short description of what the player would do here, for example "Buy stock". */
  action: string;
  /** The footprint of the object or zone. */
  area: Rect;
  /** How close (in metres, to the edge of `area`) the player must be. 0 means inside the area. */
  reach: number;
  /** A spot where the player can stand to use it. Used by tests and later by waypoint markers. */
  standAt: Vec2;
}

export interface InteractionHit {
  point: InteractionPoint;
  /** Distance from the player's centre to the edge of the point's area, in metres. */
  distance: number;
}

export interface InteractionStatus {
  /** The nearest press-activated point within reach, or null. */
  prompt: InteractionHit | null;
  /** Every zone point the player is inside. */
  zones: InteractionPoint[];
  /** True when the player is inside the selling-spot zone. */
  atSellingSpot: boolean;
}

/** How far from the edge of a stall or kiosk the player can use it, in metres. */
export const INTERACT_REACH = 2.5;
/** How far in front of a stall or kiosk the stand point is, in metres. */
export const STAND_OFFSET = 1.2;

/**
 * The street hustler's selling spot: a zone on the north sidewalk, between the kiosk and the
 * streetlight, in front of the 'PHARMACY' shop. PROVISIONAL, hand-authored position.
 * The sidewalk spans z = -12..-7, so this zone (z = -11..-8) sits fully on it.
 */
export const SELLING_SPOT_AREA: Rect = { x: 2, z: -9.5, width: 5, depth: 3 };

/** Distance from a point to the edge of a rectangle. 0 when the point is inside or on the edge. */
export function distanceToRect(point: Vec2, rect: Rect): number {
  const dx = Math.max(Math.abs(point.x - rect.x) - rect.width / 2, 0);
  const dz = Math.max(Math.abs(point.z - rect.z) - rect.depth / 2, 0);
  return Math.hypot(dx, dz);
}

export function isWithinReach(point: InteractionPoint, position: Vec2): boolean {
  return distanceToRect(position, point.area) <= point.reach;
}

/**
 * Which way a prop faces the road: +1 for props on the north side (z < 0), -1 for the south side.
 * The road runs along z = 0, the same rule used when the props are drawn.
 */
function towardsRoad(prop: StreetPropSpec): 1 | -1 {
  return prop.z < 0 ? 1 : -1;
}

function findProp(street: StreetLayout, type: StreetPropSpec['type']): StreetPropSpec {
  const prop = street.props.find((candidate) => candidate.type === type);
  if (!prop) {
    throw new Error(`The street has no prop of type "${type}"`);
  }
  return prop;
}

function propArea(prop: StreetPropSpec): Rect {
  return { x: prop.x, z: prop.z, width: prop.width, depth: prop.depth };
}

function standPointFor(prop: StreetPropSpec): Vec2 {
  return {
    x: prop.x,
    z: prop.z + towardsRoad(prop) * (prop.depth / 2 + STAND_OFFSET),
  };
}

/**
 * The interaction points of the hand-authored street: the market stall (supplier), the kiosk and
 * the selling spot. Throws an Error if the street has no market stall or no kiosk.
 */
export function buildStreetInteractions(street: StreetLayout): InteractionPoint[] {
  const stall = findProp(street, 'market-stall');
  const kiosk = findProp(street, 'kiosk');

  return [
    {
      id: `supplier:${stall.id}`,
      kind: 'supplier',
      activation: 'press',
      label: 'Market stall',
      action: 'Buy stock',
      area: propArea(stall),
      reach: INTERACT_REACH,
      standAt: standPointFor(stall),
    },
    {
      id: `kiosk:${kiosk.id}`,
      kind: 'kiosk',
      activation: 'press',
      label: 'Kiosk',
      action: 'Look at the kiosk',
      area: propArea(kiosk),
      reach: INTERACT_REACH,
      standAt: standPointFor(kiosk),
    },
    {
      id: 'selling-spot:north-sidewalk',
      kind: 'selling-spot',
      activation: 'zone',
      label: 'Your selling spot',
      action: 'Sell sachet water',
      area: { ...SELLING_SPOT_AREA },
      reach: 0,
      standAt: { x: SELLING_SPOT_AREA.x, z: SELLING_SPOT_AREA.z },
    },
  ];
}

/**
 * Works out what the player is near. The prompt is the nearest press point within reach; if two
 * are equally near, the one with the smaller id wins, so the result never flickers.
 */
export function evaluateInteractions(
  points: readonly InteractionPoint[],
  position: Vec2,
): InteractionStatus {
  let prompt: InteractionHit | null = null;
  const zones: InteractionPoint[] = [];

  for (const point of points) {
    if (!isWithinReach(point, position)) {
      continue;
    }
    if (point.activation === 'zone') {
      zones.push(point);
      continue;
    }
    const distance = distanceToRect(position, point.area);
    if (
      prompt === null ||
      distance < prompt.distance ||
      (distance === prompt.distance && point.id < prompt.point.id)
    ) {
      prompt = { point, distance };
    }
  }

  return {
    prompt,
    zones,
    atSellingSpot: zones.some((zone) => zone.kind === 'selling-spot'),
  };
}
