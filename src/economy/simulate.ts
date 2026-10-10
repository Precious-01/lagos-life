import { DEFAULT_START_MINUTE, MINUTES_PER_DAY, dayIndexOf, hourOfDay } from './clock';
import {
  buyBags,
  createHustle,
  stepHustleMinute,
  summarizeDay,
  type DaySummary,
  type HustleConfig,
  type HustleState,
} from './hustle';

/**
 * A headless simulator: plays the hustle with a simple "policy" and no screen, so the economy can
 * be tested and balanced by running many days quickly. It follows the same rules as the real game
 * because it calls the same functions.
 */

export interface PolicyView {
  /** The game minute about to be processed. */
  minute: number;
  hour: number;
  state: HustleState;
  config: HustleConfig;
}

export interface PolicyDecision {
  /** Whole bags to buy this minute. 0 means none. */
  buyBags: number;
  /** Whether the hustler is out selling this minute. */
  selling: boolean;
}

export type HustlePolicy = (view: PolicyView) => PolicyDecision;

/** Never buys and never sells. */
export const idlePolicy: HustlePolicy = () => ({ buyBags: 0, selling: false });

/**
 * Sells from 06:00 to 20:59. Whenever it is selling and has less than one bag left, it makes a
 * supplier trip and buys as many bags as it can carry and afford.
 */
export const diligentPolicy: HustlePolicy = ({ hour, state, config }) => {
  const selling = hour >= 6 && hour < 21;
  if (!selling || state.stock >= config.bagSize) {
    return { buyBags: 0, selling };
  }
  const room = Math.floor((config.maxStock - state.stock) / config.bagSize);
  const affordable = Math.floor((state.ledger.balance - config.tripCost) / config.bagCost);
  return { buyBags: Math.max(0, Math.min(room, affordable)), selling };
};

export interface SimulationResult {
  state: HustleState;
  endMinute: number;
  /** One summary for every day touched, starting with the day of the start minute. */
  days: DaySummary[];
}

/**
 * Runs `days` game days from `startMinute`. Each minute: the policy decides, then any purchase is
 * made, then the minute is processed.
 */
export function simulateHustle(
  config: HustleConfig,
  policy: HustlePolicy,
  days: number,
  startMinute: number = DEFAULT_START_MINUTE,
): SimulationResult {
  if (!Number.isSafeInteger(days) || days <= 0) {
    throw new RangeError('days must be a positive whole number');
  }
  let state = createHustle(config, startMinute);
  const endMinute = startMinute + days * MINUTES_PER_DAY;

  for (let minute = startMinute + 1; minute <= endMinute; minute += 1) {
    const decision = policy({ minute, hour: hourOfDay(minute), state, config });
    if (decision.buyBags > 0) {
      const purchase = buyBags(state, config, decision.buyBags, minute);
      if (purchase.ok) {
        state = purchase.state;
      }
    }
    state = stepHustleMinute(state, config, minute, decision.selling);
  }

  const summaries: DaySummary[] = [];
  for (let day = dayIndexOf(startMinute); day <= dayIndexOf(endMinute); day += 1) {
    summaries.push(summarizeDay(state.ledger, day));
  }
  return { state, endMinute, days: summaries };
}
