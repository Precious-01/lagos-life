import { describe, expect, it } from 'vitest';
import {
  facadeFeatures,
  frontFaceZ,
  frontNormal,
  windowsPerFloor,
  type FacadeFeature,
} from './facade';
import { rectContains } from './rect';
import { DEFAULT_STREET_LAYOUT, GROUND_FLOOR_HEIGHT } from './street';

const { buildings, surfaces } = DEFAULT_STREET_LAYOUT;
const EPS = 1e-9;

function overlapsInFacadePlane(a: FacadeFeature, b: FacadeFeature): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - EPS &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2 - EPS
  );
}

describe('windowsPerFloor', () => {
  it('fits more windows on wider facades and always at least one', () => {
    expect(windowsPerFloor(8)).toBe(2);
    expect(windowsPerFloor(10)).toBe(3);
    expect(windowsPerFloor(12)).toBe(4);
    expect(windowsPerFloor(2)).toBe(1);
  });
});

describe('frontNormal', () => {
  it('points towards the road', () => {
    expect(frontNormal({ front: 'plusZ' })).toBe(1);
    expect(frontNormal({ front: 'minusZ' })).toBe(-1);
  });
});

describe('facadeFeatures', () => {
  it('is deterministic', () => {
    expect(facadeFeatures(buildings[0])).toEqual(facadeFeatures(buildings[0]));
  });

  it('puts one window per slot on every upper floor', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      const windows = facadeFeatures(building).filter((f) => f.type === 'window');
      const expected = (building.floors - 1) * windowsPerFloor(building.width);
      if (windows.length !== expected) {
        problems.push(`${building.id}: ${windows.length} windows, expected ${expected}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps windows above the ground floor', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      for (const f of facadeFeatures(building)) {
        if (f.type === 'window' && f.y - f.height / 2 < GROUND_FLOOR_HEIGHT - EPS) {
          problems.push(building.id);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps every feature inside the width and height of its building', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      for (const f of facadeFeatures(building)) {
        const insideWidth = Math.abs(f.x - building.x) + f.width / 2 <= building.width / 2 + EPS;
        const insideHeight =
          f.y - f.height / 2 >= -EPS && f.y + f.height / 2 <= building.height + EPS;
        if (!insideWidth || !insideHeight) {
          problems.push(`${building.id}:${f.type}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('sits every feature exactly on the front wall, on the outside', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      const faceZ = frontFaceZ(building);
      const normal = frontNormal(building);
      for (const f of facadeFeatures(building)) {
        const gap = normal * (f.z - faceZ) - f.depth / 2;
        if (Math.abs(gap) > EPS) {
          problems.push(`${building.id}:${f.type}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('never lets two features overlap', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      const features = facadeFeatures(building);
      for (let i = 0; i < features.length; i += 1) {
        for (let j = i + 1; j < features.length; j += 1) {
          if (overlapsInFacadePlane(features[i], features[j])) {
            problems.push(`${building.id}:${features[i].type}/${features[j].type}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('gives shopfronts an opening and an awning, and everything else a door', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      const types = facadeFeatures(building).map((f) => f.type);
      if (building.kind === 'shopfront') {
        const signs = types.filter((t) => t === 'signboard').length;
        const ok =
          types.includes('shop-opening') &&
          types.includes('awning') &&
          !types.includes('door') &&
          signs === (building.sign === null ? 0 : 1);
        if (!ok) {
          problems.push(building.id);
        }
      } else if (
        !types.includes('door') ||
        types.includes('awning') ||
        types.includes('shop-opening')
      ) {
        problems.push(building.id);
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps awnings over the sidewalk and off the road', () => {
    const problems: string[] = [];
    for (const building of buildings) {
      for (const f of facadeFeatures(building)) {
        if (f.type !== 'awning') {
          continue;
        }
        const rect = { x: f.x, z: f.z, width: f.width, depth: f.depth };
        if (!surfaces.sidewalks.some((sidewalk) => rectContains(sidewalk, rect))) {
          problems.push(building.id);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
