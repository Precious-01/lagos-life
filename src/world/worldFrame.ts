import type { Vec2 } from '../game/collision';
import type { Rect } from '../game/types';
import { lonLatToUtm31N, utm31NToLonLat, type LonLat, type UtmPoint } from './projection';

/**
 * The game's world frame, in metres:
 *   x = east, z = SOUTH (north is -Z), y = up. This matches the street layout, whose north row is at -Z.
 * "North" here is UTM GRID north. At Lagos it differs from true north by about 0.04 degrees,
 * which is negligible for this game.
 *
 * The origin is one chosen point. world.x = easting - originEasting and
 * world.z = -(northing - originNorthing).
 */
export interface WorldFrame {
  readonly originLonLat: LonLat;
  readonly originUtm: UtmPoint;
}

export interface LonLatBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export function createWorldFrame(origin: LonLat): WorldFrame {
  return { originLonLat: { ...origin }, originUtm: lonLatToUtm31N(origin) };
}

export function utmToWorld(frame: WorldFrame, utm: UtmPoint): Vec2 {
  return {
    x: utm.easting - frame.originUtm.easting,
    z: 0 - (utm.northing - frame.originUtm.northing),
  };
}

export function worldToUtm(frame: WorldFrame, point: Vec2): UtmPoint {
  return {
    easting: frame.originUtm.easting + point.x,
    northing: frame.originUtm.northing - point.z,
  };
}

export function lonLatToWorld(frame: WorldFrame, point: LonLat): Vec2 {
  return utmToWorld(frame, lonLatToUtm31N(point));
}

export function worldToLonLat(frame: WorldFrame, point: Vec2): LonLat {
  return utm31NToLonLat(worldToUtm(frame, point));
}

/**
 * The smallest degrees bounding box that contains a world rectangle.
 * All four corners are converted, because grid north is very slightly rotated from true north.
 * This is what the data script sends to OpenStreetMap.
 */
export function worldRectToLonLatBounds(frame: WorldFrame, rect: Rect): LonLatBounds {
  const worldCorners: Vec2[] = [
    { x: rect.x - rect.width / 2, z: rect.z - rect.depth / 2 },
    { x: rect.x + rect.width / 2, z: rect.z - rect.depth / 2 },
    { x: rect.x - rect.width / 2, z: rect.z + rect.depth / 2 },
    { x: rect.x + rect.width / 2, z: rect.z + rect.depth / 2 },
  ];
  const corners = worldCorners.map((corner) => worldToLonLat(frame, corner));
  const lons = corners.map((corner) => corner.lon);
  const lats = corners.map((corner) => corner.lat);
  return {
    west: Math.min(...lons),
    south: Math.min(...lats),
    east: Math.max(...lons),
    north: Math.max(...lats),
  };
}
