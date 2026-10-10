import { describe, expect, it } from 'vitest';
import { LAGOS_ISLAND_YABA_REGION, REGION_FRAME, regionBounds } from './region';
import { worldRectToLonLatBounds } from './worldFrame';

describe('Lagos Island and Yaba region', () => {
  it('is 8 km by 6 km, centred on the origin', () => {
    expect(regionBounds(LAGOS_ISLAND_YABA_REGION)).toEqual({
      x: 0,
      z: 0,
      width: 8000,
      depth: 6000,
    });
  });

  it('is marked unverified until it has been checked against OpenStreetMap', () => {
    expect(LAGOS_ISLAND_YABA_REGION.verified).toBe(false);
  });

  it('covers roughly lon 3.349 to 3.421 and lat 6.458 to 6.512', () => {
    const box = worldRectToLonLatBounds(REGION_FRAME, regionBounds(LAGOS_ISLAND_YABA_REGION));
    expect(Math.abs(box.west - 3.349)).toBeLessThan(0.002);
    expect(Math.abs(box.east - 3.421)).toBeLessThan(0.002);
    expect(Math.abs(box.south - 6.458)).toBeLessThan(0.002);
    expect(Math.abs(box.north - 6.512)).toBeLessThan(0.002);
  });
});
