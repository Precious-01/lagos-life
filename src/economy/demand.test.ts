import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ARRIVALS_PER_HOUR,
  HOURS_PER_DAY,
  MAX_PRICE_KOBO,
  arrivalProbability,
  priceDemandBp,
  randomUnit,
} from './demand';
import { money, naira } from './money';

describe('DEFAULT_ARRIVALS_PER_HOUR', () => {
  it('has one value for every hour, none negative', () => {
    expect(DEFAULT_ARRIVALS_PER_HOUR).toHaveLength(HOURS_PER_DAY);
    expect(DEFAULT_ARRIVALS_PER_HOUR.every((n) => n >= 0 && Number.isFinite(n))).toBe(true);
  });

  it('is quiet at night and busiest in the evening', () => {
    for (const hour of [0, 1, 2, 3, 4, 5, 22, 23]) {
      expect(DEFAULT_ARRIVALS_PER_HOUR[hour]).toBe(0);
    }
    expect(Math.max(...DEFAULT_ARRIVALS_PER_HOUR)).toBe(DEFAULT_ARRIVALS_PER_HOUR[17]);
  });

  it('brings about 44 customers in a day', () => {
    expect(DEFAULT_ARRIVALS_PER_HOUR.reduce((sum, n) => sum + n, 0)).toBe(44);
  });
});

describe('randomUnit', () => {
  it('is deterministic', () => {
    expect(randomUnit(1960, 400, 1)).toBe(randomUnit(1960, 400, 1));
  });

  it('changes with the seed, the minute and the salt', () => {
    const base = randomUnit(1960, 400, 1);
    expect(randomUnit(1961, 400, 1)).not.toBe(base);
    expect(randomUnit(1960, 401, 1)).not.toBe(base);
    expect(randomUnit(1960, 400, 2)).not.toBe(base);
  });

  it('stays in [0, 1) and averages about one half', () => {
    let sum = 0;
    let inRange = true;
    for (let minute = 0; minute < 5000; minute += 1) {
      const value = randomUnit(7, minute, 1);
      if (value < 0 || value >= 1) {
        inRange = false;
      }
      sum += value;
    }
    expect(inRange).toBe(true);
    expect(Math.abs(sum / 5000 - 0.5)).toBeLessThan(0.03);
  });
});

describe('priceDemandBp', () => {
  const reference = naira(50);

  it('is normal demand at the reference price', () => {
    expect(priceDemandBp(reference, reference)).toBe(10000);
  });

  it('rises for cheaper prices, up to a cap of 150%', () => {
    expect(priceDemandBp(naira(45), reference)).toBe(11500);
    expect(priceDemandBp(naira(25), reference)).toBe(15000);
    expect(priceDemandBp(naira(10), reference)).toBe(15000);
  });

  it('falls for dearer prices, down to zero', () => {
    expect(priceDemandBp(naira(75), reference)).toBe(2500);
    expect(priceDemandBp(naira(100), reference)).toBe(0);
    expect(priceDemandBp(naira(150), reference)).toBe(0);
  });

  it('never increases as the price rises', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let price = 100; price <= 20000; price += 100) {
      const demand = priceDemandBp(money(price), reference);
      expect(demand).toBeLessThanOrEqual(previous);
      previous = demand;
    }
  });

  it('rejects invalid prices', () => {
    expect(() => priceDemandBp(money(0), reference)).toThrow(RangeError);
    expect(() => priceDemandBp(money(-5), reference)).toThrow(RangeError);
    expect(() => priceDemandBp(money(MAX_PRICE_KOBO + 1), reference)).toThrow(RangeError);
    expect(() => priceDemandBp(reference, money(0))).toThrow(RangeError);
  });
});

describe('arrivalProbability', () => {
  const reference = naira(50);

  it('is the hourly rate divided by 60 at the reference price', () => {
    // 07:00 has 4 customers per hour.
    expect(arrivalProbability(DEFAULT_ARRIVALS_PER_HOUR, 7 * 60, reference, reference)).toBeCloseTo(
      4 / 60,
      12,
    );
  });

  it('is zero at night', () => {
    expect(arrivalProbability(DEFAULT_ARRIVALS_PER_HOUR, 2 * 60, reference, reference)).toBe(0);
  });

  it('is zero when the price is far too high', () => {
    expect(arrivalProbability(DEFAULT_ARRIVALS_PER_HOUR, 7 * 60, naira(150), reference)).toBe(0);
  });

  it('is higher for a cheaper price, and repeats every day', () => {
    const normal = arrivalProbability(DEFAULT_ARRIVALS_PER_HOUR, 7 * 60, reference, reference);
    const cheap = arrivalProbability(DEFAULT_ARRIVALS_PER_HOUR, 7 * 60, naira(30), reference);
    expect(cheap).toBeGreaterThan(normal);
    const nextDay = arrivalProbability(
      DEFAULT_ARRIVALS_PER_HOUR,
      1440 + 7 * 60,
      reference,
      reference,
    );
    expect(nextDay).toBe(normal);
  });

  it('never goes above 1', () => {
    const table = Array.from({ length: 24 }, () => 600);
    expect(arrivalProbability(table, 0, naira(10), naira(50))).toBe(1);
  });
});
