import { describe, expect, it } from 'vitest';
import { circleIntersectsRect } from './collision';
import { createInputState } from './input';
import {
  DEFAULT_PLAYER_CONFIG,
  createPlayer,
  stepPlayer,
  type MovementContext,
} from './player';
import { rectContains, rectsOverlap } from './rect';
import { FRONTAGE_Z, buildStreetLayout, buildingHeight } from './street';
import { analyzeWalkability, isPointReachable } from './walkability';

const street = buildStreetLayout();
const RADIUS = DEFAULT_PLAYER_CONFIG.radius;
const grid = analyzeWalkability(
  { obstacles: street.colliders, bounds: street.bounds, radius: RADIUS, cellSize: 0.5 },
  street.spawn,
);

describe('street layout data', () => {
  it('is deterministic', () => {
    expect(buildStreetLayout()).toEqual(street);
  });

  it('gives every building and prop a unique id', () => {
    const ids = [...street.buildings.map((b) => b.id), ...street.props.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a collider for every building and every prop', () => {
    expect(street.colliders).toHaveLength(street.buildings.length + street.props.length);
    const kinds = new Set(street.colliders.map((collider) => collider.kind));
    for (const kind of ['building', 'kiosk', 'fence', 'vehicle', 'prop'] as const) {
      expect(kinds.has(kind)).toBe(true);
    }
  });

  it('keeps each collider the same size as the object it represents', () => {
    const things = [...street.buildings, ...street.props];
    const problems: string[] = [];
    street.colliders.forEach((collider, index) => {
      const thing = things[index];
      if (
        collider.x !== thing.x ||
        collider.z !== thing.z ||
        collider.width !== thing.width ||
        collider.depth !== thing.depth ||
        collider.height !== thing.height
      ) {
        problems.push(thing.id);
      }
    });
    expect(problems).toEqual([]);
  });

  it('computes building heights from the number of floors', () => {
    const problems = street.buildings
      .filter((b) => Math.abs(b.height - buildingHeight(b.floors)) > 1e-9)
      .map((b) => b.id);
    expect(problems).toEqual([]);
    expect(buildingHeight(1)).toBeCloseTo(3.8, 9);
    expect(buildingHeight(3)).toBeCloseTo(10.2, 9);
  });

  it('puts every building front on the sidewalk edge, facing the road', () => {
    const problems: string[] = [];
    for (const building of street.buildings) {
      const frontZ =
        building.front === 'plusZ' ? building.z + building.depth / 2 : building.z - building.depth / 2;
      const expected = building.front === 'plusZ' ? -FRONTAGE_Z : FRONTAGE_Z;
      if (Math.abs(frontZ - expected) > 1e-9) {
        problems.push(building.id);
      }
    }
    expect(problems).toEqual([]);
  });

  it('keeps every building and prop inside the bounds', () => {
    const problems = [...street.buildings, ...street.props]
      .filter((thing) => !rectContains(street.bounds, thing))
      .map((thing) => thing.id);
    expect(problems).toEqual([]);
  });

  it('keeps buildings off the road and the sidewalks', () => {
    const { road, sidewalks } = street.surfaces;
    const problems: string[] = [];
    for (const building of street.buildings) {
      for (const surface of [road, ...sidewalks]) {
        if (rectsOverlap(building, surface)) {
          problems.push(building.id);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('never lets two colliders overlap', () => {
    const problems: string[] = [];
    const { colliders } = street;
    for (let i = 0; i < colliders.length; i += 1) {
      for (let j = i + 1; j < colliders.length; j += 1) {
        if (rectsOverlap(colliders[i], colliders[j])) {
          problems.push(`${i}:${j}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('parks the danfo on the road and every other prop on a sidewalk', () => {
    const { road, sidewalks } = street.surfaces;
    const problems: string[] = [];
    for (const prop of street.props) {
      if (prop.type === 'danfo') {
        if (!rectContains(road, prop)) {
          problems.push(prop.id);
        }
      } else if (!sidewalks.some((sidewalk) => rectContains(sidewalk, prop))) {
        problems.push(prop.id);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('street walkability', () => {
  it('spawns inside the bounds with a metre of clear space around the player', () => {
    expect(rectContains(street.bounds, { ...street.spawn, width: 0.1, depth: 0.1 })).toBe(true);
    const blocking = street.colliders.filter((collider) =>
      circleIntersectsRect(street.spawn, RADIUS + 1, collider),
    );
    expect(blocking).toEqual([]);
  });

  it('lets the player reach every part of the street from the spawn', () => {
    expect(grid.reachableCount).toBeGreaterThan(0);
    expect(grid.reachableCount / grid.walkableCount).toBeGreaterThanOrEqual(0.98);
  });

  it('can reach every named route point', () => {
    const unreachable = street.routes
      .filter((route) => !isPointReachable(grid, route.point))
      .map((route) => route.id);
    expect(unreachable).toEqual([]);
  });

  it('keeps every route point clear of solid objects', () => {
    const blocked = street.routes
      .filter((route) =>
        street.colliders.some((collider) => circleIntersectsRect(route.point, RADIUS, collider)),
      )
      .map((route) => route.id);
    expect(blocked).toEqual([]);
  });
});

describe('walking the street with the real player controller', () => {
  function walk(yaw: number) {
    const context: MovementContext = { obstacles: street.colliders, bounds: street.bounds };
    const input = createInputState();
    input.forward = true;
    let player = createPlayer(street.spawn, yaw);
    for (let i = 0; i < 400; i += 1) {
      player = stepPlayer(player, input, yaw, DEFAULT_PLAYER_CONFIG.maxStep, context);
    }
    return player;
  }

  it('walks the length of the road to the east end and stops at the boundary', () => {
    const player = walk(Math.PI / 2);
    expect(player.x).toBeCloseTo(street.bounds.width / 2 - RADIUS, 6);
    expect(player.z).toBeCloseTo(0, 6);
  });

  it('walks the length of the road to the west end and stops at the boundary', () => {
    const player = walk(-Math.PI / 2);
    expect(player.x).toBeCloseTo(-(street.bounds.width / 2 - RADIUS), 6);
    expect(player.z).toBeCloseTo(0, 6);
  });
});
