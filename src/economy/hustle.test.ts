import { describe, expect, it } from 'vitest';
import { reconcileLedger } from './ledger';
import { DEFAULT_START_MINUTE } from './clock';
import {
  DEFAULT_HUSTLE_CONFIG,
  buyBags,
  createHustle,
  setSellPrice,
  stepHustleMinute,
  summarizeDay,
  validateHustleConfig,
  type HustleConfig,
  type HustleState,
} from './hustle';
import { money, naira } from './money';

/** A customer arrives EVERY minute and buys exactly one sachet, so results are predictable. */
const ALWAYS: HustleConfig = {
  ...DEFAULT_HUSTLE_CONFIG,
  arrivalsPerHour: Array.from({ length: 24 }, () => 60),
  maxPerCustomer: 1,
  maxStock: 100,
};

const START = DEFAULT_START_MINUTE;

function mustBuy(state: HustleState, config: HustleConfig, bags: number, minute: number) {
  const result = buyBags(state, config, bags, minute);
  if (!result.ok) {
    throw new Error(`buy failed: ${result.message}`);
  }
  return result.state;
}

describe('validateHustleConfig', () => {
  it('accepts the default configuration', () => {
    expect(validateHustleConfig(DEFAULT_HUSTLE_CONFIG)).toEqual([]);
  });

  it('lists the problems with a broken configuration', () => {
    const problems = validateHustleConfig({
      ...DEFAULT_HUSTLE_CONFIG,
      bagSize: 0,
      maxStock: 5,
      arrivalsPerHour: [1, 2, 3],
      minPrice: naira(80),
    });
    expect(problems.length).toBeGreaterThanOrEqual(3);
  });

  it('is enforced by createHustle', () => {
    expect(() => createHustle({ ...DEFAULT_HUSTLE_CONFIG, bagSize: 0 })).toThrow(
      'Invalid hustle config',
    );
    expect(() => createHustle(DEFAULT_HUSTLE_CONFIG, -1)).toThrow(RangeError);
  });
});

describe('createHustle', () => {
  it('starts with 2,000 naira, no stock and the reference price', () => {
    const state = createHustle(DEFAULT_HUSTLE_CONFIG);
    expect(state.ledger.balance).toBe(naira(2000));
    expect(state.stock).toBe(0);
    expect(state.sellPrice).toBe(naira(50));
    expect(state.lastMinute).toBe(START);
    expect(state.totalSold).toBe(0);
    expect(state.totalMissed).toBe(0);
  });
});

describe('buyBags', () => {
  const config = DEFAULT_HUSTLE_CONFIG;

  it('buys stock and a supplier trip, as two ledger entries', () => {
    const state = mustBuy(createHustle(config), config, 1, START);
    expect(state.stock).toBe(20);
    expect(state.ledger.balance).toBe(naira(1500));
    expect(state.ledger.entries.map((e) => e.id)).toEqual(['opening-balance', 'buy:1', 'trip:1']);
    expect(state.ledger.entries[1].reason).toBe('stock-purchase');
    expect(state.ledger.entries[2].reason).toBe('operating-expense');
    expect(reconcileLedger(state.ledger)).toEqual([]);
  });

  it('charges the trip once however many bags are bought', () => {
    const state = mustBuy(createHustle(config), config, 3, START);
    expect(state.stock).toBe(60);
    expect(state.ledger.balance).toBe(naira(2000 - 1200 - 100));
  });

  it('allows two purchases in the same minute', () => {
    let state = createHustle(config);
    state = mustBuy(state, config, 1, START);
    state = mustBuy(state, config, 1, START);
    expect(state.stock).toBe(40);
    expect(state.ledger.balance).toBe(naira(1000));
    expect(state.ledger.entries.map((e) => e.id)).toContain('buy:2');
  });

  it('refuses invalid quantities', () => {
    const state = createHustle(config);
    for (const bags of [0, -1, 1.5, Number.NaN]) {
      const result = buyBags(state, config, bags, START);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(state);
      if (!result.ok) {
        expect(result.error).toBe('invalid-quantity');
      }
    }
  });

  it('refuses more than you can carry', () => {
    const full = mustBuy(createHustle(config), config, 3, START);
    const result = buyBags(full, config, 1, START);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('over-capacity');
      expect(result.state).toBe(full);
    }
  });

  it('refuses when you cannot afford the stock plus the trip, and charges nothing', () => {
    const poor = createHustle({ ...config, startingCapital: naira(450) });
    const result = buyBags(poor, config, 1, START);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('insufficient-funds');
      expect(result.state).toBe(poor);
    }
    expect(poor.ledger.balance).toBe(naira(450));
  });

  it('lets you spend exactly everything', () => {
    const exact = createHustle({ ...config, startingCapital: naira(500) });
    const state = mustBuy(exact, config, 1, START);
    expect(state.ledger.balance).toBe(0);
  });

  it('skips the trip entry when the trip is free', () => {
    const free = { ...config, tripCost: money(0) };
    const state = mustBuy(createHustle(free), free, 1, START);
    expect(state.ledger.entries).toHaveLength(2);
  });

  it('does not modify the state it was given', () => {
    const state = createHustle(config);
    const snapshot = JSON.stringify(state);
    buyBags(state, config, 1, START);
    expect(JSON.stringify(state)).toBe(snapshot);
  });
});

describe('setSellPrice', () => {
  const config = DEFAULT_HUSTLE_CONFIG;

  it('changes the price within the allowed range', () => {
    const result = setSellPrice(createHustle(config), config, naira(60));
    expect(result.ok).toBe(true);
    expect(result.state.sellPrice).toBe(naira(60));
  });

  it('refuses prices outside the range', () => {
    const state = createHustle(config);
    for (const price of [naira(9), naira(151), money(0)]) {
      const result = setSellPrice(state, config, price);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(state);
    }
  });
});

describe('stepHustleMinute', () => {
  it('sells one sachet per customer and records each sale in the ledger', () => {
    let state = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    state = stepHustleMinute(state, ALWAYS, START + 1, true);
    expect(state.stock).toBe(19);
    expect(state.totalSold).toBe(1);
    expect(state.ledger.balance).toBe(naira(1500 + 50));
    expect(state.ledger.entries[state.ledger.entries.length - 1].id).toBe(`sale:${START + 1}`);
  });

  it('counts customers missed after the stock runs out', () => {
    let state = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    for (let minute = START + 1; minute <= START + 25; minute += 1) {
      state = stepHustleMinute(state, ALWAYS, minute, true);
    }
    expect(state.stock).toBe(0);
    expect(state.totalSold).toBe(20);
    expect(state.totalMissed).toBe(5);
    expect(state.ledger.balance).toBe(naira(1500 + 20 * 50));
    expect(state.ledger.entries).toHaveLength(3 + 20);
    expect(reconcileLedger(state.ledger)).toEqual([]);
  });

  it('sells nothing when the hustler is not selling', () => {
    const start = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    const next = stepHustleMinute(start, ALWAYS, START + 1, false);
    expect(next.stock).toBe(20);
    expect(next.totalSold).toBe(0);
    expect(next.totalMissed).toBe(0);
    expect(next.lastMinute).toBe(START + 1);
  });

  it('is idempotent: repeating or replaying a minute changes nothing', () => {
    let state = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    state = stepHustleMinute(state, ALWAYS, START + 1, true);
    expect(stepHustleMinute(state, ALWAYS, START + 1, true)).toBe(state);
    expect(stepHustleMinute(state, ALWAYS, START, true)).toBe(state);
    expect(state.totalSold).toBe(1);
  });

  it('sells nothing when the price is too high for anyone', () => {
    let state = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    const priced = setSellPrice(state, ALWAYS, naira(100));
    state = priced.state;
    for (let minute = START + 1; minute <= START + 30; minute += 1) {
      state = stepHustleMinute(state, ALWAYS, minute, true);
    }
    expect(state.totalSold).toBe(0);
    expect(state.totalMissed).toBe(0);
  });

  it('sells at the player price', () => {
    let state = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    // 45 naira is cheaper than the reference, so a customer still arrives every minute.
    state = setSellPrice(state, ALWAYS, naira(45)).state;
    state = stepHustleMinute(state, ALWAYS, START + 1, true);
    expect(state.ledger.balance).toBe(naira(1500 + 45));
  });

  it('is deterministic for the same seed and different for another seed', () => {
    function play(config: HustleConfig): HustleState {
      let state = mustBuy(createHustle(config), config, 3, START);
      for (let minute = START + 1; minute <= START + 1440; minute += 1) {
        state = stepHustleMinute(state, config, minute, true);
      }
      return state;
    }
    const a = play(DEFAULT_HUSTLE_CONFIG);
    expect(play(DEFAULT_HUSTLE_CONFIG)).toEqual(a);
    const other = play({ ...DEFAULT_HUSTLE_CONFIG, seed: 7 });
    expect(JSON.stringify(other.ledger)).not.toBe(JSON.stringify(a.ledger));
  });
});

describe('summarizeDay', () => {
  it('totals each kind of entry for one day only', () => {
    let state = mustBuy(createHustle(ALWAYS), ALWAYS, 1, START);
    for (let minute = START + 1; minute <= START + 10; minute += 1) {
      state = stepHustleMinute(state, ALWAYS, minute, true);
    }
    const day = summarizeDay(state.ledger, 0);
    expect(day.revenue).toBe(naira(500));
    expect(day.stockSpend).toBe(naira(400));
    expect(day.expenses).toBe(naira(100));
    expect(day.cashChange).toBe(0);
    const other = summarizeDay(state.ledger, 1);
    expect(other.revenue).toBe(0);
    expect(other.cashChange).toBe(0);
  });

  it('can report a loss', () => {
    const state = mustBuy(createHustle(DEFAULT_HUSTLE_CONFIG), DEFAULT_HUSTLE_CONFIG, 1, START);
    expect(summarizeDay(state.ledger, 0).cashChange).toBe(naira(-500));
  });
});
