import { describe, expect, it } from 'vitest';
import {
  createWorldFrame,
  lonLatToWorld,
  utmToWorld,
  worldRectToLonLatBounds,
  worldToLonLat,
  worldToUtm,
} from './worldFrame';

const frame = createWorldFrame({ lon: 3.385, lat: 6.485 });

describe('world frame', () => {
  it('maps its own origin to (0, 0)', () => {
    const origin = lonLatToWorld(frame, frame.originLonLat);
    expect(origin.x).toBeCloseTo(0, 6);
    expect(origin.z).toBeCloseTo(0, 6);
  });

  it('puts east at +X', () => {
    const point = lonLatToWorld(frame, { lon: 3.395, lat: 6.485 });
    // 0.01 degrees of longitude is about 1,105 m here.
    expect(Math.abs(point.x - 1105.6)).toBeLessThan(10);
    expect(Math.abs(point.z)).toBeLessThan(2);
  });

  it('puts north at -Z', () => {
    const point = lonLatToWorld(frame, { lon: 3.385, lat: 6.495 });
    // 0.01 degrees of latitude is about 1,105 m here, and north is negative z.
    expect(Math.abs(point.z + 1105.4)).toBeLessThan(10);
    expect(Math.abs(point.x)).toBeLessThan(2);
  });

  it('round-trips world metres through degrees', () => {
    const problems: string[] = [];
    for (let x = -4000; x <= 4000; x += 1000) {
      for (let z = -3000; z <= 3000; z += 1000) {
        const back = lonLatToWorld(frame, worldToLonLat(frame, { x, z }));
        if (Math.abs(back.x - x) > 0.01 || Math.abs(back.z - z) > 0.01) {
          problems.push(`${x},${z}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('converts between UTM and world metres in both directions', () => {
    const utm = worldToUtm(frame, { x: 250, z: -400 });
    expect(utm.easting).toBeCloseTo(frame.originUtm.easting + 250, 6);
    expect(utm.northing).toBeCloseTo(frame.originUtm.northing + 400, 6);
    const back = utmToWorld(frame, utm);
    expect(back.x).toBeCloseTo(250, 6);
    expect(back.z).toBeCloseTo(-400, 6);
  });
});

describe('worldRectToLonLatBounds', () => {
  it('returns a box that contains the origin and is wider than tall for a wide rectangle', () => {
    const bounds = worldRectToLonLatBounds(frame, { x: 0, z: 0, width: 8000, depth: 6000 });
    expect(bounds.west).toBeLessThan(frame.originLonLat.lon);
    expect(bounds.east).toBeGreaterThan(frame.originLonLat.lon);
    expect(bounds.south).toBeLessThan(frame.originLonLat.lat);
    expect(bounds.north).toBeGreaterThan(frame.originLonLat.lat);
    expect(bounds.east - bounds.west).toBeGreaterThan(bounds.north - bounds.south);
  });

  it('is about 8 km wide and 6 km tall', () => {
    const bounds = worldRectToLonLatBounds(frame, { x: 0, z: 0, width: 8000, depth: 6000 });
    const widthMetres = (bounds.east - bounds.west) * 110563;
    const heightMetres = (bounds.north - bounds.south) * 110543;
    expect(Math.abs(widthMetres - 8000)).toBeLessThan(80);
    expect(Math.abs(heightMetres - 6000)).toBeLessThan(80);
  });
});
