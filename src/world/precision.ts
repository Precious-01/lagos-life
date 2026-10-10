/**
 * The gap between neighbouring 32-bit floats at a given distance from the origin, in metres.
 * GPUs and three.js store positions as 32-bit floats, so this is the smallest position change that
 * can be represented there. Returns 0 for a distance of 0.
 */
export function float32Spacing(distance: number): number {
  const magnitude = Math.abs(distance);
  if (magnitude === 0 || !Number.isFinite(magnitude)) {
    return 0;
  }
  return 2 ** (Math.floor(Math.log2(magnitude)) - 23);
}
