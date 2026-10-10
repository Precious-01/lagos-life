/**
 * The game clock. Time is counted in whole GAME MINUTES since the start of the game, plus the
 * fraction of the minute that has elapsed. A game day is 24 * 60 = 1,440 game minutes.
 *
 * With the default 240 real seconds per game day, one real second is 6 game minutes.
 *
 * The clock is pure: it never reads the real time. The caller passes in how many real seconds have
 * passed, and whether the game is paused (for example while a management panel is open).
 */

export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;
/** A new game starts at 06:00 on day 1. */
export const DEFAULT_START_MINUTE = 6 * MINUTES_PER_HOUR;

export interface ClockConfig {
  /** How many real seconds one game day lasts. At least 10. */
  realSecondsPerDay: number;
  /** The most real time one advance may count. Stops a long pause (a hidden tab) becoming a huge jump. */
  maxDeltaSeconds: number;
}

export const DEFAULT_CLOCK_CONFIG: ClockConfig = {
  realSecondsPerDay: 240,
  maxDeltaSeconds: 1,
};

export function createClockConfig(overrides: Partial<ClockConfig> = {}): ClockConfig {
  const config = { ...DEFAULT_CLOCK_CONFIG, ...overrides };
  if (!Number.isFinite(config.realSecondsPerDay) || config.realSecondsPerDay < 10) {
    throw new RangeError('realSecondsPerDay must be a number of at least 10');
  }
  if (!Number.isFinite(config.maxDeltaSeconds) || config.maxDeltaSeconds <= 0) {
    throw new RangeError('maxDeltaSeconds must be a positive number');
  }
  return config;
}

export interface GameClock {
  /** Whole game minutes elapsed since the start of the game. */
  minute: number;
  /** Part of the next minute that has passed, from 0 up to (not including) 1. */
  fraction: number;
}

export function createClock(startMinute: number = DEFAULT_START_MINUTE): GameClock {
  if (!Number.isSafeInteger(startMinute) || startMinute < 0) {
    throw new RangeError('startMinute must be a whole number of minutes, zero or more');
  }
  return { minute: startMinute, fraction: 0 };
}

export interface ClockAdvance {
  clock: GameClock;
  /** Every whole minute that finished during this advance, in order. Empty when none did. */
  completed: number[];
}

/**
 * Moves the clock forward. While `paused` (or when the delta is zero, negative or not a number)
 * the SAME clock object is returned and nothing completes.
 */
export function advanceClock(
  clock: GameClock,
  deltaSeconds: number,
  config: ClockConfig,
  paused: boolean,
): ClockAdvance {
  if (paused || !(deltaSeconds > 0)) {
    return { clock, completed: [] };
  }
  const delta = Math.min(deltaSeconds, config.maxDeltaSeconds);
  const total = clock.fraction + (delta * MINUTES_PER_DAY) / config.realSecondsPerDay;
  const whole = Math.floor(total);
  const completed: number[] = [];
  for (let i = 1; i <= whole; i += 1) {
    completed.push(clock.minute + i);
  }
  return {
    clock: { minute: clock.minute + whole, fraction: total - whole },
    completed,
  };
}

/** Zero-based day number: minutes 0 to 1,439 are day index 0 (shown to players as day 1). */
export function dayIndexOf(minute: number): number {
  return Math.floor(minute / MINUTES_PER_DAY);
}

export function minuteOfDay(minute: number): number {
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/** 0 to 23. */
export function hourOfDay(minute: number): number {
  return Math.floor(minuteOfDay(minute) / MINUTES_PER_HOUR);
}

/** For example "Day 1, 06:00". Days are shown starting from 1. */
export function formatClockTime(minute: number): string {
  const inDay = minuteOfDay(minute);
  const hours = String(Math.floor(inDay / MINUTES_PER_HOUR)).padStart(2, '0');
  const minutes = String(inDay % MINUTES_PER_HOUR).padStart(2, '0');
  return `Day ${dayIndexOf(minute) + 1}, ${hours}:${minutes}`;
}
