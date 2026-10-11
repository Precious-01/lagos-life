import { describe, expect, it } from 'vitest';
import { circleIntersectsRect, type Vec2 } from './collision';
import {
  INTERACT_REACH,
  SELLING_SPOT_AREA,
  buildStreetInteractions,
  distanceToRect,
  evaluateInteractions,
  isWithinReach,
  type InteractionPoint,
} from './interaction';
import { DEFAULT_PLAYER_CONFIG } from './player';
import { rectContains, rectsOverlap } from './rect';
import { DEFAULT_STREET_LAYOUT, buildStreetLayout } from './street';
import { analyzeWalkability, isPointReachable } from './walkability';
import type { Rect } from './types';

const street = DEFAULT_STREET_LAYOUT;
const RADIUS = DEFAULT_PLAYER_CONFIG.radius;
const points = buildStreetInteractions(street);
const grid = analyzeWalkability(
  { obstacles: street.colliders, bounds: street.bounds, radius: RADIUS, cellSize: 0.5 },
  street.spawn,
);

function pointByKind(kind: InteractionPoint['kind']): InteractionPoint {
  const found = points.find((point) => point.kind === kind);
  if (!found) {
    throw new Error(`no ${kind} point`);
  }
  return found;
}

/** The centres of every grid cell the player can actually reach from the spawn. */
function reachableCells(): Vec2[] {
  const cells: Vec2[] = [];
  for (let index = 0; index < grid.reachable.length; index += 1) {
    if (grid.reachable[index] === 1) {
      const column = index % grid.columns;
      const row = (index - column) / grid.columns;
      cells.push({
        x: grid.minX + (column + 0.5) * grid.cellSize,
        z: grid.minZ + (row + 0.5) * grid.cellSize,
      });
    }
  }
  return cells;
}

const cells = reachableCells();

describe('distanceToRect', () => {
  const rect: Rect = { x: 0, z: 0, width: 4, depth: 4 };

  it('is zero inside the rectangle and on its edge', () => {
    expect(distanceToRect({ x: 0, z: 0 }, rect)).toBe(0);
    expect(distanceToRect({ x: 1.5, z: -1 }, rect)).toBe(0);
    expect(distanceToRect({ x: 2, z: 0 }, rect)).toBe(0);
  });

  it('measures straight to the nearest edge', () => {
    expect(distanceToRect({ x: 5, z: 0 }, rect)).toBe(3);
    expect(distanceToRect({ x: 0, z: -6 }, rect)).toBe(4);
  });

  it('measures diagonally to the nearest corner', () => {
    expect(distanceToRect({ x: 5, z: 4 }, rect)).toBeCloseTo(Math.sqrt(13), 12);
  });
});

describe('buildStreetInteractions', () => {
  it('is deterministic', () => {
    expect(buildStreetInteractions(buildStreetLayout())).toEqual(points);
  });

  it('creates a supplier, a kiosk and a selling spot with unique ids', () => {
    expect(points.map((point) => point.kind).sort()).toEqual(['kiosk', 'selling-spot', 'supplier']);
    expect(new Set(points.map((point) => point.id)).size).toBe(points.length);
  });

  it('uses the south market stall as the supplier and the north kiosk as the kiosk', () => {
    const stall = street.props.find((prop) => prop.type === 'market-stall');
    const kiosk = street.props.find((prop) => prop.type === 'kiosk');
    expect(stall).toBeDefined();
    expect(kiosk).toBeDefined();
    if (!stall || !kiosk) {
      return;
    }
    expect(stall.z).toBeGreaterThan(0);
    expect(kiosk.z).toBeLessThan(0);
    expect(pointByKind('supplier').area).toEqual({
      x: stall.x,
      z: stall.z,
      width: stall.width,
      depth: stall.depth,
    });
    expect(pointByKind('kiosk').area).toEqual({
      x: kiosk.x,
      z: kiosk.z,
      width: kiosk.width,
      depth: kiosk.depth,
    });
  });

  it('activates the stall and kiosk by pressing a key, and the selling spot as a zone', () => {
    expect(pointByKind('supplier').activation).toBe('press');
    expect(pointByKind('kiosk').activation).toBe('press');
    expect(pointByKind('selling-spot').activation).toBe('zone');
    expect(pointByKind('selling-spot').reach).toBe(0);
  });

  it('puts each stand point on the road side of its object', () => {
    // The stall is on the south sidewalk (z > 0), so its stand point is nearer the road (smaller z).
    expect(pointByKind('supplier').standAt.z).toBeCloseTo(8.6, 9);
    expect(pointByKind('kiosk').standAt.z).toBeCloseTo(-8.6, 9);
  });

  it('throws when the street has no market stall or no kiosk', () => {
    const withoutStall = { ...street, props: street.props.filter((p) => p.type !== 'market-stall') };
    expect(() => buildStreetInteractions(withoutStall)).toThrow('market-stall');
    const withoutKiosk = { ...street, props: street.props.filter((p) => p.type !== 'kiosk') };
    expect(() => buildStreetInteractions(withoutKiosk)).toThrow('kiosk');
  });
});

describe('the interaction points work in the real street', () => {
  it('has a reachable, clear stand point for every point', () => {
    const problems: string[] = [];
    for (const point of points) {
      if (!isPointReachable(grid, point.standAt)) {
        problems.push(`${point.id}: stand point is not reachable`);
      }
      if (street.colliders.some((c) => circleIntersectsRect(point.standAt, RADIUS, c))) {
        problems.push(`${point.id}: stand point is blocked`);
      }
      if (!isWithinReach(point, point.standAt)) {
        problems.push(`${point.id}: stand point is out of its own reach`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('shows the right prompt at each press point stand position', () => {
    const atStall = evaluateInteractions(points, pointByKind('supplier').standAt);
    expect(atStall.prompt?.point.kind).toBe('supplier');
    expect(atStall.atSellingSpot).toBe(false);

    const atKiosk = evaluateInteractions(points, pointByKind('kiosk').standAt);
    expect(atKiosk.prompt?.point.kind).toBe('kiosk');
    expect(atKiosk.atSellingSpot).toBe(false);
  });

  it('has many reachable places to stand within reach of each press point', () => {
    for (const kind of ['supplier', 'kiosk'] as const) {
      const point = pointByKind(kind);
      const inReach = cells.filter((cell) => isWithinReach(point, cell));
      expect(inReach.length).toBeGreaterThan(10);
    }
  });

  it('puts the selling spot on the north sidewalk, clear of every solid object', () => {
    const northSidewalk = street.surfaces.sidewalks.find((sidewalk) => sidewalk.z < 0);
    expect(northSidewalk).toBeDefined();
    if (northSidewalk) {
      expect(rectContains(northSidewalk, SELLING_SPOT_AREA)).toBe(true);
    }
    const blocking = street.colliders.filter((collider) =>
      rectsOverlap(collider, SELLING_SPOT_AREA),
    );
    expect(blocking).toEqual([]);
  });

  it('can be reached, and every walkable cell in the selling spot is reachable', () => {
    expect(isPointReachable(grid, pointByKind('selling-spot').standAt)).toBe(true);
    const spot = pointByKind('selling-spot');
    const inside = cells.filter((cell) => isWithinReach(spot, cell));
    expect(inside.length).toBeGreaterThan(20);
    // Cells that fit the player inside the zone but were NOT reached would mean a trapped pocket.
    let unreachable = 0;
    for (let row = 0; row < grid.rows; row += 1) {
      for (let column = 0; column < grid.columns; column += 1) {
        const index = row * grid.columns + column;
        const centre = {
          x: grid.minX + (column + 0.5) * grid.cellSize,
          z: grid.minZ + (row + 0.5) * grid.cellSize,
        };
        if (grid.walkable[index] === 1 && grid.reachable[index] === 0 && isWithinReach(spot, centre)) {
          unreachable += 1;
        }
      }
    }
    expect(unreachable).toBe(0);
  });

  it('never puts a place inside the reach of two different press prompts and the selling spot', () => {
    const spot = pointByKind('selling-spot');
    const problems: string[] = [];
    for (const cell of cells) {
      if (!isWithinReach(spot, cell)) {
        continue;
      }
      const status = evaluateInteractions(points, cell);
      if (status.prompt !== null) {
        problems.push(`${cell.x},${cell.z}: prompt ${status.prompt.point.id} inside the selling spot`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('has no place where the supplier and the kiosk are both in reach', () => {
    const supplier = pointByKind('supplier');
    const kiosk = pointByKind('kiosk');
    const both = cells.filter((cell) => isWithinReach(supplier, cell) && isWithinReach(kiosk, cell));
    expect(both).toEqual([]);
  });

  it('shows no prompt and no zone at the spawn, or anywhere on the road', () => {
    const atSpawn = evaluateInteractions(points, street.spawn);
    expect(atSpawn.prompt).toBeNull();
    expect(atSpawn.zones).toEqual([]);

    const road = street.surfaces.road;
    const problems: string[] = [];
    for (const cell of cells) {
      if (Math.abs(cell.z - road.z) <= road.depth / 2 - RADIUS) {
        const status = evaluateInteractions(points, cell);
        if (status.prompt !== null || status.zones.length > 0) {
          problems.push(`${cell.x},${cell.z}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('shows no prompt beside the parked danfo', () => {
    expect(evaluateInteractions(points, { x: 12, z: 1.5 }).prompt).toBeNull();
    expect(evaluateInteractions(points, { x: 12, z: 9 }).prompt).toBeNull();
  });

  it('sets atSellingSpot only inside the zone', () => {
    expect(evaluateInteractions(points, { x: 2, z: -9.5 }).atSellingSpot).toBe(true);
    // Just outside, on the road side.
    expect(evaluateInteractions(points, { x: 2, z: -7.9 }).atSellingSpot).toBe(false);
    expect(evaluateInteractions(points, { x: 2, z: -7.9 }).zones).toEqual([]);
  });
});

describe('evaluateInteractions with synthetic points', () => {
  function pressPoint(id: string, x: number): InteractionPoint {
    return {
      id,
      kind: 'supplier',
      activation: 'press',
      label: id,
      action: 'Use',
      area: { x, z: 0, width: 1, depth: 1 },
      reach: INTERACT_REACH,
      standAt: { x, z: 2 },
    };
  }

  it('returns no prompt when nothing is in reach', () => {
    const status = evaluateInteractions([pressPoint('a', 0)], { x: 20, z: 0 });
    expect(status.prompt).toBeNull();
    expect(status.zones).toEqual([]);
    expect(status.atSellingSpot).toBe(false);
  });

  it('picks the nearest of several points in reach', () => {
    // Edges at x = 0.5 and x = 3.5; standing at 1.5 is 1.0 and 2.0 away.
    const status = evaluateInteractions([pressPoint('b', 4), pressPoint('a', 0)], { x: 1.5, z: 0 });
    expect(status.prompt?.point.id).toBe('a');
    expect(status.prompt?.distance).toBeCloseTo(1, 12);
  });

  it('breaks an exact tie by id, whatever the order of the list', () => {
    const list = [pressPoint('b', 4), pressPoint('a', 0)];
    const reversed = [...list].reverse();
    // Standing at x = 2 is 1.5 away from both edges.
    expect(evaluateInteractions(list, { x: 2, z: 0 }).prompt?.point.id).toBe('a');
    expect(evaluateInteractions(reversed, { x: 2, z: 0 }).prompt?.point.id).toBe('a');
  });

  it('treats the edge of reach as in reach and just beyond it as out', () => {
    // The edge is at x = 0.5, so x = 3.0 is exactly 2.5 away.
    expect(evaluateInteractions([pressPoint('a', 0)], { x: 3, z: 0 }).prompt).not.toBeNull();
    expect(evaluateInteractions([pressPoint('a', 0)], { x: 3.01, z: 0 }).prompt).toBeNull();
  });

  it('never makes a zone point the prompt', () => {
    const zone: InteractionPoint = {
      ...pressPoint('z', 0),
      kind: 'selling-spot',
      activation: 'zone',
      reach: 0,
    };
    const status = evaluateInteractions([zone], { x: 0, z: 0 });
    expect(status.prompt).toBeNull();
    expect(status.zones).toEqual([zone]);
    expect(status.atSellingSpot).toBe(true);
  });

  it('does not change the points it is given', () => {
    const list = [pressPoint('a', 0)];
    const snapshot = JSON.stringify(list);
    evaluateInteractions(list, { x: 1, z: 0 });
    expect(JSON.stringify(list)).toBe(snapshot);
  });
});
