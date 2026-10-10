import { describe, expect, it } from 'vitest';
import { DEFAULT_HUSTLE_CONFIG, type HustleConfig } from './hustle';
import { reconcileLedger } from './ledger';
import { formatNaira, naira } from './money';
import { diligentPolicy, idlePolicy, simulateHustle } from './simulate';

const SEEDS = [1, 2, 3, 4, 5];

function withSeed(seed: number): HustleConfig {
  return { ...DEFAULT_HUSTLE_CONFIG, seed };
}

describe('simulateHustle', () => {
  it('is deterministic', () => {
    const a = simulateHustle(DEFAULT_HUSTLE_CONFIG, diligentPolicy, 5);
    const b = simulateHustle(DEFAULT_HUSTLE_CONFIG, diligentPolicy, 5);
    expect(b).toEqual(a);
  });

  it('rejects an invalid number of days', () => {
    expect(() => simulateHustle(DEFAULT_HUSTLE_CONFIG, idlePolicy, 0)).toThrow(RangeError);
    expect(() => simulateHustle(DEFAULT_HUSTLE_CONFIG, idlePolicy, 1.5)).toThrow(RangeError);
  });

  it('leaves an idle player exactly where they started', () => {
    const result = simulateHustle(DEFAULT_HUSTLE_CONFIG, idlePolicy, 10);
    expect(result.state.ledger.balance).toBe(DEFAULT_HUSTLE_CONFIG.startingCapital);
    expect(result.state.ledger.entries).toHaveLength(1);
    expect(result.state.totalSold).toBe(0);
  });

  it('covers one summary per day touched', () => {
    const result = simulateHustle(DEFAULT_HUSTLE_CONFIG, idlePolicy, 3);
    // Starting at 06:00 on day 1 and running 3 days ends at 06:00 on day 4.
    expect(result.days.map((d) => d.dayIndex)).toEqual([0, 1, 2, 3]);
  });

  it('lets a diligent player grow their money without ever going negative', () => {
    for (const seed of SEEDS) {
      const result = simulateHustle(withSeed(seed), diligentPolicy, 10);
      expect(reconcileLedger(result.state.ledger)).toEqual([]);
      expect(result.state.ledger.balance).toBeGreaterThan(
        DEFAULT_HUSTLE_CONFIG.startingCapital + naira(5000),
      );
      expect(result.state.totalSold).toBeGreaterThan(0);
    }
  });

  it('never creates or loses sachets', () => {
    for (const seed of SEEDS) {
      const config = withSeed(seed);
      const result = simulateHustle(config, diligentPolicy, 10);
      const boughtKobo = result.state.ledger.entries
        .filter((entry) => entry.reason === 'stock-purchase')
        .reduce((sum, entry) => sum + entry.amount, 0);
      const bagsBought = boughtKobo / config.bagCost;
      expect(Number.isInteger(bagsBought)).toBe(true);
      expect(result.state.stock + result.state.totalSold).toBe(bagsBought * config.bagSize);
    }
  });

  it('never carries more than the capacity', () => {
    const result = simulateHustle(DEFAULT_HUSTLE_CONFIG, diligentPolicy, 5);
    expect(result.state.stock).toBeLessThanOrEqual(DEFAULT_HUSTLE_CONFIG.maxStock);
  });

  it('reports the real numbers for the provisional economy (informational)', () => {
    const lines: string[] = [];
    for (const seed of SEEDS) {
      const result = simulateHustle(withSeed(seed), diligentPolicy, 10);
      const net = result.days.map((day) => formatNaira(day.cashChange)).join(' ');
      lines.push(
        `seed ${seed}: end ${formatNaira(result.state.ledger.balance)}, ` +
          `sold ${result.state.totalSold}, missed ${result.state.totalMissed}`,
      );
      lines.push(`  daily cash change: ${net}`);
    }
    console.log(`\nSachet hustle, 10 days, diligent policy\n${lines.join('\n')}\n`);
    expect(lines).toHaveLength(SEEDS.length * 2);
  });
});
