import { describe, expect, it } from 'vitest';
import { headingToDirection, normalizeAngle, turnToward } from './angles';

describe('normalizeAngle', () => {
  it('leaves small angles unchanged', () => {
    expect(normalizeAngle(0.5)).toBeCloseTo(0.5, 10);
    expect(normalizeAngle(-0.5)).toBeCloseTo(-0.5, 10);
  });

  it('wraps angles beyond a half turn', () => {
    expect(normalizeAngle((3 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2, 10);
    expect(normalizeAngle((-3 * Math.PI) / 2)).toBeCloseTo(Math.PI / 2, 10);
  });

  it('wraps several full turns', () => {
    expect(normalizeAngle(0.25 + 10 * Math.PI)).toBeCloseTo(0.25, 9);
  });
});

describe('turnToward', () => {
  it('reaches the target when it is within the allowed step', () => {
    expect(turnToward(0, 0.1, 0.5)).toBeCloseTo(0.1, 10);
  });

  it('turns by at most the allowed step', () => {
    expect(turnToward(0, 1, 0.25)).toBeCloseTo(0.25, 10);
    expect(turnToward(0, -1, 0.25)).toBeCloseTo(-0.25, 10);
  });

  it('takes the shorter way across the +/-PI boundary', () => {
    // From 3 to -3 radians the short way is upwards through PI, not down through 0.
    expect(turnToward(3, -3, 0.1)).toBeCloseTo(3.1, 10);
  });
});

describe('headingToDirection', () => {
  it('heading 0 faces +Z', () => {
    const direction = headingToDirection(0);
    expect(direction.x).toBeCloseTo(0, 10);
    expect(direction.z).toBeCloseTo(1, 10);
  });

  it('heading PI/2 faces +X', () => {
    const direction = headingToDirection(Math.PI / 2);
    expect(direction.x).toBeCloseTo(1, 10);
    expect(direction.z).toBeCloseTo(0, 10);
  });
});
