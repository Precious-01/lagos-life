/**
 * Axis-aligned rectangle on the ground (XZ) plane.
 * x and z are the CENTRE of the rectangle; width runs along X, depth along Z.
 */
export interface Rect {
  x: number;
  z: number;
  width: number;
  depth: number;
}

export type BuildingKind = 'compound' | 'shopfront' | 'apartment' | 'tower';

/** A building footprint (the Rect) plus how tall it is and how it looks. */
export interface BuildingSpec extends Rect {
  id: string;
  kind: BuildingKind;
  height: number;
  /** CSS hex colour, e.g. "#d9b382". */
  color: string;
}

export interface DistrictConfig {
  seed: number;
  /** Number of city blocks along X. */
  blocksX: number;
  /** Number of city blocks along Z. */
  blocksZ: number;
  /** Side length of each square block, in world units (metres). */
  blockSize: number;
  /** Width of every road between blocks, in world units. */
  roadWidth: number;
}

export interface District {
  config: DistrictConfig;
  /** Total extent along X, including the outer roads. */
  width: number;
  /** Total extent along Z, including the outer roads. */
  depth: number;
  /** The whole district as one rectangle centred on the origin. */
  bounds: Rect;
  blocks: Rect[];
  roads: Rect[];
  buildings: BuildingSpec[];
}
