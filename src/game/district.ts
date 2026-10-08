import { rectContains } from './rect';
import { createRng, pickOne, randomInRange, type Rng } from './rng';
import type { BuildingKind, BuildingSpec, District, DistrictConfig, Rect } from './types';

export const DEFAULT_DISTRICT_CONFIG: DistrictConfig = {
  seed: 1960,
  blocksX: 4,
  blocksZ: 4,
  blockSize: 24,
  roadWidth: 8,
};

/** Each block is split into LOTS_PER_SIDE x LOTS_PER_SIDE lots. */
const LOTS_PER_SIDE = 2;
/** Gap kept between a building and the edge of its lot, so neighbours never touch. */
const SETBACK = 1;
/** Chance that a lot is left empty (a yard, a parking spot, a future plot). */
const EMPTY_LOT_CHANCE = 0.12;

interface KindProfile {
  kind: BuildingKind;
  weight: number;
  minHeight: number;
  maxHeight: number;
  palette: readonly string[];
}

const KIND_PROFILES: readonly KindProfile[] = [
  {
    kind: 'compound',
    weight: 4,
    minHeight: 3,
    maxHeight: 4.5,
    palette: ['#d9b382', '#c8a27a', '#e3cba5'],
  },
  {
    kind: 'shopfront',
    weight: 3,
    minHeight: 4,
    maxHeight: 6,
    palette: ['#c8704f', '#d9a05b', '#b5573d'],
  },
  {
    kind: 'apartment',
    weight: 3,
    minHeight: 9,
    maxHeight: 16,
    palette: ['#8fb8a8', '#a9c4cf', '#e6dccb'],
  },
  {
    kind: 'tower',
    weight: 1,
    minHeight: 20,
    maxHeight: 32,
    palette: ['#9aa7b5', '#7e8fa3'],
  },
];

function pickProfile(rng: Rng): KindProfile {
  const totalWeight = KIND_PROFILES.reduce((sum, profile) => sum + profile.weight, 0);
  let roll = rng() * totalWeight;
  for (const profile of KIND_PROFILES) {
    roll -= profile.weight;
    if (roll < 0) {
      return profile;
    }
  }
  return KIND_PROFILES[0];
}

function validateConfig(config: DistrictConfig): void {
  const lotSize = config.blockSize / LOTS_PER_SIDE;
  if (!Number.isInteger(config.blocksX) || config.blocksX < 1) {
    throw new RangeError('blocksX must be an integer of at least 1');
  }
  if (!Number.isInteger(config.blocksZ) || config.blocksZ < 1) {
    throw new RangeError('blocksZ must be an integer of at least 1');
  }
  if (config.roadWidth <= 0) {
    throw new RangeError('roadWidth must be greater than 0');
  }
  if (lotSize - 2 * SETBACK <= 0) {
    throw new RangeError('blockSize is too small to fit any buildings');
  }
}

function createBuilding(rng: Rng, id: string, lotX: number, lotZ: number, lotSize: number) {
  const profile = pickProfile(rng);
  const available = lotSize - 2 * SETBACK;
  const width = randomInRange(rng, available * 0.6, available);
  const depth = randomInRange(rng, available * 0.6, available);
  const x = lotX + randomInRange(rng, -(available - width) / 2, (available - width) / 2);
  const z = lotZ + randomInRange(rng, -(available - depth) / 2, (available - depth) / 2);
  const height = randomInRange(rng, profile.minHeight, profile.maxHeight);
  const color = pickOne(rng, profile.palette);

  const building: BuildingSpec = { id, kind: profile.kind, x, z, width, depth, height, color };
  return building;
}

/**
 * Builds a grid of city blocks separated by roads, then fills each block's lots with buildings.
 * Pure and deterministic: the same config always returns the same district.
 * Buildings never overlap each other, never cross a road, and never leave the district bounds.
 */
export function generateDistrict(config: DistrictConfig): District {
  validateConfig(config);

  const { blocksX, blocksZ, blockSize, roadWidth } = config;
  const pitch = blockSize + roadWidth;
  const width = blocksX * pitch + roadWidth;
  const depth = blocksZ * pitch + roadWidth;
  const lotSize = blockSize / LOTS_PER_SIDE;
  const rng = createRng(config.seed);

  const blocks: Rect[] = [];
  const roads: Rect[] = [];
  const buildings: BuildingSpec[] = [];

  for (let ix = 0; ix < blocksX; ix += 1) {
    for (let iz = 0; iz < blocksZ; iz += 1) {
      const block: Rect = {
        x: -width / 2 + roadWidth + blockSize / 2 + ix * pitch,
        z: -depth / 2 + roadWidth + blockSize / 2 + iz * pitch,
        width: blockSize,
        depth: blockSize,
      };
      blocks.push(block);

      for (let lx = 0; lx < LOTS_PER_SIDE; lx += 1) {
        for (let lz = 0; lz < LOTS_PER_SIDE; lz += 1) {
          if (rng() < EMPTY_LOT_CHANCE) {
            continue;
          }
          const lotX = block.x - blockSize / 2 + lotSize / 2 + lx * lotSize;
          const lotZ = block.z - blockSize / 2 + lotSize / 2 + lz * lotSize;
          buildings.push(createBuilding(rng, `b-${ix}-${iz}-${lx}-${lz}`, lotX, lotZ, lotSize));
        }
      }
    }
  }

  // Roads run the full length of the district; they cross at intersections.
  for (let i = 0; i <= blocksX; i += 1) {
    roads.push({ x: -width / 2 + roadWidth / 2 + i * pitch, z: 0, width: roadWidth, depth });
  }
  for (let j = 0; j <= blocksZ; j += 1) {
    roads.push({ x: 0, z: -depth / 2 + roadWidth / 2 + j * pitch, width, depth: roadWidth });
  }

  const bounds: Rect = { x: 0, z: 0, width, depth };
  return { config, width, depth, bounds, blocks, roads, buildings };
}

/** True when the building sits entirely inside at least one block of the district. */
export function isBuildingOnABlock(district: District, building: BuildingSpec): boolean {
  return district.blocks.some((block) => rectContains(block, building));
}
