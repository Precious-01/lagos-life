import {
  MAX_MONEY_KOBO,
  ZERO_MONEY,
  addMoney,
  formatNaira,
  isMoney,
  subtractMoney,
  type Money,
} from './money';

/**
 * The ledger is the single record of every change to a balance. The balance is never edited
 * directly: it only changes by applying a transaction, and `reconcileLedger` can always rebuild
 * it from the entries to prove they agree.
 *
 * Everything here is pure and immutable. applyTransaction never changes the ledger it is given;
 * it returns a new one. The entry list is copied on every append, which is fine for a few thousand
 * entries (the player acts at human speed). If a save grows very large we would add checkpoints.
 */

export const TRANSACTION_REASONS = [
  'starting-capital',
  'sale-revenue',
  'stock-purchase',
  'operating-expense',
] as const;
export type TransactionReason = (typeof TRANSACTION_REASONS)[number];

export type TransactionDirection = 'credit' | 'debit';

/** Each reason always moves money one way, so a request cannot say "credit" for a purchase. */
const DIRECTION_BY_REASON: Record<TransactionReason, TransactionDirection> = {
  'starting-capital': 'credit',
  'sale-revenue': 'credit',
  'stock-purchase': 'debit',
  'operating-expense': 'debit',
};

export const MAX_TRANSACTION_ID_LENGTH = 64;
export const MAX_MEMO_LENGTH = 120;
export const OPENING_TRANSACTION_ID = 'opening-balance';

const TRANSACTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

export interface LedgerEntry {
  /** Unique within the ledger. Chosen by the caller so that repeating an action is detected. */
  readonly id: string;
  /** 1 for the first entry, then 2, 3 and so on with no gaps. */
  readonly sequence: number;
  readonly direction: TransactionDirection;
  /** Always positive. The direction says whether it was added or taken. */
  readonly amount: Money;
  readonly reason: TransactionReason;
  readonly memo: string;
  /** Game time in whole minutes since the start of the game. Never decreases along the ledger. */
  readonly at: number;
  /** The balance immediately after this entry. */
  readonly balanceAfter: Money;
}

export interface LedgerState {
  readonly entries: readonly LedgerEntry[];
  readonly balance: Money;
}

export interface TransactionRequest {
  /** Unique id, for example from transactionId('sale', day, minute). See below. */
  id: string;
  reason: TransactionReason;
  /** Positive. The reason decides whether it is added or taken. */
  amount: Money;
  /** A short human-readable description, 1 to 120 characters. */
  memo: string;
  /** Game time in whole minutes. Must not be earlier than the last entry. */
  at: number;
}

export type LedgerErrorCode =
  | 'invalid-id'
  | 'invalid-reason'
  | 'invalid-amount'
  | 'invalid-memo'
  | 'invalid-time'
  | 'time-went-backwards'
  | 'id-conflict'
  | 'insufficient-funds'
  | 'balance-limit';

export type ApplyResult =
  /** The transaction was recorded. `ledger` is the new ledger. */
  | { status: 'applied'; ledger: LedgerState; entry: LedgerEntry }
  /** The same transaction (same id and same content) was already recorded. Nothing changed. */
  | { status: 'duplicate'; ledger: LedgerState; entry: LedgerEntry }
  /** The transaction was refused. `ledger` is the unchanged ledger. */
  | { status: 'rejected'; ledger: LedgerState; error: LedgerErrorCode; message: string };

export function directionOf(reason: TransactionReason): TransactionDirection {
  return DIRECTION_BY_REASON[reason];
}

export function isValidTransactionId(id: string): boolean {
  return id.length <= MAX_TRANSACTION_ID_LENGTH && TRANSACTION_ID_PATTERN.test(id);
}

function isKnownReason(reason: string): boolean {
  return (TRANSACTION_REASONS as readonly string[]).includes(reason);
}

/**
 * Builds a transaction id from parts, for example transactionId('sale', 3, 540) is "sale:3:540".
 * Using the day and minute makes an id repeatable, so processing the same moment twice is detected
 * as a duplicate instead of paying twice. Throws RangeError if the result is not a valid id.
 */
export function transactionId(...parts: readonly (string | number)[]): string {
  const id = parts.map(String).join(':');
  if (!isValidTransactionId(id)) {
    throw new RangeError(`Not a valid transaction id: "${id}"`);
  }
  return id;
}

/**
 * A new ledger. A positive starting capital becomes the first entry, so it is on the record too.
 * Throws RangeError for a negative amount.
 */
export function createLedger(startingCapital: Money = ZERO_MONEY): LedgerState {
  if (startingCapital < 0) {
    throw new RangeError('Starting capital cannot be negative');
  }
  const empty: LedgerState = { entries: [], balance: ZERO_MONEY };
  if (startingCapital === 0) {
    return empty;
  }
  const result = applyTransaction(empty, {
    id: OPENING_TRANSACTION_ID,
    reason: 'starting-capital',
    amount: startingCapital,
    memo: 'Starting capital',
    at: 0,
  });
  if (result.status !== 'applied') {
    throw new Error('Could not record the starting capital');
  }
  return result.ledger;
}

/** True when the ledger holds at least this much. */
export function canAfford(ledger: LedgerState, amount: Money): boolean {
  return amount <= ledger.balance;
}

function reject(ledger: LedgerState, error: LedgerErrorCode, message: string): ApplyResult {
  return { status: 'rejected', ledger, error, message };
}

/** The most recent entry with this id. Scans from the end, because repeats are usually recent. */
function findEntry(ledger: LedgerState, id: string): LedgerEntry | undefined {
  for (let i = ledger.entries.length - 1; i >= 0; i -= 1) {
    if (ledger.entries[i].id === id) {
      return ledger.entries[i];
    }
  }
  return undefined;
}

/**
 * Records one transaction, or refuses it. Checks, in order: the id, reason, amount, memo and time
 * are valid; a repeat of an already-recorded id is recognised; the time does not go backwards; and
 * the balance stays between zero and the money limit. The input ledger is never modified.
 *
 * Idempotency: submitting the exact same request again returns status 'duplicate' and the unchanged
 * ledger. Reusing an id with different content is refused as 'id-conflict'.
 */
export function applyTransaction(ledger: LedgerState, request: TransactionRequest): ApplyResult {
  const memo = request.memo.trim();

  if (!isValidTransactionId(request.id)) {
    return reject(
      ledger,
      'invalid-id',
      `Transaction id must be 1 to ${MAX_TRANSACTION_ID_LENGTH} characters: letters, digits, and . _ : -`,
    );
  }
  if (!isKnownReason(request.reason)) {
    return reject(ledger, 'invalid-reason', `Unknown transaction reason "${request.reason}"`);
  }
  if (!isMoney(request.amount) || request.amount <= 0) {
    return reject(ledger, 'invalid-amount', 'Amount must be a positive whole number of kobo');
  }
  if (memo.length === 0 || memo.length > MAX_MEMO_LENGTH) {
    return reject(ledger, 'invalid-memo', `Memo must be 1 to ${MAX_MEMO_LENGTH} characters`);
  }
  if (!Number.isSafeInteger(request.at) || request.at < 0) {
    return reject(ledger, 'invalid-time', 'Time must be a whole number of minutes, zero or more');
  }

  const existing = findEntry(ledger, request.id);
  if (existing) {
    const same =
      existing.reason === request.reason &&
      existing.amount === request.amount &&
      existing.memo === memo &&
      existing.at === request.at;
    if (same) {
      return { status: 'duplicate', ledger, entry: existing };
    }
    return reject(
      ledger,
      'id-conflict',
      `Transaction id "${request.id}" is already used by a different transaction`,
    );
  }

  const last = ledger.entries.length > 0 ? ledger.entries[ledger.entries.length - 1] : undefined;
  if (last && request.at < last.at) {
    return reject(
      ledger,
      'time-went-backwards',
      `Time ${request.at} is earlier than the last entry (${last.at})`,
    );
  }

  const direction = directionOf(request.reason);
  let balanceAfter: Money;
  if (direction === 'debit') {
    if (request.amount > ledger.balance) {
      return reject(
        ledger,
        'insufficient-funds',
        `Cannot spend ${formatNaira(request.amount)}: only ${formatNaira(ledger.balance)} available`,
      );
    }
    balanceAfter = subtractMoney(ledger.balance, request.amount);
  } else {
    if (ledger.balance + request.amount > MAX_MONEY_KOBO) {
      return reject(ledger, 'balance-limit', 'This would take the balance past the money limit');
    }
    balanceAfter = addMoney(ledger.balance, request.amount);
  }

  const entry: LedgerEntry = {
    id: request.id,
    sequence: ledger.entries.length + 1,
    direction,
    amount: request.amount,
    reason: request.reason,
    memo,
    at: request.at,
    balanceAfter,
  };
  return {
    status: 'applied',
    ledger: { entries: [...ledger.entries, entry], balance: balanceAfter },
    entry,
  };
}

/**
 * Rebuilds the balance from the entries and compares everything. Returns a list of problems;
 * an empty list means the ledger is consistent. It checks that ids are unique, sequences have no
 * gaps, each reason matches its direction, amounts and memos are valid, time never goes backwards,
 * the running balance never goes negative or past the limit, every balanceAfter is right, and the
 * final balance equals the sum of all credits minus all debits.
 */
export function reconcileLedger(ledger: LedgerState): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  let running = 0;
  let previousAt = 0;

  ledger.entries.forEach((entry, index) => {
    const label = `entry ${index + 1}`;

    if (!isValidTransactionId(entry.id)) {
      problems.push(`${label}: invalid id`);
    } else if (seen.has(entry.id)) {
      problems.push(`${label}: duplicate id ${entry.id}`);
    } else {
      seen.add(entry.id);
    }

    if (entry.sequence !== index + 1) {
      problems.push(`${label}: sequence is ${entry.sequence}, expected ${index + 1}`);
    }

    if (!isKnownReason(entry.reason)) {
      problems.push(`${label}: unknown reason`);
    } else if (DIRECTION_BY_REASON[entry.reason] !== entry.direction) {
      problems.push(`${label}: direction ${entry.direction} does not match reason ${entry.reason}`);
    }

    if (!isMoney(entry.amount) || entry.amount <= 0) {
      problems.push(`${label}: amount must be a positive money value`);
    } else {
      running += entry.direction === 'credit' ? entry.amount : -entry.amount;
    }

    const memo = entry.memo.trim();
    if (memo.length === 0 || memo.length > MAX_MEMO_LENGTH || memo !== entry.memo) {
      problems.push(`${label}: invalid memo`);
    }

    if (!Number.isSafeInteger(entry.at) || entry.at < 0) {
      problems.push(`${label}: invalid time`);
    } else {
      if (entry.at < previousAt) {
        problems.push(`${label}: time ${entry.at} is earlier than the previous entry`);
      }
      previousAt = entry.at;
    }

    if (running < 0) {
      problems.push(`${label}: balance went negative`);
    }
    if (running > MAX_MONEY_KOBO) {
      problems.push(`${label}: balance went past the money limit`);
    }
    if (entry.balanceAfter !== running) {
      problems.push(`${label}: balanceAfter is ${entry.balanceAfter}, expected ${running}`);
    }
  });

  if (ledger.balance !== running) {
    problems.push(`ledger balance is ${ledger.balance}, but the entries add up to ${running}`);
  }
  return problems;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates untrusted data, such as a loaded save, and returns it as a LedgerState. The ledger must
 * be structurally correct AND reconcile. Throws an Error listing every problem.
 */
export function parseLedger(value: unknown): LedgerState {
  if (!isRecord(value) || !Array.isArray(value.entries)) {
    throw new Error('Invalid ledger: expected an object with an entries array');
  }
  const problems: string[] = [];
  if (!isMoney(value.balance)) {
    problems.push('balance must be a valid money value');
  }
  value.entries.forEach((entry: unknown, index: number) => {
    const label = `entry ${index + 1}`;
    const ok =
      isRecord(entry) &&
      typeof entry.id === 'string' &&
      typeof entry.memo === 'string' &&
      typeof entry.reason === 'string' &&
      typeof entry.direction === 'string' &&
      typeof entry.sequence === 'number' &&
      typeof entry.at === 'number' &&
      isMoney(entry.amount) &&
      isMoney(entry.balanceAfter);
    if (!ok) {
      problems.push(`${label}: missing or malformed fields`);
    }
  });
  if (problems.length > 0) {
    throw new Error(`Invalid ledger:\n${problems.join('\n')}`);
  }

  const ledger = value as unknown as LedgerState;
  const mismatches = reconcileLedger(ledger);
  if (mismatches.length > 0) {
    throw new Error(`Invalid ledger:\n${mismatches.join('\n')}`);
  }
  return ledger;
}
