import { describe, expect, it } from 'vitest';
import { createRng } from '../game/rng';
import {
  MAX_MONEY_KOBO,
  ZERO_MONEY,
  addMoney,
  applyBasisPoints,
  compareMoney,
  formatNaira,
  isMoney,
  money,
  multiplyMoney,
  naira,
  negateMoney,
  parseMoney,
  subtractMoney,
} from './money';

describe('money', () => {
  it('accepts whole numbers of kobo within the limits', () => {
    expect(money(0)).toBe(0);
    expect(money(250)).toBe(250);
    expect(money(-250)).toBe(-250);
    expect(money(MAX_MONEY_KOBO)).toBe(MAX_MONEY_KOBO);
    expect(money(-MAX_MONEY_KOBO)).toBe(-MAX_MONEY_KOBO);
  });

  it('rejects fractions, NaN, infinities and unsafe integers', () => {
    expect(() => money(1.5)).toThrow(RangeError);
    expect(() => money(Number.NaN)).toThrow(RangeError);
    expect(() => money(Number.POSITIVE_INFINITY)).toThrow(RangeError);
    expect(() => money(2 ** 53)).toThrow(RangeError);
  });

  it('rejects values beyond the limit', () => {
    expect(() => money(MAX_MONEY_KOBO + 1)).toThrow(RangeError);
    expect(() => money(-MAX_MONEY_KOBO - 1)).toThrow(RangeError);
  });

  it('never returns negative zero', () => {
    expect(Object.is(money(-0), 0)).toBe(true);
    expect(Object.is(negateMoney(ZERO_MONEY), 0)).toBe(true);
  });

  it('exposes a zero constant', () => {
    expect(ZERO_MONEY).toBe(0);
  });
});

describe('naira', () => {
  it('converts whole naira to kobo', () => {
    expect(naira(2000)).toBe(200000);
    expect(naira(0)).toBe(0);
    expect(naira(-5)).toBe(-500);
  });

  it('rejects fractional naira and amounts beyond the limit', () => {
    expect(() => naira(1.5)).toThrow(RangeError);
    expect(() => naira(1_000_000_000_001)).toThrow(RangeError);
    expect(naira(1_000_000_000_000)).toBe(MAX_MONEY_KOBO);
  });
});

describe('isMoney and parseMoney', () => {
  it('recognise valid money only', () => {
    expect(isMoney(500)).toBe(true);
    expect(isMoney(-500)).toBe(true);
    expect(isMoney(1.5)).toBe(false);
    expect(isMoney('500')).toBe(false);
    expect(isMoney(null)).toBe(false);
    expect(isMoney(Number.NaN)).toBe(false);
    expect(isMoney(MAX_MONEY_KOBO + 1)).toBe(false);
  });

  it('parseMoney returns valid values and throws for everything else', () => {
    expect(parseMoney(200000)).toBe(200000);
    expect(() => parseMoney('200000')).toThrow(RangeError);
    expect(() => parseMoney(1.5)).toThrow(RangeError);
    expect(() => parseMoney(undefined)).toThrow(RangeError);
  });
});

describe('addMoney, subtractMoney, negateMoney', () => {
  it('add and subtract exactly', () => {
    expect(addMoney(naira(1), naira(2))).toBe(300);
    expect(subtractMoney(naira(5), naira(2))).toBe(300);
    expect(subtractMoney(naira(1), naira(2))).toBe(-100);
    expect(negateMoney(money(75))).toBe(-75);
  });

  it('throw instead of passing the limit', () => {
    expect(() => addMoney(money(MAX_MONEY_KOBO), money(1))).toThrow(RangeError);
    expect(() => addMoney(money(-MAX_MONEY_KOBO), money(-1))).toThrow(RangeError);
    expect(() => subtractMoney(money(MAX_MONEY_KOBO), money(-1))).toThrow(RangeError);
  });
});

describe('multiplyMoney', () => {
  it('multiplies by whole factors', () => {
    expect(multiplyMoney(money(250), 4)).toBe(1000);
    expect(multiplyMoney(money(250), 0)).toBe(0);
    expect(multiplyMoney(money(250), -2)).toBe(-500);
  });

  it('rejects fractional factors', () => {
    expect(() => multiplyMoney(money(250), 1.5)).toThrow(RangeError);
    expect(() => multiplyMoney(money(250), Number.NaN)).toThrow(RangeError);
  });

  it('rejects products beyond the limit or beyond exact precision', () => {
    expect(() => multiplyMoney(money(MAX_MONEY_KOBO), 2)).toThrow(RangeError);
    expect(() => multiplyMoney(money(MAX_MONEY_KOBO), 1_000_000)).toThrow(RangeError);
  });

  it('never returns negative zero', () => {
    expect(Object.is(multiplyMoney(money(5), 0), 0)).toBe(true);
    expect(Object.is(multiplyMoney(money(-5), 0), 0)).toBe(true);
  });
});

describe('applyBasisPoints', () => {
  it('computes 12% of 20,000 naira exactly', () => {
    expect(applyBasisPoints(naira(20000), 1200)).toBe(naira(2400));
  });

  it('handles 0% and 100%', () => {
    expect(applyBasisPoints(naira(500), 0)).toBe(0);
    expect(applyBasisPoints(naira(500), 10000)).toBe(naira(500));
  });

  it('rounds half a kobo according to the chosen mode', () => {
    expect(applyBasisPoints(money(1), 5000, 'down')).toBe(0);
    expect(applyBasisPoints(money(1), 5000, 'nearest')).toBe(1);
    expect(applyBasisPoints(money(1), 5000, 'up')).toBe(1);
    expect(applyBasisPoints(money(3), 5000, 'down')).toBe(1);
    expect(applyBasisPoints(money(3), 5000, 'nearest')).toBe(2);
    expect(applyBasisPoints(money(3), 5000, 'up')).toBe(2);
    expect(applyBasisPoints(money(1), 4999, 'nearest')).toBe(0);
    expect(applyBasisPoints(money(1), 4999, 'up')).toBe(1);
  });

  it('rounds negative amounts symmetrically', () => {
    expect(applyBasisPoints(money(-3), 5000, 'down')).toBe(-1);
    expect(applyBasisPoints(money(-3), 5000, 'nearest')).toBe(-2);
    expect(applyBasisPoints(money(-3), 5000, 'up')).toBe(-2);
    expect(Object.is(applyBasisPoints(money(-5), 0), 0)).toBe(true);
  });

  it('works at the limit', () => {
    expect(applyBasisPoints(money(MAX_MONEY_KOBO), 10000)).toBe(MAX_MONEY_KOBO);
    expect(() => applyBasisPoints(money(MAX_MONEY_KOBO), 20000)).toThrow(RangeError);
  });

  it('rejects invalid basis points', () => {
    expect(() => applyBasisPoints(money(100), 1.5)).toThrow(RangeError);
    expect(() => applyBasisPoints(money(100), -1)).toThrow(RangeError);
    expect(() => applyBasisPoints(money(100), 100_001)).toThrow(RangeError);
  });

  it('matches exact BigInt arithmetic, and throws exactly when the result passes the limit', () => {
    const rng = createRng(7);
    const limit = BigInt(MAX_MONEY_KOBO);
    const problems: string[] = [];
    let matched = 0;
    let threw = 0;

    for (let i = 0; i < 2000; i += 1) {
      const amount = Math.floor(rng() * MAX_MONEY_KOBO);
      const basisPoints = Math.floor(rng() * 20000);
      const product = BigInt(amount) * BigInt(basisPoints);
      const expected = {
        down: product / 10000n,
        nearest: (product + 5000n) / 10000n,
        up: (product + 9999n) / 10000n,
      };

      for (const mode of ['down', 'nearest', 'up'] as const) {
        const want = expected[mode];
        const label = `${amount} @ ${basisPoints} ${mode}`;
        if (want > limit) {
          // The exact answer is beyond the money limit, so a RangeError is the correct result.
          try {
            applyBasisPoints(money(amount), basisPoints, mode);
            problems.push(`${label}: should have thrown`);
          } catch (error) {
            if (error instanceof RangeError) {
              threw += 1;
            } else {
              problems.push(`${label}: threw something other than a RangeError`);
            }
          }
        } else {
          const actual = applyBasisPoints(money(amount), basisPoints, mode);
          if (actual === Number(want)) {
            matched += 1;
          } else {
            problems.push(`${label}: ${actual} vs ${want}`);
          }
        }
      }
    }

    expect(problems).toEqual([]);
    // Both outcomes must really be exercised, or the test proves nothing.
    expect(matched).toBeGreaterThan(100);
    expect(threw).toBeGreaterThan(100);
  });
});

describe('compareMoney', () => {
  it('orders amounts', () => {
    expect(compareMoney(money(1), money(2))).toBe(-1);
    expect(compareMoney(money(2), money(1))).toBe(1);
    expect(compareMoney(money(2), money(2))).toBe(0);
  });
});

describe('formatNaira', () => {
  it('shows whole naira without decimals by default', () => {
    expect(formatNaira(naira(2000))).toBe('₦2,000');
    expect(formatNaira(naira(0))).toBe('₦0');
    expect(formatNaira(naira(1000000))).toBe('₦1,000,000');
  });

  it('shows kobo when they are not zero', () => {
    expect(formatNaira(money(200050))).toBe('₦2,000.50');
    expect(formatNaira(money(5))).toBe('₦0.05');
  });

  it('can always show two decimals', () => {
    expect(formatNaira(naira(2000), { kobo: 'always' })).toBe('₦2,000.00');
  });

  it('formats negatives and the largest amount', () => {
    expect(formatNaira(money(-150000))).toBe('-₦1,500');
    expect(formatNaira(money(-1))).toBe('-₦0.01');
    expect(formatNaira(money(MAX_MONEY_KOBO))).toBe('₦1,000,000,000,000');
  });
});
