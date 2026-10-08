/** A function returning a float in [0, 1). */
export type Rng = () => number;

/**
 * Small deterministic pseudo-random generator (mulberry32).
 * The same seed always produces the same sequence.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Float in [min, max). */
export function randomInRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function pickOne<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new RangeError('pickOne requires a non-empty array');
  }
  return items[Math.floor(rng() * items.length)];
}
