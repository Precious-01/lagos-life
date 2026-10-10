import { describe, expect, it } from 'vitest';
import { headingToDirection } from '../game/angles';
import { createWorldFrame, lonLatToWorld } from './worldFrame';
import {
  PROVISIONAL_STREET_PLACEMENT,
  streetHeadingToWorld,
  streetToLonLat,
  streetToWorld,
  worldToStreet,
  type StreetPlacement,
} from './streetPlacement';

const frame = createWorldFrame({ lon: 3.385, lat: 6.485 });

describe('street placement', () => {
  it('is marked as a placeholder', () => {
    expect(PROVISIONAL_STREET_PLACEMENT.aligned).toBe(false);
  });

  it('puts the street origin at the anchor', () => {
    const world = streetToWorld(frame, PROVISIONAL_STREET_PLACEMENT, { x: 0, z: 0 });
    const anchor = lonLatToWorld(frame, PROVISIONAL_STREET_PLACEMENT.anchor);
    expect(world.x).toBeCloseTo(anchor.x, 9);
    expect(world.z).toBeCloseTo(anchor.z, 9);
  });

  it('keeps the street axes aligned with the world when not rotated', () => {
    const anchor = lonLatToWorld(frame, PROVISIONAL_STREET_PLACEMENT.anchor);
    const world = streetToWorld(frame, PROVISIONAL_STREET_PLACEMENT, { x: -40, z: -22 });
    expect(world.x).toBeCloseTo(anchor.x - 40, 9);
    expect(world.z).toBeCloseTo(anchor.z - 22, 9);
  });

  it('turns local east towards world north for a quarter turn', () => {
    const placement: StreetPlacement = {
      ...PROVISIONAL_STREET_PLACEMENT,
      rotationY: Math.PI / 2,
    };
    const anchor = lonLatToWorld(frame, placement.anchor);
    const world = streetToWorld(frame, placement, { x: 10, z: 0 });
    expect(world.x).toBeCloseTo(anchor.x, 9);
    expect(world.z).toBeCloseTo(anchor.z - 10, 9);
  });

  it('round-trips between street and world coordinates', () => {
    const placement: StreetPlacement = { ...PROVISIONAL_STREET_PLACEMENT, rotationY: 0.7 };
    const problems: string[] = [];
    for (let x = -40; x <= 40; x += 20) {
      for (let z = -22; z <= 22; z += 11) {
        const back = worldToStreet(frame, placement, streetToWorld(frame, placement, { x, z }));
        if (Math.abs(back.x - x) > 1e-9 || Math.abs(back.z - z) > 1e-9) {
          problems.push(`${x},${z}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('rotates headings the same way it rotates positions', () => {
    const placement: StreetPlacement = { ...PROVISIONAL_STREET_PLACEMENT, rotationY: 0.9 };
    const localHeading = 0.4;
    const localDirection = headingToDirection(localHeading);
    const anchor = streetToWorld(frame, placement, { x: 0, z: 0 });
    const tip = streetToWorld(frame, placement, localDirection);
    const worldDirection = headingToDirection(streetHeadingToWorld(placement, localHeading));
    expect(tip.x - anchor.x).toBeCloseTo(worldDirection.x, 9);
    expect(tip.z - anchor.z).toBeCloseTo(worldDirection.z, 9);
  });

  it('converts a street point to degrees near the anchor', () => {
    const point = streetToLonLat(frame, PROVISIONAL_STREET_PLACEMENT, { x: 0, z: 0 });
    expect(point.lon).toBeCloseTo(PROVISIONAL_STREET_PLACEMENT.anchor.lon, 8);
    expect(point.lat).toBeCloseTo(PROVISIONAL_STREET_PLACEMENT.anchor.lat, 8);
  });
});
