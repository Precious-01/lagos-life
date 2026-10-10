import { DEFAULT_START_MINUTE, MINUTES_PER_DAY, dayIndexOf } from './clock';
import {
  DEFAULT_ARRIVALS_PER_HOUR,
  HOURS_PER_DAY,
  MAX_PRICE_KOBO,
  arrivalProbability,
  randomUnit,
} from './demand';
import { applyTransaction, canAfford, createLedger, transactionId, type LedgerState } from './ledger';
import {
  ZERO_MONEY,
  addMoney,
  formatNaira,
  isMoney,
  multiplyMoney,
  naira,
  subtractMoney,
  type Money,
} from './money';

/**
 * The first business: the sachet-water ("pure water") street hustle. Pure and deterministic.
 * Every change to the player's cash goes through the ledger (see ledger.ts).
 * All numbers in DEFAULT_HUSTLE_CONFIG are PROVISIONAL and will be tuned by simulation.
 */

export interface HustleConfig {
  /** Seeds the random customers. */
  seed: number;
  startingCapital: Money;
  /** Sachets in one bag from the supplier. */
  bagSize: number;
  bagCost: Money;
  /** Charged once for every trip to the supplier, however many bags you buy. */
  tripCost: Money;
  /** The most sachets the hustler can carry. */
  maxStock: number;
  /** The price that gives normal demand. */
  referencePrice: Money;
  minPrice: Money;
  maxPrice: Money;
  /** A customer buys between 1 and this many sachets. */
  maxPerCustomer: number;
  /** Customers per game hour (24 values) at the reference price. */
  arrivalsPerHour: readonly number[];
}

export const DEFAULT_HUSTLE_CONFIG: HustleConfig = {
  seed: 1960,
  startingCapital: naira(2000),
  bagSize: 20,
  bagCost: naira(400),
  tripCost: naira(100),
  maxStock: 60,
  referencePrice: naira(50),
  minPrice: naira(10),
  maxPrice: naira(150),
  maxPerCustomer: 3,
  arrivalsPerHour: DEFAULT_ARRIVALS_PER_HOUR,
};

/** Returns a list of problems. An empty list means the configuration is usable. */
export function validateHustleConfig(config: HustleConfig): string[] {
  const problems: string[] = [];
  if (!Number.isSafeInteger(config.seed)) {
    problems.push('seed must be a whole number');
  }
  if (!isMoney(config.startingCapital) || config.startingCapital < 0) {
    problems.push('startingCapital must be zero or more');
  }
  if (!Number.isSafeInteger(config.bagSize) || config.bagSize <= 0) {
    problems.push('bagSize must be a positive whole number');
  }
  if (!isMoney(config.bagCost) || config.bagCost <= 0) {
    problems.push('bagCost must be positive');
  }
  if (!isMoney(config.tripCost) || config.tripCost < 0) {
    problems.push('tripCost must be zero or more');
  }
  if (!Number.isSafeInteger(config.maxStock) || config.maxStock < config.bagSize) {
    problems.push('maxStock must be a whole number of at least one bag');
  }
  if (!Number.isSafeInteger(config.maxPerCustomer) || config.maxPerCustomer < 1) {
    problems.push('maxPerCustomer must be a whole number of at least 1');
  }
  const prices = [config.minPrice, config.referencePrice, config.maxPrice];
  if (
    !prices.every((price) => isMoney(price) && price > 0 && price <= MAX_PRICE_KOBO) ||
    !(config.minPrice <= config.referencePrice && config.referencePrice <= config.maxPrice)
  ) {
    problems.push('prices must be positive, within the price limit, and minPrice <= referencePrice <= maxPrice');
  }
  if (
    config.arrivalsPerHour.length !== HOURS_PER_DAY ||
    !config.arrivalsPerHour.every((n) => Number.isFinite(n) && n >= 0)
  ) {
    problems.push(`arrivalsPerHour needs ${HOURS_PER_DAY} numbers, none negative`);
  }
  return problems;
}

/** Everything that changes during play. Plain data, so it can be saved as JSON. */
export interface HustleState {
  ledger: LedgerState;
  /** Sachets being carried. */
  stock: number;
  /** The player's current price per sachet. */
  sellPrice: Money;
  /** The last game minute that was processed. Earlier or equal minutes are ignored. */
  lastMinute: number;
  /** How many supplier purchases have been made. Used to make purchase ids unique. */
  purchaseCount: number;
  /** Sachets sold in total. */
  totalSold: number;
  /** Customers who arrived but could not be served (out of stock). */
  totalMissed: number;
}

export function createHustle(
  config: HustleConfig,
  startMinute: number = DEFAULT_START_MINUTE,
): HustleState {
  const problems = validateHustleConfig(config);
  if (problems.length > 0) {
    throw new Error(`Invalid hustle config:\n${problems.join('\n')}`);
  }
  if (!Number.isSafeInteger(startMinute) || startMinute < 0) {
    throw new RangeError('startMinute must be a whole number of minutes, zero or more');
  }
  return {
    ledger: createLedger(config.startingCapital),
    stock: 0,
    sellPrice: config.referencePrice,
    lastMinute: startMinute,
    purchaseCount: 0,
    totalSold: 0,
    totalMissed: 0,
  };
}

export type HustleActionError =
  | 'invalid-quantity'
  | 'over-capacity'
  | 'insufficient-funds'
  | 'invalid-price'
  | 'ledger-rejected';

export type HustleActionResult =
  | { ok: true; state: HustleState }
  /** `state` is the unchanged state, so callers can keep using it. */
  | { ok: false; error: HustleActionError; message: string; state: HustleState };

function fail(state: HustleState, error: HustleActionError, message: string): HustleActionResult {
  return { ok: false, error, message, state };
}

/**
 * Buys whole bags from the supplier: the stock cost AND one supplier trip, at the same time.
 * Atomic: if anything is refused, the state is unchanged and nothing was charged.
 */
export function buyBags(
  state: HustleState,
  config: HustleConfig,
  bags: number,
  minute: number,
): HustleActionResult {
  if (!Number.isSafeInteger(bags) || bags <= 0) {
    return fail(state, 'invalid-quantity', 'Buy a whole number of bags, at least one');
  }
  const sachets = bags * config.bagSize;
  if (state.stock + sachets > config.maxStock) {
    return fail(
      state,
      'over-capacity',
      `You can only carry ${config.maxStock} sachets (you have ${state.stock})`,
    );
  }

  const stockCost = multiplyMoney(config.bagCost, bags);
  const total = addMoney(stockCost, config.tripCost);
  if (!canAfford(state.ledger, total)) {
    return fail(
      state,
      'insufficient-funds',
      `Needs ${formatNaira(total)}, you have ${formatNaira(state.ledger.balance)}`,
    );
  }

  const number = state.purchaseCount + 1;
  const stockResult = applyTransaction(state.ledger, {
    id: transactionId('buy', number),
    reason: 'stock-purchase',
    amount: stockCost,
    memo: `Bought ${bags} ${bags === 1 ? 'bag' : 'bags'} of sachet water (${sachets} sachets)`,
    at: minute,
  });
  if (stockResult.status !== 'applied') {
    const message = stockResult.status === 'rejected' ? stockResult.message : 'Duplicate purchase';
    return fail(state, 'ledger-rejected', message);
  }

  let ledger = stockResult.ledger;
  if (config.tripCost > 0) {
    const tripResult = applyTransaction(ledger, {
      id: transactionId('trip', number),
      reason: 'operating-expense',
      amount: config.tripCost,
      memo: 'Transport to the supplier',
      at: minute,
    });
    if (tripResult.status !== 'applied') {
      const message = tripResult.status === 'rejected' ? tripResult.message : 'Duplicate trip';
      return fail(state, 'ledger-rejected', message);
    }
    ledger = tripResult.ledger;
  }

  return {
    ok: true,
    state: { ...state, ledger, stock: state.stock + sachets, purchaseCount: number },
  };
}

/** Changes the price per sachet. Must be within the allowed range. */
export function setSellPrice(
  state: HustleState,
  config: HustleConfig,
  price: Money,
): HustleActionResult {
  if (!isMoney(price) || price < config.minPrice || price > config.maxPrice) {
    return fail(
      state,
      'invalid-price',
      `Price must be between ${formatNaira(config.minPrice)} and ${formatNaira(config.maxPrice)}`,
    );
  }
  return { ok: true, state: { ...state, sellPrice: price } };
}

const SALT_ARRIVAL = 1;
const SALT_QUANTITY = 2;

/**
 * Processes ONE game minute. `selling` says whether the hustler is at a selling spot with the
 * goods out; if false, nobody buys.
 *
 * Idempotent: a minute at or before `lastMinute` returns the same state object unchanged, so
 * processing a tick twice can never pay twice.
 */
export function stepHustleMinute(
  state: HustleState,
  config: HustleConfig,
  minute: number,
  selling: boolean,
): HustleState {
  if (!Number.isSafeInteger(minute) || minute <= state.lastMinute) {
    return state;
  }
  if (!selling) {
    return { ...state, lastMinute: minute };
  }

  const chance = arrivalProbability(
    config.arrivalsPerHour,
    minute,
    state.sellPrice,
    config.referencePrice,
  );
  if (randomUnit(config.seed, minute, SALT_ARRIVAL) >= chance) {
    return { ...state, lastMinute: minute };
  }

  // A customer has arrived.
  if (state.stock === 0) {
    return { ...state, lastMinute: minute, totalMissed: state.totalMissed + 1 };
  }
  const wanted =
    1 + Math.floor(randomUnit(config.seed, minute, SALT_QUANTITY) * config.maxPerCustomer);
  const quantity = Math.min(wanted, state.stock);
  const result = applyTransaction(state.ledger, {
    id: transactionId('sale', minute),
    reason: 'sale-revenue',
    amount: multiplyMoney(state.sellPrice, quantity),
    memo: `Sold ${quantity} ${quantity === 1 ? 'sachet' : 'sachets'}`,
    at: minute,
  });
  if (result.status !== 'applied') {
    // The sale could not be recorded (for example the balance limit), so the customer is lost.
    return { ...state, lastMinute: minute, totalMissed: state.totalMissed + 1 };
  }
  return {
    ...state,
    ledger: result.ledger,
    stock: state.stock - quantity,
    totalSold: state.totalSold + quantity,
    lastMinute: minute,
  };
}

export interface DaySummary {
  /** Zero-based day number (day 1 is index 0). */
  dayIndex: number;
  revenue: Money;
  stockSpend: Money;
  expenses: Money;
  /** revenue - stockSpend - expenses. Cash flow, not accounting profit: unsold stock is not counted. */
  cashChange: Money;
}

/** Totals the ledger entries of one game day. Starting capital is not included. */
export function summarizeDay(ledger: LedgerState, dayIndex: number): DaySummary {
  let revenue = ZERO_MONEY;
  let stockSpend = ZERO_MONEY;
  let expenses = ZERO_MONEY;
  for (const entry of ledger.entries) {
    if (dayIndexOf(entry.at) !== dayIndex) {
      continue;
    }
    if (entry.reason === 'sale-revenue') {
      revenue = addMoney(revenue, entry.amount);
    } else if (entry.reason === 'stock-purchase') {
      stockSpend = addMoney(stockSpend, entry.amount);
    } else if (entry.reason === 'operating-expense') {
      expenses = addMoney(expenses, entry.amount);
    }
  }
  return {
    dayIndex,
    revenue,
    stockSpend,
    expenses,
    cashChange: subtractMoney(subtractMoney(revenue, stockSpend), expenses),
  };
}

export { MINUTES_PER_DAY };
