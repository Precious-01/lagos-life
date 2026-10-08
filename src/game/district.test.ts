import { describe, expect, it } from 'vitest';
import { DEFAULT_DISTRICT_CONFIG, generateDistrict, isBuildingOnABlock } from './district';
import { rectContains, rectsOverlap } from './rect';

const district = generateDistrict(DEFAULT_DISTRICT_CONFIG);

describe('generateDistrict', () => {
  it('calculates the district size from the config', () => {
    // 4 blocks * (24 + 8) + 8 = 136
    expect(district.width).toBe(136);
    expect(district.depth).toBe(136);
    expect(district.blocks).toHaveLength(16);
    expect(district.roads).toHaveLength(10);
  });

  it('is deterministic for the same seed', () => {
    expect(generateDistrict(DEFAULT_DISTRICT_CONFIG)).toEqual(district);
  });

  it('produces a different layout for a different seed', () => {
    const other = generateDistrict({ ...DEFAULT_DISTRICT_CONFIG, seed: 2024 });
    expect(other.buildings).not.toEqual(district.buildings);
  });

  it('creates buildings, but never more than there are lots', () => {
    expect(district.buildings.length).toBeGreaterThan(0);
    expect(district.buildings.length).toBeLessThanOrEqual(16 * 4);
  });

  it('gives every building a unique id and a positive size', () => {
    const ids = new Set(district.buildings.map((building) => building.id));
    expect(ids.size).toBe(district.buildings.length);
    for (const building of district.buildings) {
      expect(building.width).toBeGreaterThan(0);
      expect(building.depth).toBeGreaterThan(0);
      expect(building.height).toBeGreaterThan(0);
    }
  });

  it('never lets two buildings overlap', () => {
    const { buildings } = district;
    for (let i = 0; i < buildings.length; i += 1) {
      for (let j = i + 1; j < buildings.length; j += 1) {
        expect(rectsOverlap(buildings[i], buildings[j])).toBe(false);
      }
    }
  });

  it('keeps every building inside the district bounds and on a block', () => {
    for (const building of district.buildings) {
      expect(rectContains(district.bounds, building)).toBe(true);
      expect(isBuildingOnABlock(district, building)).toBe(true);
    }
  });

  it('keeps every road free of buildings', () => {
    for (const building of district.buildings) {
      for (const road of district.roads) {
        expect(rectsOverlap(building, road)).toBe(false);
      }
    }
  });

  it('rejects invalid configurations', () => {
    expect(() => generateDistrict({ ...DEFAULT_DISTRICT_CONFIG, blocksX: 0 })).toThrow(RangeError);
    expect(() => generateDistrict({ ...DEFAULT_DISTRICT_CONFIG, roadWidth: 0 })).toThrow(
      RangeError,
    );
    expect(() => generateDistrict({ ...DEFAULT_DISTRICT_CONFIG, blockSize: 2 })).toThrow(
      RangeError,
    );
  });
});
