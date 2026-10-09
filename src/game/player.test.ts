import { describe, expect, it } from 'vitest';
import { circleIntersectsRect } from './collision';
import { DEFAULT_DISTRICT_CONFIG, generateDistrict } from './district';
import { createInputState, type InputAction, type InputState } from './input';
import {
  DEFAULT_PLAYER_CONFIG,
  createPlayer,
  findSpawnPoint,
  getMoveIntent,
  stepPlayer,
  type MovementContext,
} from './player';

function press(...actions: InputAction[]): InputState {
  const input = createInputState();
  for (const action of actions) {
    input[action] = true;
  }
  return input;
}

const STEP = DEFAULT_PLAYER_CONFIG.maxStep;
const openField: MovementContext = {
  obstacles: [],
  bounds: { x: 0, z: 0, width: 100, depth: 100 },
};

describe('getMoveIntent', () => {
  it('is zero when nothing is pressed', () => {
    const intent = getMoveIntent(createInputState(), 0);
    expect(intent.x).toBeCloseTo(0, 10);
    expect(intent.z).toBeCloseTo(0, 10);
  });

  it('is zero when opposite keys cancel out', () => {
    const intent = getMoveIntent(press('forward', 'backward'), 0);
    expect(intent.x).toBeCloseTo(0, 10);
    expect(intent.z).toBeCloseTo(0, 10);
  });

  it('walks along the camera direction when pressing forward', () => {
    const ahead = getMoveIntent(press('forward'), 0);
    expect(ahead.x).toBeCloseTo(0, 10);
    expect(ahead.z).toBeCloseTo(1, 10);

    const towardsX = getMoveIntent(press('forward'), Math.PI / 2);
    expect(towardsX.x).toBeCloseTo(1, 10);
    expect(towardsX.z).toBeCloseTo(0, 10);
  });

  it('strafes to the right-hand side of the camera', () => {
    const intent = getMoveIntent(press('right'), 0);
    expect(intent.x).toBeCloseTo(-1, 10);
    expect(intent.z).toBeCloseTo(0, 10);
  });

  it('does not move faster diagonally', () => {
    const intent = getMoveIntent(press('forward', 'right'), 0.7);
    expect(Math.hypot(intent.x, intent.z)).toBeCloseTo(1, 10);
  });
});

describe('stepPlayer', () => {
  it('walks at walking speed', () => {
    const next = stepPlayer(createPlayer({ x: 0, z: 0 }), press('forward'), 0, STEP, openField);
    expect(next.x).toBeCloseTo(0, 9);
    expect(next.z).toBeCloseTo(DEFAULT_PLAYER_CONFIG.walkSpeed * STEP, 9);
    expect(next.speed).toBe(DEFAULT_PLAYER_CONFIG.walkSpeed);
  });

  it('sprints faster than it walks', () => {
    const start = createPlayer({ x: 0, z: 0 });
    const walk = stepPlayer(start, press('forward'), 0, STEP, openField);
    const sprint = stepPlayer(start, press('forward', 'sprint'), 0, STEP, openField);
    expect(sprint.z).toBeGreaterThan(walk.z);
    expect(sprint.z).toBeCloseTo(DEFAULT_PLAYER_CONFIG.sprintSpeed * STEP, 9);
  });

  it('stands still with no input', () => {
    const start = { ...createPlayer({ x: 3, z: 4 }), speed: 4 };
    const next = stepPlayer(start, createInputState(), 0, STEP, openField);
    expect(next.x).toBe(3);
    expect(next.z).toBe(4);
    expect(next.speed).toBe(0);
  });

  it('clamps very long frames so the player cannot jump through walls', () => {
    const next = stepPlayer(createPlayer({ x: 0, z: 0 }), press('forward'), 0, 10, openField);
    expect(next.z).toBeCloseTo(DEFAULT_PLAYER_CONFIG.walkSpeed * STEP, 9);
  });

  it('does not mutate the previous state', () => {
    const start = createPlayer({ x: 0, z: 0 });
    stepPlayer(start, press('forward'), 0, STEP, openField);
    expect(start).toEqual({ x: 0, z: 0, heading: 0, speed: 0 });
  });

  it('stops at a wall', () => {
    // A wall spanning z = 1..3. The player's radius is 0.4, so the closest centre is z = 0.6.
    const context: MovementContext = {
      obstacles: [{ x: 0, z: 2, width: 20, depth: 2 }],
      bounds: openField.bounds,
    };
    let player = createPlayer({ x: 0, z: 0 });
    for (let i = 0; i < 100; i += 1) {
      player = stepPlayer(player, press('forward'), 0, STEP, context);
    }
    expect(player.z).toBeCloseTo(0.6, 6);
    expect(player.z).toBeLessThanOrEqual(0.6 + 1e-9);
  });

  it('slides along a wall when moving diagonally into it', () => {
    const context: MovementContext = {
      obstacles: [{ x: 0, z: 2, width: 20, depth: 2 }],
      bounds: openField.bounds,
    };
    const start = createPlayer({ x: 0, z: 0.6 });
    const next = stepPlayer(start, press('forward', 'right'), 0, STEP, context);
    // Right is -X when the camera looks along +Z, so the player slides towards -X.
    expect(next.x).toBeLessThan(-0.1);
    expect(next.z).toBeCloseTo(0.6, 6);
  });

  it('stays inside the bounds', () => {
    const next = stepPlayer(
      createPlayer({ x: 49.5, z: 0 }),
      press('forward'),
      Math.PI / 2,
      STEP,
      openField,
    );
    expect(next.x).toBeCloseTo(50 - DEFAULT_PLAYER_CONFIG.radius, 6);
  });

  it('turns to face the direction of travel', () => {
    let player = createPlayer({ x: 0, z: 0 });
    for (let i = 0; i < 10; i += 1) {
      player = stepPlayer(player, press('forward'), Math.PI / 2, STEP, openField);
    }
    expect(player.heading).toBeCloseTo(Math.PI / 2, 5);
  });
});

describe('findSpawnPoint', () => {
  const district = generateDistrict(DEFAULT_DISTRICT_CONFIG);
  const context: MovementContext = { obstacles: district.buildings, bounds: district.bounds };

  it('spawns in the middle of the default district, on the road crossing', () => {
    const spawn = findSpawnPoint(context, DEFAULT_PLAYER_CONFIG.radius);
    expect(spawn.x).toBeCloseTo(0, 9);
    expect(spawn.z).toBeCloseTo(0, 9);
  });

  it('never spawns inside a building', () => {
    const spawn = findSpawnPoint(context, DEFAULT_PLAYER_CONFIG.radius);
    for (const building of district.buildings) {
      expect(circleIntersectsRect(spawn, DEFAULT_PLAYER_CONFIG.radius, building)).toBe(false);
    }
  });

  it('throws when there is no free space', () => {
    const blocked: MovementContext = {
      obstacles: [{ x: 0, z: 0, width: 100, depth: 100 }],
      bounds: { x: 0, z: 0, width: 100, depth: 100 },
    };
    expect(() => findSpawnPoint(blocked, DEFAULT_PLAYER_CONFIG.radius)).toThrow(
      'No free spawn point',
    );
  });
});
