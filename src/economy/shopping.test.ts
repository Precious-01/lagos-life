import { describe, expect, it } from 'vitest';
import { DEFAULT_HUSTLE_CONFIG, buyBags, createHustle, type HustleState } from './hustle';
import { naira } from './money';
import { maxBuyableBags, previewBuyBags } from './shopping';

const config = DEFAULT_HUSTLE_CONFIG;

function stateWith(capital: number, stock: number): HustleState {
  const base = createHustle({ ...config, startingCapital: naira(capital) });
  return { ...base, stock };
}

describe('previewBuyBags', () => {
  it('accepts an affordable purchase and reports the full cost', () => {
    const preview = previewBuyBags(createHustle(config), config, 1);
    expect(preview.ok).toBe(true);
    expect(preview.sachets).toBe(20);
    // 400 for the bag plus 100 for the trip.
    expect(preview.totalCost).toBe(naira(500));
    expect(preview.reason).toBeNull();
  });

  it('charges the trip once however many bags', () => {
    expect(previewBuyBags(createHustle(config), config, 3).totalCost).toBe(naira(1300));
  });

  it('refuses invalid quantities', () => {
    for (const bags of [0, -1, 1.5, Number.NaN]) {
      const preview = previewBuyBags(createHustle(config), config, bags);
      expect(preview.ok).toBe(false);
      expect(preview.reason).toBe('Invalid amount');
    }
  });

  it('refuses more than you can carry', () => {
    const preview = previewBuyBags(createHustle(config), config, 4);
    expect(preview.ok).toBe(false);
    expect(preview.reason).toBe('Too many to carry');
  });

  it('refuses what you cannot afford and says what it would cost', () => {
    const preview = previewBuyBags(stateWith(450, 0), config, 1);
    expect(preview.ok).toBe(false);
    expect(preview.reason).toBe('Needs ₦500');
    expect(preview.totalCost).toBe(naira(500));
  });

  it('accepts spending exactly everything', () => {
    expect(previewBuyBags(stateWith(500, 0), config, 1).ok).toBe(true);
  });

  it('does not change anything', () => {
    const state = createHustle(config);
    const snapshot = JSON.stringify(state);
    previewBuyBags(state, config, 2);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('maxBuyableBags', () => {
  it('is limited by capacity when you are rich', () => {
    expect(maxBuyableBags(stateWith(100000, 0), config)).toBe(3);
    expect(maxBuyableBags(stateWith(100000, 20), config)).toBe(2);
    expect(maxBuyableBags(stateWith(100000, 60), config)).toBe(0);
  });

  it('is limited by cash when you are poor', () => {
    // 2,000 naira: (2000 - 100) / 400 = 4.75, but capacity allows only 3.
    expect(maxBuyableBags(stateWith(2000, 0), config)).toBe(3);
    // 1,000 naira: (1000 - 100) / 400 = 2.25 -> 2 bags.
    expect(maxBuyableBags(stateWith(1000, 0), config)).toBe(2);
    expect(maxBuyableBags(stateWith(500, 0), config)).toBe(1);
  });

  it('is zero when even one bag and the trip cannot be paid', () => {
    expect(maxBuyableBags(stateWith(499, 0), config)).toBe(0);
    expect(maxBuyableBags(stateWith(0, 0), config)).toBe(0);
    expect(maxBuyableBags(stateWith(50, 0), config)).toBe(0);
  });
});

describe('preview and buyBags always agree', () => {
  it('for many cash and stock combinations', () => {
    const problems: string[] = [];
    for (const capital of [0, 99, 450, 499, 500, 899, 900, 1000, 1300, 2000, 100000]) {
      for (const stock of [0, 20, 40, 41, 60]) {
        const state = stateWith(capital, stock);
        for (const bags of [-1, 0, 1, 2, 3, 4]) {
          const preview = previewBuyBags(state, config, bags);
          const real = buyBags(state, config, bags, 360);
          if (preview.ok !== real.ok) {
            problems.push(`capital ${capital}, stock ${stock}, bags ${bags}`);
          }
        }
      }
    }
    expect(problems).toEqual([]);
  });

  it('maxBuyableBags is the largest purchase that is accepted', () => {
    const problems: string[] = [];
    for (const capital of [0, 450, 500, 900, 1000, 2000, 100000]) {
      for (const stock of [0, 20, 40, 60]) {
        const state = stateWith(capital, stock);
        const max = maxBuyableBags(state, config);
        if (max > 0 && !previewBuyBags(state, config, max).ok) {
          problems.push(`capital ${capital}, stock ${stock}: ${max} is not accepted`);
        }
        if (previewBuyBags(state, config, max + 1).ok) {
          problems.push(`capital ${capital}, stock ${stock}: ${max + 1} is accepted`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
