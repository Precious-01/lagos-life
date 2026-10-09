import { circleIntersectsRect, type Vec2 } from './collision';
import type { Rect } from './types';

export interface WalkabilityConfig {
  obstacles: readonly Rect[];
  bounds: Rect;
  /** The player's collision radius. A cell is walkable only if a circle this big fits there. */
  radius: number;
  /** Side of each grid cell in metres. Smaller is more accurate and slower. */
  cellSize: number;
}

export interface WalkabilityGrid {
  minX: number;
  minZ: number;
  cellSize: number;
  columns: number;
  rows: number;
  /** 1 where the player's circle fits, 0 elsewhere. Index = row * columns + column. */
  walkable: Uint8Array;
  /** 1 where the cell is walkable AND connected to the start point. */
  reachable: Uint8Array;
  walkableCount: number;
  reachableCount: number;
}

/** The index of the cell containing a point, or null when the point is outside the grid. */
export function cellIndexAt(
  grid: Pick<WalkabilityGrid, 'minX' | 'minZ' | 'cellSize' | 'columns' | 'rows'>,
  point: Vec2,
): number | null {
  const column = Math.floor((point.x - grid.minX) / grid.cellSize);
  const row = Math.floor((point.z - grid.minZ) / grid.cellSize);
  if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) {
    return null;
  }
  return row * grid.columns + column;
}

/** True when the cell containing the point is walkable and connected to the start. */
export function isPointReachable(grid: WalkabilityGrid, point: Vec2): boolean {
  const index = cellIndexAt(grid, point);
  return index !== null && grid.reachable[index] === 1;
}

/**
 * Checks where the player can actually go.
 * Marks every grid cell where a circle of the player's radius fits inside the bounds and clear of
 * every obstacle, then flood-fills (4-connected) from `start`.
 *
 * It is deliberately a little conservative: a gap only counts as passable if it is at least
 * about `2 * radius + cellSize` wide. If a route fails here it may be too tight to be pleasant.
 */
export function analyzeWalkability(config: WalkabilityConfig, start: Vec2): WalkabilityGrid {
  const { obstacles, bounds, radius, cellSize } = config;
  if (cellSize <= 0) {
    throw new RangeError('cellSize must be greater than 0');
  }

  const columns = Math.ceil(bounds.width / cellSize);
  const rows = Math.ceil(bounds.depth / cellSize);
  const minX = bounds.x - bounds.width / 2;
  const minZ = bounds.z - bounds.depth / 2;
  const walkable = new Uint8Array(columns * rows);
  const reachable = new Uint8Array(columns * rows);
  const halfWidth = bounds.width / 2 - radius + 1e-9;
  const halfDepth = bounds.depth / 2 - radius + 1e-9;

  let walkableCount = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const centre = { x: minX + (column + 0.5) * cellSize, z: minZ + (row + 0.5) * cellSize };
      const insideBounds =
        Math.abs(centre.x - bounds.x) <= halfWidth && Math.abs(centre.z - bounds.z) <= halfDepth;
      if (!insideBounds) {
        continue;
      }
      if (obstacles.some((obstacle) => circleIntersectsRect(centre, radius, obstacle))) {
        continue;
      }
      walkable[row * columns + column] = 1;
      walkableCount += 1;
    }
  }

  const grid: WalkabilityGrid = {
    minX,
    minZ,
    cellSize,
    columns,
    rows,
    walkable,
    reachable,
    walkableCount,
    reachableCount: 0,
  };

  const startIndex = cellIndexAt(grid, start);
  if (startIndex === null || walkable[startIndex] !== 1) {
    return grid;
  }

  const queue = new Int32Array(columns * rows);
  let head = 0;
  let tail = 0;
  reachable[startIndex] = 1;
  queue[tail] = startIndex;
  tail += 1;

  const visit = (index: number): void => {
    if (walkable[index] === 1 && reachable[index] === 0) {
      reachable[index] = 1;
      queue[tail] = index;
      tail += 1;
    }
  };

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const column = index % columns;
    const row = (index - column) / columns;
    if (column > 0) {
      visit(index - 1);
    }
    if (column < columns - 1) {
      visit(index + 1);
    }
    if (row > 0) {
      visit(index - columns);
    }
    if (row < rows - 1) {
      visit(index + columns);
    }
  }

  grid.reachableCount = tail;
  return grid;
}
