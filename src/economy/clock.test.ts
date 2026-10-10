import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CLOCK_CONFIG,
  DEFAULT_START_MINUTE,
  MINUTES_PER_DAY,
  advanceClock,
  createClock,
  createClockConfig,
  dayIndexOf,
  formatClockTime,
  hourOfDay,
  minuteOfDay,
} from './clock';

const config = createClockConfig();

describe('createClockConfig', () => {
  it('defaults to a 4-minute day', () => {
    expect(DEFAULT_CLOCK_CONFIG.realSecondsPerDay).toBe(240);
    expect(config.realSecondsPerDay).toBe(240);
  });

  it('accepts overrides', () => {
    expect(createClockConfig({ realSecondsPerDay: 120 }).realSecondsPerDay).toBe(120);
  });

  it('rejects invalid values', () => {
    expect(() => createClockConfig({ realSecondsPerDay: 5 })).toThrow(RangeError);
    expect(() => createClockConfig({ realSecondsPerDay: Number.NaN })).toThrow(RangeError);
    expect(() => createClockConfig({ maxDeltaSeconds: 0 })).toThrow(RangeError);
  });
});

describe('createClock', () => {
  it('starts at 06:00 on day 1 by default', () => {
    expect(createClock()).toEqual({ minute: DEFAULT_START_MINUTE, fraction: 0 });
    expect(formatClockTime(createClock().minute)).toBe('Day 1, 06:00');
  });

  it('rejects an invalid start', () => {
    expect(() => createClock(-1)).toThrow(RangeError);
    expect(() => createClock(1.5)).toThrow(RangeError);
  });
});

describe('advanceClock', () => {
  it('runs one game day in exactly 240 real seconds', () => {
    let clock = createClock();
    const seen: number[] = [];
    for (let i = 0; i < 480; i += 1) {
      const step = advanceClock(clock, 0.5, config, false);
      expect(step.completed).toHaveLength(3);
      seen.push(...step.completed);
      clock = step.clock;
    }
    expect(clock.minute).toBe(DEFAULT_START_MINUTE + MINUTES_PER_DAY);
    expect(seen).toHaveLength(MINUTES_PER_DAY);
    expect(seen[0]).toBe(DEFAULT_START_MINUTE + 1);
    expect(seen[seen.length - 1]).toBe(DEFAULT_START_MINUTE + MINUTES_PER_DAY);
  });

  it('does not advance while paused, and returns the same clock', () => {
    const clock = createClock();
    const step = advanceClock(clock, 1, config, true);
    expect(step.clock).toBe(clock);
    expect(step.completed).toEqual([]);
  });

  it('ignores zero, negative and non-numeric deltas', () => {
    const clock = createClock();
    for (const delta of [0, -1, Number.NaN]) {
      const step = advanceClock(clock, delta, config, false);
      expect(step.clock).toBe(clock);
      expect(step.completed).toEqual([]);
    }
  });

  it('caps a long delta at maxDeltaSeconds', () => {
    const step = advanceClock(createClock(), 100, config, false);
    // 1 second at 6 game minutes per second.
    expect(step.completed).toHaveLength(6);
  });

  it('carries the fraction of a minute between small steps', () => {
    const first = advanceClock(createClock(), 0.1, config, false);
    expect(first.completed).toEqual([]);
    expect(first.clock.fraction).toBeCloseTo(0.6, 9);
    const second = advanceClock(first.clock, 0.1, config, false);
    expect(second.completed).toEqual([DEFAULT_START_MINUTE + 1]);
    expect(second.clock.fraction).toBeCloseTo(0.2, 9);
  });

  it('is configurable: a 120-second day runs twice as fast', () => {
    const fast = createClockConfig({ realSecondsPerDay: 120 });
    expect(advanceClock(createClock(), 0.5, fast, false).completed).toHaveLength(6);
  });

  it('does not modify the clock it was given', () => {
    const clock = createClock();
    advanceClock(clock, 0.5, config, false);
    expect(clock).toEqual({ minute: DEFAULT_START_MINUTE, fraction: 0 });
  });
});

describe('time helpers', () => {
  it('work out the day, minute and hour', () => {
    expect(dayIndexOf(0)).toBe(0);
    expect(dayIndexOf(1439)).toBe(0);
    expect(dayIndexOf(1440)).toBe(1);
    expect(minuteOfDay(1440 + 75)).toBe(75);
    expect(hourOfDay(360)).toBe(6);
    expect(hourOfDay(1440 + 23 * 60 + 59)).toBe(23);
  });

  it('format the time for display', () => {
    expect(formatClockTime(360)).toBe('Day 1, 06:00');
    expect(formatClockTime(1440 + 9 * 60 + 5)).toBe('Day 2, 09:05');
    expect(formatClockTime(0)).toBe('Day 1, 00:00');
  });
});
