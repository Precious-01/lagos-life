/**
 * Fictional in-game money. NOT real currency: nothing here connects to real payments.
 *
 * Units: money is a WHOLE NUMBER OF KOBO (100 kobo = 1 naira), stored as a plain JavaScript number.
 * There are no floats, no decimals and no BigInt, so values serialise to JSON as ordinary numbers.
 *
 * Limits: a Money value is a signed integer with an absolute value of at most MAX_MONEY_KOBO
 * (1 trillion naira = 1e14 kobo). The largest safe integer is about 9e15, so the sum of two Money
 * values (at most 2e14) is always exact. Every operation checks its result and throws a
 * RangeError instead of silently returning a wrong number.
 */

declare const MONEY_BRAND: unique symbol;

/** A whole number of kobo within the allowed limits. Create one only with the functions below. */
export type Money = number & { readonly [MONEY_BRAND]: 'kobo' };

export const KOBO_PER_NAIRA = 100;
/** 1 trillion naira, in kobo. */
export const MAX_MONEY_KOBO = 100_000_000_000_000;
/** Percentages are whole basis points: 10,000 = 100%. At most 1,000%. */
export const BASIS_POINTS_PER_UNIT = 10_000;
export const MAX_BASIS_POINTS = 100_000;

export type Rounding = 'down' | 'nearest' | 'up';

/** Creates Money from a whole number of kobo. Throws RangeError for anything else. */
export function money(kobo: number): Money {
  if (!Number.isSafeInteger(kobo)) {
    throw new RangeError(`Money must be a whole number of kobo, got ${kobo}`);
  }
  if (Math.abs(kobo) > MAX_MONEY_KOBO) {
    throw new RangeError(`Money is limited to +/-${MAX_MONEY_KOBO} kobo, got ${kobo}`);
  }
  // Adding 0 turns -0 into 0.
  return (kobo + 0) as Money;
}

export const ZERO_MONEY: Money = money(0);

/** Creates Money from WHOLE naira. For example naira(2000) is 200,000 kobo. */
export function naira(wholeNaira: number): Money {
  if (!Number.isSafeInteger(wholeNaira)) {
    throw new RangeError(`naira() needs a whole number of naira, got ${wholeNaira}`);
  }
  return money(wholeNaira * KOBO_PER_NAIRA);
}

/** True when the value is a valid Money (a safe integer inside the limits). */
export function isMoney(value: unknown): value is Money {
  return (
    typeof value === 'number' && Number.isSafeInteger(value) && Math.abs(value) <= MAX_MONEY_KOBO
  );
}

/** Validates untrusted data, such as a loaded save file. Throws RangeError when it is not Money. */
export function parseMoney(value: unknown): Money {
  if (!isMoney(value)) {
    throw new RangeError('Value is not a valid money amount (a whole number of kobo)');
  }
  return value;
}

export function addMoney(a: Money, b: Money): Money {
  return money(a + b);
}

export function subtractMoney(a: Money, b: Money): Money {
  return money(a - b);
}

export function negateMoney(a: Money): Money {
  return money(-a);
}

/** Multiplies by a whole-number factor, for example 4 bags at a price each. */
export function multiplyMoney(a: Money, factor: number): Money {
  if (!Number.isSafeInteger(factor)) {
    throw new RangeError(`multiplyMoney needs a whole-number factor, got ${factor}`);
  }
  const product = a * factor;
  // A product beyond 2^53 is never reported as a safe integer, so this also catches lost precision.
  if (!Number.isSafeInteger(product)) {
    throw new RangeError('Money multiplication overflowed');
  }
  return money(product);
}

/**
 * Takes a percentage of an amount, using whole basis points (1200 = 12%).
 * Rounding applies to the MAGNITUDE, so results are symmetric around zero:
 *   'down' = towards zero, 'up' = away from zero, 'nearest' = halves round away from zero.
 * All steps are exact integer maths, even for amounts near the limit.
 */
export function applyBasisPoints(
  amount: Money,
  basisPoints: number,
  rounding: Rounding = 'nearest',
): Money {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > MAX_BASIS_POINTS) {
    throw new RangeError(`basisPoints must be a whole number from 0 to ${MAX_BASIS_POINTS}`);
  }
  const sign = amount < 0 ? -1 : 1;
  const magnitude = Math.abs(amount);

  // magnitude = whole * 10,000 + remainder, so magnitude * bp / 10,000 = whole * bp + remainder * bp / 10,000.
  const remainder = magnitude % BASIS_POINTS_PER_UNIT;
  const whole = (magnitude - remainder) / BASIS_POINTS_PER_UNIT;
  const scaled = remainder * basisPoints;
  const fractionRemainder = scaled % BASIS_POINTS_PER_UNIT;
  const fractionWhole = (scaled - fractionRemainder) / BASIS_POINTS_PER_UNIT;

  let result = whole * basisPoints + fractionWhole;
  if (rounding === 'up' && fractionRemainder > 0) {
    result += 1;
  } else if (rounding === 'nearest' && fractionRemainder * 2 >= BASIS_POINTS_PER_UNIT) {
    result += 1;
  }
  return money(sign * result);
}

/** -1 when a < b, 0 when equal, 1 when a > b. */
export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

export interface FormatOptions {
  /** 'auto' shows kobo only when they are not zero. 'always' always shows two decimals. */
  kobo?: 'auto' | 'always';
}

/** Formats as naira with thousands separators, for example "₦2,000" or "-₦1,250.50". */
export function formatNaira(amount: Money, options: FormatOptions = {}): string {
  const magnitude = Math.abs(amount);
  const koboPart = magnitude % KOBO_PER_NAIRA;
  const nairaPart = (magnitude - koboPart) / KOBO_PER_NAIRA;
  const grouped = String(nairaPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const showKobo = options.kobo === 'always' || koboPart !== 0;
  const decimals = showKobo ? `.${String(koboPart).padStart(2, '0')}` : '';
  return `${amount < 0 ? '-' : ''}₦${grouped}${decimals}`;
}
