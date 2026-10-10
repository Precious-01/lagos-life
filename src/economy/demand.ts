import { createRng } from '../game/rng';
import { HOURS_PER_DAY, MINUTES_PER_HOUR, hourOfDay } from './clock';
import type { Money } from './money';

/**
 * Customers arriving per game hour at a street-hustler spot, at the reference price.
 * Index = hour of the day (0 to 23). Morning and evening peaks; nothing in the small hours.
 * PROVISIONAL: these numbers are for the first prototype and will be tuned by simulation.
 */
export const DEFAULT_ARRIVALS_PER_HOUR: readonly number[] = [
  0, 0, 0, 0, 0, 0, 2, 4, 4, 3, 2, 2, 3, 3, 2, 3, 4, 5, 4, 2, 1, 0, 0, 0,
];

export { HOURS_PER_DAY };

/** Demand at the reference price, in basis points (10,000 = normal demand). */
export const DEMAND_BASE_BP = 10_000;
/** Cheap prices cannot raise demand above 150%. */
export const MAX_DEMAND_BP = 15_000;
/** How strongly demand reacts to price: 15,000 means a 10% price change moves demand by 15%. */
export const PRICE_ELASTICITY_BP = 15_000;
/** Prices are limited so the integer maths below stays exact. 100,000 naira. */
export const MAX_PRICE_KOBO = 10_000_000;

const SALT_PRIME_A = 0x9e3779b1;
const SALT_PRIME_B = 0x85ebca6b;

/**
 * A random number in [0, 1) that depends ONLY on the seed, the game minute and a salt.
 * The same inputs always give the same number, however often or in what order it is asked for,
 * so replaying a minute can never change what happened in it.
 * Use a different `salt` for each separate decision in the same minute.
 */
export function randomUnit(seed: number, minute: number, salt: number): number {
  const mixed =
    ((seed | 0) ^ Math.imul(minute | 0, SALT_PRIME_A) ^ Math.imul(salt | 0, SALT_PRIME_B)) >>> 0;
  const rng = createRng(mixed);
  // The first output of nearby seeds can be correlated, so skip it.
  rng();
  return rng();
}

/**
 * How demand reacts to price, in basis points. The reference price gives 10,000. A cheaper price
 * raises demand (to at most 15,000); a dearer one lowers it, down to 0 at about 1.67 times the
 * reference. Exact integer arithmetic.
 */
export function priceDemandBp(price: Money, reference: Money): number {
  if (price <= 0 || reference <= 0 || price > MAX_PRICE_KOBO || reference > MAX_PRICE_KOBO) {
    throw new RangeError('Prices must be between 1 kobo and the price limit');
  }
  const change = Math.trunc(((reference - price) * PRICE_ELASTICITY_BP) / reference);
  return Math.min(MAX_DEMAND_BP, Math.max(0, DEMAND_BASE_BP + change));
}

/** The chance (0 to 1) that a customer arrives during this game minute. */
export function arrivalProbability(
  arrivalsPerHour: readonly number[],
  minute: number,
  price: Money,
  reference: Money,
): number {
  const perHour = arrivalsPerHour[hourOfDay(minute)];
  const chance = (perHour / MINUTES_PER_HOUR) * (priceDemandBp(price, reference) / DEMAND_BASE_BP);
  return Math.min(1, Math.max(0, chance));
}
