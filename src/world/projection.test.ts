import { describe, expect, it } from 'vitest';
import { createRng } from '../game/rng';
import { lonLatToUtm31N, utm31NToLonLat } from './projection';

describe('lonLatToUtm31N', () => {
  it('maps the equator on the central meridian to the false origin', () => {
    const utm = lonLatToUtm31N({ lon: 3, lat: 0 });
    expect(utm.easting).toBeCloseTo(500000, 6);
    expect(utm.northing).toBeCloseTo(0, 6);
  });

  it('keeps the central meridian at the false easting for every latitude', () => {
    for (const lat of [1, 6.5, 30, 60]) {
      expect(lonLatToUtm31N({ lon: 3, lat }).easting).toBeCloseTo(500000, 6);
    }
  });

  it('gives a northing near 718.5 km for 6.5 N on the central meridian', () => {
    // Meridian arc to 6.5 N is about 718,764 m; the UTM scale factor 0.9996 makes it about 718,476 m.
    const utm = lonLatToUtm31N({ lon: 3, lat: 6.5 });
    expect(Math.abs(utm.northing - 718476)).toBeLessThan(10);
  });

  it('puts Lagos Island about 40 km east of the central meridian and 713 km north', () => {
    const utm = lonLatToUtm31N({ lon: 3.39, lat: 6.45 });
    expect(utm.easting).toBeGreaterThan(540000);
    expect(utm.easting).toBeLessThan(546000);
    expect(utm.northing).toBeGreaterThan(710000);
    expect(utm.northing).toBeLessThan(716000);
  });

  it('measures about 111.3 km per degree of longitude on the equator', () => {
    const utm = lonLatToUtm31N({ lon: 4, lat: 0 });
    expect(Math.abs(utm.easting - 500000 - 111275)).toBeLessThan(40);
  });

  it('increases easting eastwards and northing northwards', () => {
    const base = lonLatToUtm31N({ lon: 3.4, lat: 6.5 });
    expect(lonLatToUtm31N({ lon: 3.41, lat: 6.5 }).easting).toBeGreaterThan(base.easting);
    expect(lonLatToUtm31N({ lon: 3.4, lat: 6.51 }).northing).toBeGreaterThan(base.northing);
  });

  it('rejects values outside the supported zone', () => {
    expect(() => lonLatToUtm31N({ lon: 7, lat: 6 })).toThrow(RangeError);
    expect(() => lonLatToUtm31N({ lon: -1, lat: 6 })).toThrow(RangeError);
    expect(() => lonLatToUtm31N({ lon: 3, lat: -1 })).toThrow(RangeError);
    expect(() => lonLatToUtm31N({ lon: 3, lat: 85 })).toThrow(RangeError);
    expect(() => lonLatToUtm31N({ lon: Number.NaN, lat: 6 })).toThrow(RangeError);
  });
});

describe('utm31NToLonLat', () => {
  it('maps the false origin back to the equator on the central meridian', () => {
    const point = utm31NToLonLat({ easting: 500000, northing: 0 });
    expect(point.lon).toBeCloseTo(3, 9);
    expect(point.lat).toBeCloseTo(0, 9);
  });

  it('rejects impossible values', () => {
    expect(() => utm31NToLonLat({ easting: Number.NaN, northing: 1 })).toThrow(RangeError);
    expect(() => utm31NToLonLat({ easting: 500000, northing: -5 })).toThrow(RangeError);
    expect(() => utm31NToLonLat({ easting: 50000, northing: 700000 })).toThrow(RangeError);
  });
});

describe('round trips', () => {
  it('returns the same degrees across the whole Lagos area (within about 1 mm)', () => {
    const problems: string[] = [];
    for (let lon = 3.2; lon <= 3.6; lon += 0.02) {
      for (let lat = 6.3; lat <= 6.7; lat += 0.02) {
        const back = utm31NToLonLat(lonLatToUtm31N({ lon, lat }));
        if (Math.abs(back.lon - lon) > 1e-8 || Math.abs(back.lat - lat) > 1e-8) {
          problems.push(`${lon},${lat} -> ${back.lon},${back.lat}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('returns the same degrees for random points across the zone (within about 10 cm)', () => {
    const rng = createRng(31);
    const problems: string[] = [];
    for (let i = 0; i < 300; i += 1) {
      const lon = rng() * 6;
      const lat = rng() * 80;
      const back = utm31NToLonLat(lonLatToUtm31N({ lon, lat }));
      if (Math.abs(back.lon - lon) > 1e-6 || Math.abs(back.lat - lat) > 1e-6) {
        problems.push(`${lon},${lat}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('returns the same metres when starting from UTM (within 1 cm)', () => {
    const problems: string[] = [];
    for (let easting = 530000; easting <= 560000; easting += 5000) {
      for (let northing = 705000; northing <= 725000; northing += 5000) {
        const back = lonLatToUtm31N(utm31NToLonLat({ easting, northing }));
        if (Math.abs(back.easting - easting) > 0.01 || Math.abs(back.northing - northing) > 0.01) {
          problems.push(`${easting},${northing}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
