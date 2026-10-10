import type { Vec2 } from '../game/collision';
import type { LonLat, UtmPoint } from './projection';

export const WORLD_DATA_SCHEMA_VERSION = 1;
export const WORLD_PROJECTION = 'EPSG:32631';

/** Must be shown on screen wherever OpenStreetMap-derived geometry is displayed. */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';

export const ROAD_CLASSES = [
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'service',
  'path',
] as const;
export type RoadClass = (typeof ROAD_CLASSES)[number];

export const WATER_KINDS = ['sea', 'lagoon', 'river', 'other'] as const;
export type WaterKind = (typeof WATER_KINDS)[number];

export interface WorldSource {
  name: string;
  url: string;
  licence: string;
  /** ISO 8601 date when the data was downloaded. */
  retrievedAt: string;
}

export interface WorldMetadata {
  schemaVersion: typeof WORLD_DATA_SCHEMA_VERSION;
  regionId: string;
  projection: typeof WORLD_PROJECTION;
  originLonLat: LonLat;
  originUtm: UtmPoint;
  /** East-west extent of the region in metres. */
  widthM: number;
  /** North-south extent of the region in metres. */
  depthM: number;
  sources: WorldSource[];
  attribution: string;
  /** ISO 8601 date when the file was generated. */
  generatedAt: string;
}

/**
 * Coordinate arrays are flat lists of WORLD metres: [x0, z0, x1, z1, ...].
 * x is east, z is south (north is -Z). Rings are NOT closed: the last point is not a copy of the first.
 */
export interface WaterPolygon {
  id: string;
  kind: WaterKind;
  /** The first ring is the outer boundary; any others are holes. */
  rings: number[][];
}

export interface RoadSegment {
  id: string;
  roadClass: RoadClass;
  widthM: number;
  bridge: boolean;
  tunnel: boolean;
  layer: number;
  name: string | null;
  points: number[];
}

export interface DistrictArea {
  id: string;
  name: string;
  labelAt: Vec2;
  ring: number[];
}

export interface WorldData {
  metadata: WorldMetadata;
  water: WaterPolygon[];
  roads: RoadSegment[];
  districts: DistrictArea[];
}

/** How far outside the region a coordinate may be, in metres. Allows for clipped edges. */
const REGION_MARGIN_M = 50;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function isOneOf(list: readonly string[], value: unknown): boolean {
  return typeof value === 'string' && list.includes(value);
}

function isCoordinateList(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item: unknown) => isFiniteNumber(item));
}

interface Limits {
  halfWidth: number;
  halfDepth: number;
}

function checkCoordinates(
  coords: unknown,
  minLength: number,
  label: string,
  limits: Limits | null,
  errors: string[],
): void {
  if (!isCoordinateList(coords)) {
    errors.push(`${label}: coordinates must be an array of finite numbers`);
    return;
  }
  if (coords.length % 2 !== 0 || coords.length < minLength) {
    errors.push(`${label}: needs an even number of values, at least ${minLength}`);
    return;
  }
  if (limits === null) {
    return;
  }
  for (let i = 0; i < coords.length; i += 1) {
    const limit = i % 2 === 0 ? limits.halfWidth : limits.halfDepth;
    if (Math.abs(coords[i]) > limit) {
      errors.push(`${label}: value ${i} is outside the region`);
      return;
    }
  }
}

function checkList(
  value: unknown,
  name: string,
  errors: string[],
  checkItem: (item: Record<string, unknown>, label: string) => void,
): void {
  if (!Array.isArray(value)) {
    errors.push(`${name} must be an array`);
    return;
  }
  const ids = new Set<string>();
  value.forEach((item: unknown, index: number) => {
    const label = `${name}[${index}]`;
    if (!isRecord(item)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!isNonEmptyString(item.id)) {
      errors.push(`${label}: id must be a non-empty string`);
    } else if (ids.has(item.id)) {
      errors.push(`${label}: duplicate id ${item.id}`);
    } else {
      ids.add(item.id);
    }
    checkItem(item, label);
  });
}

function checkMetadata(meta: unknown, errors: string[]): Limits | null {
  if (!isRecord(meta)) {
    errors.push('metadata must be an object');
    return null;
  }
  if (meta.schemaVersion !== WORLD_DATA_SCHEMA_VERSION) {
    errors.push(`metadata.schemaVersion must be ${WORLD_DATA_SCHEMA_VERSION}`);
  }
  if (meta.projection !== WORLD_PROJECTION) {
    errors.push(`metadata.projection must be ${WORLD_PROJECTION}`);
  }
  if (!isNonEmptyString(meta.regionId)) {
    errors.push('metadata.regionId must be a non-empty string');
  }
  if (!isNonEmptyString(meta.attribution)) {
    errors.push('metadata.attribution must be a non-empty string');
  }
  if (!isNonEmptyString(meta.generatedAt)) {
    errors.push('metadata.generatedAt must be a non-empty string');
  }
  if (!Array.isArray(meta.sources) || meta.sources.length === 0) {
    errors.push('metadata.sources must be a non-empty array');
  } else {
    meta.sources.forEach((source: unknown, index: number) => {
      const ok =
        isRecord(source) &&
        isNonEmptyString(source.name) &&
        isNonEmptyString(source.url) &&
        isNonEmptyString(source.licence) &&
        isNonEmptyString(source.retrievedAt);
      if (!ok) {
        errors.push(`metadata.sources[${index}] needs name, url, licence and retrievedAt`);
      }
    });
  }
  const originOk =
    isRecord(meta.originLonLat) &&
    isFiniteNumber(meta.originLonLat.lon) &&
    isFiniteNumber(meta.originLonLat.lat);
  if (!originOk) {
    errors.push('metadata.originLonLat needs finite lon and lat');
  }
  const utmOk =
    isRecord(meta.originUtm) &&
    isFiniteNumber(meta.originUtm.easting) &&
    isFiniteNumber(meta.originUtm.northing);
  if (!utmOk) {
    errors.push('metadata.originUtm needs finite easting and northing');
  }
  if (!isFiniteNumber(meta.widthM) || meta.widthM <= 0 || !isFiniteNumber(meta.depthM) || meta.depthM <= 0) {
    errors.push('metadata.widthM and metadata.depthM must be positive numbers');
    return null;
  }
  return {
    halfWidth: meta.widthM / 2 + REGION_MARGIN_M,
    halfDepth: meta.depthM / 2 + REGION_MARGIN_M,
  };
}

/** Returns a list of problems. An empty list means the data is valid. */
export function validateWorldData(value: unknown): string[] {
  if (!isRecord(value)) {
    return ['world data must be an object'];
  }
  const errors: string[] = [];
  const limits = checkMetadata(value.metadata, errors);

  checkList(value.water, 'water', errors, (item, label) => {
    if (!isOneOf(WATER_KINDS, item.kind)) {
      errors.push(`${label}: kind must be one of ${WATER_KINDS.join(', ')}`);
    }
    if (!Array.isArray(item.rings) || item.rings.length === 0) {
      errors.push(`${label}: rings must be a non-empty array`);
      return;
    }
    item.rings.forEach((ring: unknown, index: number) => {
      checkCoordinates(ring, 6, `${label}.rings[${index}]`, limits, errors);
    });
  });

  checkList(value.roads, 'roads', errors, (item, label) => {
    if (!isOneOf(ROAD_CLASSES, item.roadClass)) {
      errors.push(`${label}: roadClass must be one of ${ROAD_CLASSES.join(', ')}`);
    }
    if (!isFiniteNumber(item.widthM) || item.widthM <= 0) {
      errors.push(`${label}: widthM must be a positive number`);
    }
    if (typeof item.bridge !== 'boolean' || typeof item.tunnel !== 'boolean') {
      errors.push(`${label}: bridge and tunnel must be booleans`);
    }
    if (!isFiniteNumber(item.layer)) {
      errors.push(`${label}: layer must be a number`);
    }
    if (item.name !== null && typeof item.name !== 'string') {
      errors.push(`${label}: name must be a string or null`);
    }
    checkCoordinates(item.points, 4, `${label}.points`, limits, errors);
  });

  checkList(value.districts, 'districts', errors, (item, label) => {
    if (!isNonEmptyString(item.name)) {
      errors.push(`${label}: name must be a non-empty string`);
    }
    const labelOk =
      isRecord(item.labelAt) && isFiniteNumber(item.labelAt.x) && isFiniteNumber(item.labelAt.z);
    if (!labelOk) {
      errors.push(`${label}: labelAt needs finite x and z`);
    }
    checkCoordinates(item.ring, 6, `${label}.ring`, limits, errors);
  });

  return errors;
}

/** Validates and returns typed world data. Throws an Error listing every problem. */
export function parseWorldData(value: unknown): WorldData {
  const errors = validateWorldData(value);
  if (errors.length > 0) {
    throw new Error(`Invalid world data:\n${errors.join('\n')}`);
  }
  return value as WorldData;
}
