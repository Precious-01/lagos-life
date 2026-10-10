import { describe, expect, it } from 'vitest';
import {
  OSM_ATTRIBUTION,
  OSM_COPYRIGHT_URL,
  WORLD_DATA_SCHEMA_VERSION,
  WORLD_PROJECTION,
  parseWorldData,
  validateWorldData,
  type WorldData,
} from './schema';

function sample(): WorldData {
  return {
    metadata: {
      schemaVersion: WORLD_DATA_SCHEMA_VERSION,
      regionId: 'test-region',
      projection: WORLD_PROJECTION,
      originLonLat: { lon: 3.385, lat: 6.485 },
      originUtm: { easting: 543000, northing: 717000 },
      widthM: 8000,
      depthM: 6000,
      sources: [
        {
          name: 'OpenStreetMap',
          url: OSM_COPYRIGHT_URL,
          licence: 'ODbL 1.0',
          retrievedAt: '2026-01-01',
        },
      ],
      attribution: OSM_ATTRIBUTION,
      generatedAt: '2026-01-01',
    },
    water: [
      {
        id: 'w1',
        kind: 'lagoon',
        rings: [[-100, -100, 100, -100, 100, 100, -100, 100]],
      },
    ],
    roads: [
      {
        id: 'r1',
        roadClass: 'primary',
        widthM: 12,
        bridge: true,
        tunnel: false,
        layer: 1,
        name: 'Test Road',
        points: [-3000, 0, 0, 100, 3000, 0],
      },
    ],
    districts: [
      {
        id: 'd1',
        name: 'Yaba',
        labelAt: { x: 0, z: 0 },
        ring: [-500, -500, 500, -500, 500, 500, -500, 500],
      },
    ],
  };
}

describe('validateWorldData', () => {
  it('accepts a well-formed sample', () => {
    expect(validateWorldData(sample())).toEqual([]);
  });

  it('rejects things that are not objects', () => {
    expect(validateWorldData(null)).toHaveLength(1);
    expect(validateWorldData('text')).toHaveLength(1);
    expect(validateWorldData([])).toHaveLength(1);
  });

  it('rejects a wrong schema version and projection', () => {
    const data = sample();
    const broken = {
      ...data,
      metadata: { ...data.metadata, schemaVersion: 2, projection: 'EPSG:4326' },
    };
    const errors = validateWorldData(broken);
    expect(errors.some((e) => e.includes('schemaVersion'))).toBe(true);
    expect(errors.some((e) => e.includes('projection'))).toBe(true);
  });

  it('requires an attribution and at least one source', () => {
    const data = sample();
    const broken = { ...data, metadata: { ...data.metadata, attribution: '', sources: [] } };
    const errors = validateWorldData(broken);
    expect(errors.some((e) => e.includes('attribution'))).toBe(true);
    expect(errors.some((e) => e.includes('sources'))).toBe(true);
  });

  it('rejects duplicate ids', () => {
    const data = sample();
    data.roads.push({ ...data.roads[0] });
    expect(validateWorldData(data).some((e) => e.includes('duplicate id'))).toBe(true);
  });

  it('rejects an unknown road class and a non-positive width', () => {
    const data = sample();
    const broken = {
      ...data,
      roads: [{ ...data.roads[0], roadClass: 'racetrack', widthM: 0 }],
    };
    const errors = validateWorldData(broken);
    expect(errors.some((e) => e.includes('roadClass'))).toBe(true);
    expect(errors.some((e) => e.includes('widthM'))).toBe(true);
  });

  it('rejects coordinate lists with an odd length or non-finite values', () => {
    const data = sample();
    const odd = { ...data, roads: [{ ...data.roads[0], points: [0, 0, 1] }] };
    expect(validateWorldData(odd).some((e) => e.includes('even number'))).toBe(true);
    const nan = { ...data, roads: [{ ...data.roads[0], points: [0, 0, Number.NaN, 1] }] };
    expect(validateWorldData(nan).some((e) => e.includes('finite numbers'))).toBe(true);
  });

  it('rejects rings with fewer than three points', () => {
    const data = sample();
    const broken = { ...data, water: [{ ...data.water[0], rings: [[0, 0, 1, 1]] }] };
    expect(validateWorldData(broken).some((e) => e.includes('at least 6'))).toBe(true);
  });

  it('rejects coordinates outside the region, using x for even and z for odd positions', () => {
    const data = sample();
    const farEast = { ...data, roads: [{ ...data.roads[0], points: [5000, 0, 0, 0] }] };
    expect(validateWorldData(farEast).some((e) => e.includes('outside the region'))).toBe(true);
    const farSouth = { ...data, roads: [{ ...data.roads[0], points: [0, 3100, 0, 0] }] };
    expect(validateWorldData(farSouth).some((e) => e.includes('outside the region'))).toBe(true);
    // 3,040 m south is inside the 50 m margin.
    const withinMargin = { ...data, roads: [{ ...data.roads[0], points: [0, 3040, 0, 0] }] };
    expect(validateWorldData(withinMargin)).toEqual([]);
  });
});

describe('parseWorldData', () => {
  it('returns valid data unchanged', () => {
    const data = sample();
    expect(parseWorldData(data)).toBe(data);
  });

  it('throws an error that lists the problems', () => {
    expect(() => parseWorldData({})).toThrow('Invalid world data');
  });
});

describe('attribution constants', () => {
  it('names OpenStreetMap contributors and points at the copyright page', () => {
    expect(OSM_ATTRIBUTION).toContain('OpenStreetMap contributors');
    expect(OSM_COPYRIGHT_URL).toBe('https://www.openstreetmap.org/copyright');
  });
});
