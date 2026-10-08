import type { Rect } from './types';

const EPSILON = 1e-9;

/** True when the interiors of the two rectangles intersect. Merely touching edges is NOT overlap. */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 - EPSILON &&
    Math.abs(a.z - b.z) < (a.depth + b.depth) / 2 - EPSILON
  );
}

/** True when `inner` lies completely inside `outer` (touching edges allowed). */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    Math.abs(inner.x - outer.x) + inner.width / 2 <= outer.width / 2 + EPSILON &&
    Math.abs(inner.z - outer.z) + inner.depth / 2 <= outer.depth / 2 + EPSILON
  );
}
