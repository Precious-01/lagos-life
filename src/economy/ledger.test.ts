import { describe, expect, it } from 'vitest';
import { createRng } from '../game/rng';
import {
  MAX_MEMO_LENGTH,
  TRANSACTION_REASONS,
  applyTransaction,
  canAfford,
  createLedger,
  directionOf,
  isValidTransactionId,
  parseLedger,
  reconcileLedger,
  transactionId,
  type LedgerEntry,
  type LedgerState,
  type TransactionRequest,
} from './ledger';
import { MAX_MONEY_KOBO, money, naira, type Money } from './money';

function request(overrides: Partial<TransactionRequest> = {}): TransactionRequest {
  return {
    id: 'sale:1:60',
    reason: 'sale-revenue',
    amount: naira(500),
    memo: 'Sold 10 sachets',
    at: 60,
    ...overrides,
  };
}

function applied(ledger: LedgerState, req: TransactionRequest): LedgerState {
  const result = applyTransaction(ledger, req);
  if (result.status !== 'applied') {
    throw new Error(`expected applied, got ${result.status}`);
  }
  return result.ledger;
}

describe('createLedger', () => {
  it('starts empty with a zero balance', () => {
    const ledger = createLedger();
    expect(ledger.entries).toEqual([]);
    expect(ledger.balance).toBe(0);
  });

  it('records the starting capital as the first entry', () => {
    const ledger = createLedger(naira(2000));
    expect(ledger.balance).toBe(200000);
    expect(ledger.entries).toEqual([
      {
        id: 'opening-balance',
        sequence: 1,
        direction: 'credit',
        amount: 200000,
        reason: 'starting-capital',
        memo: 'Starting capital',
        at: 0,
        balanceAfter: 200000,
      },
    ]);
  });

  it('rejects a negative starting capital', () => {
    expect(() => createLedger(money(-1))).toThrow(RangeError);
  });
});

describe('directionOf', () => {
  it('maps every reason to one direction', () => {
    expect(directionOf('starting-capital')).toBe('credit');
    expect(directionOf('sale-revenue')).toBe('credit');
    expect(directionOf('stock-purchase')).toBe('debit');
    expect(directionOf('operating-expense')).toBe('debit');
  });
});

describe('applyTransaction: valid transactions', () => {
  it('records a credit and increases the balance', () => {
    const start = createLedger(naira(2000));
    const result = applyTransaction(start, request());
    expect(result.status).toBe('applied');
    if (result.status === 'applied') {
      expect(result.ledger.balance).toBe(naira(2500));
      expect(result.entry).toEqual({
        id: 'sale:1:60',
        sequence: 2,
        direction: 'credit',
        amount: naira(500),
        reason: 'sale-revenue',
        memo: 'Sold 10 sachets',
        at: 60,
        balanceAfter: naira(2500),
      });
      expect(result.ledger.entries).toHaveLength(2);
    }
  });

  it('records a debit and decreases the balance', () => {
    const next = applied(
      createLedger(naira(2000)),
      request({ id: 'buy:1', reason: 'stock-purchase', amount: naira(400), memo: 'Bag of water' }),
    );
    expect(next.balance).toBe(naira(1600));
    expect(next.entries[1].direction).toBe('debit');
  });

  it('allows spending exactly the whole balance', () => {
    const next = applied(
      createLedger(naira(400)),
      request({ id: 'buy:1', reason: 'stock-purchase', amount: naira(400) }),
    );
    expect(next.balance).toBe(0);
  });

  it('trims the memo before storing it', () => {
    const next = applied(createLedger(), request({ memo: '  Sold water  ' }));
    expect(next.entries[0].memo).toBe('Sold water');
  });

  it('never modifies the ledger it was given', () => {
    const start = createLedger(naira(2000));
    const snapshot = JSON.stringify(start);
    applyTransaction(start, request());
    expect(JSON.stringify(start)).toBe(snapshot);
  });

  it('allows several entries at the same minute', () => {
    let ledger = createLedger(naira(100));
    ledger = applied(ledger, request({ id: 'a', at: 10 }));
    ledger = applied(ledger, request({ id: 'b', at: 10 }));
    expect(ledger.entries).toHaveLength(3);
  });
});

describe('applyTransaction: rejections', () => {
  const start = createLedger(naira(1000));

  function expectRejected(req: TransactionRequest, error: string): void {
    const result = applyTransaction(start, req);
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.error).toBe(error);
      expect(result.message.length).toBeGreaterThan(0);
    }
    // A refusal leaves the ledger exactly as it was.
    expect(result.ledger).toBe(start);
  }

  it('refuses spending more than the balance, without going negative', () => {
    expectRejected(
      request({ id: 'buy:1', reason: 'stock-purchase', amount: naira(1001) }),
      'insufficient-funds',
    );
  });

  it('refuses invalid ids', () => {
    for (const id of ['', ' x', 'a b', 'a/b', '-x', 'x'.repeat(65)]) {
      expectRejected(request({ id }), 'invalid-id');
    }
  });

  it('refuses invalid amounts', () => {
    expectRejected(request({ amount: money(0) }), 'invalid-amount');
    expectRejected(request({ amount: money(-5) }), 'invalid-amount');
    expectRejected(request({ amount: 1.5 as unknown as Money }), 'invalid-amount');
    expectRejected(request({ amount: Number.NaN as unknown as Money }), 'invalid-amount');
  });

  it('refuses invalid memos', () => {
    expectRejected(request({ memo: '' }), 'invalid-memo');
    expectRejected(request({ memo: '   ' }), 'invalid-memo');
    expectRejected(request({ memo: 'x'.repeat(MAX_MEMO_LENGTH + 1) }), 'invalid-memo');
  });

  it('refuses invalid times', () => {
    expectRejected(request({ at: -1 }), 'invalid-time');
    expectRejected(request({ at: 1.5 }), 'invalid-time');
  });

  it('refuses unknown reasons', () => {
    expectRejected(
      request({ reason: 'free-money' as unknown as TransactionRequest['reason'] }),
      'invalid-reason',
    );
  });

  it('refuses time going backwards', () => {
    const later = applied(start, request({ id: 'a', at: 100 }));
    const result = applyTransaction(later, request({ id: 'b', at: 99 }));
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.error).toBe('time-went-backwards');
    }
    expect(result.ledger).toBe(later);
  });

  it('refuses a credit that would pass the money limit', () => {
    const rich = createLedger(money(MAX_MONEY_KOBO));
    const result = applyTransaction(rich, request({ id: 'more', amount: money(1) }));
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.error).toBe('balance-limit');
    }
    expect(result.ledger).toBe(rich);
  });
});

describe('applyTransaction: duplicates', () => {
  it('recognises an identical repeat and changes nothing', () => {
    const first = applyTransaction(createLedger(naira(1000)), request());
    expect(first.status).toBe('applied');
    const second = applyTransaction(first.ledger, request());
    expect(second.status).toBe('duplicate');
    expect(second.ledger).toBe(first.ledger);
    if (second.status === 'duplicate' && first.status === 'applied') {
      expect(second.entry).toBe(first.entry);
    }
  });

  it('pays only once when the same moment is processed three times', () => {
    let ledger = createLedger(naira(1000));
    for (let i = 0; i < 3; i += 1) {
      ledger = applyTransaction(ledger, request()).ledger;
    }
    expect(ledger.balance).toBe(naira(1500));
    expect(ledger.entries).toHaveLength(2);
  });

  it('refuses reusing an id for a different transaction', () => {
    const ledger = applied(createLedger(naira(1000)), request());
    const result = applyTransaction(ledger, request({ amount: naira(999) }));
    expect(result.status).toBe('rejected');
    if (result.status === 'rejected') {
      expect(result.error).toBe('id-conflict');
    }
    expect(result.ledger).toBe(ledger);
  });
});

describe('canAfford', () => {
  it('compares an amount with the balance', () => {
    const ledger = createLedger(naira(100));
    expect(canAfford(ledger, naira(100))).toBe(true);
    expect(canAfford(ledger, naira(101))).toBe(false);
  });
});

describe('transaction ids', () => {
  it('builds ids from parts', () => {
    expect(transactionId('sale', 3, 540)).toBe('sale:3:540');
  });

  it('throws for parts that make an invalid id', () => {
    expect(() => transactionId('bad id', 1)).toThrow(RangeError);
    expect(() => transactionId()).toThrow(RangeError);
  });

  it('validates ids', () => {
    expect(isValidTransactionId('a')).toBe(true);
    expect(isValidTransactionId('x'.repeat(64))).toBe(true);
    expect(isValidTransactionId('x'.repeat(65))).toBe(false);
    expect(isValidTransactionId('')).toBe(false);
  });
});

describe('reconcileLedger', () => {
  const base = (): LedgerState => {
    let ledger = createLedger(naira(1000));
    ledger = applied(ledger, request({ id: 'a', at: 5 }));
    ledger = applied(
      ledger,
      request({ id: 'b', at: 6, reason: 'stock-purchase', amount: naira(300) }),
    );
    return ledger;
  };

  function replaceEntry(
    ledger: LedgerState,
    index: number,
    change: Partial<LedgerEntry>,
  ): LedgerState {
    return {
      ...ledger,
      entries: ledger.entries.map((entry, i) => (i === index ? { ...entry, ...change } : entry)),
    };
  }

  function hasProblem(ledger: LedgerState, text: string): boolean {
    return reconcileLedger(ledger).some((problem) => problem.includes(text));
  }

  it('finds nothing wrong with an honest ledger, including an empty one', () => {
    expect(reconcileLedger(base())).toEqual([]);
    expect(reconcileLedger(createLedger())).toEqual([]);
  });

  it('detects an edited amount', () => {
    const ledger = base();
    const tampered = replaceEntry(ledger, 1, { amount: money(ledger.entries[1].amount + 1) });
    expect(hasProblem(tampered, 'balanceAfter')).toBe(true);
  });

  it('detects an edited final balance', () => {
    const ledger = base();
    const tampered = { ...ledger, balance: money(ledger.balance + 1) };
    expect(hasProblem(tampered, 'ledger balance')).toBe(true);
  });

  it('detects reordered entries', () => {
    const ledger = base();
    const tampered = { ...ledger, entries: [...ledger.entries].reverse() };
    expect(hasProblem(tampered, 'sequence')).toBe(true);
  });

  it('detects duplicate ids', () => {
    const ledger = base();
    const tampered = replaceEntry(ledger, 2, { id: ledger.entries[1].id });
    expect(hasProblem(tampered, 'duplicate id')).toBe(true);
  });

  it('detects a direction that does not match the reason', () => {
    const tampered = replaceEntry(base(), 1, { direction: 'debit' });
    expect(hasProblem(tampered, 'direction')).toBe(true);
  });

  it('detects time going backwards', () => {
    const tampered = replaceEntry(base(), 0, { at: 9 });
    expect(hasProblem(tampered, 'earlier')).toBe(true);
  });

  it('detects a balance that went negative', () => {
    const forged: LedgerState = {
      balance: money(-100),
      entries: [
        {
          id: 'x',
          sequence: 1,
          direction: 'debit',
          amount: money(100),
          reason: 'stock-purchase',
          memo: 'Forged',
          at: 0,
          balanceAfter: money(-100),
        },
      ],
    };
    expect(hasProblem(forged, 'negative')).toBe(true);
  });
});

describe('random transactions', () => {
  it('always reconcile, never go negative, and match an independent running total', () => {
    const rng = createRng(2026);
    const spendReasons = TRANSACTION_REASONS.filter((reason) => reason !== 'starting-capital');
    const submitted: TransactionRequest[] = [];
    let ledger = createLedger(naira(1000));
    let expected: number = ledger.balance;
    let appliedCount = 0;
    let rejectedCount = 0;
    let duplicateCount = 0;
    let neverNegative = true;

    for (let i = 0; i < 500; i += 1) {
      let req: TransactionRequest;
      if (submitted.length > 0 && rng() < 0.1) {
        req = submitted[Math.floor(rng() * submitted.length)];
      } else {
        const reason = spendReasons[Math.floor(rng() * spendReasons.length)];
        req = {
          id: `t${i}`,
          reason,
          amount: money(1 + Math.floor(rng() * 50000)),
          memo: 'random',
          at: i,
        };
        submitted.push(req);
      }
      const result = applyTransaction(ledger, req);
      if (result.status === 'applied') {
        appliedCount += 1;
        expected += result.entry.direction === 'credit' ? req.amount : -req.amount;
      } else if (result.status === 'rejected') {
        rejectedCount += 1;
      } else {
        duplicateCount += 1;
      }
      ledger = result.ledger;
      if (ledger.balance < 0) {
        neverNegative = false;
      }
    }

    expect(neverNegative).toBe(true);
    expect(reconcileLedger(ledger)).toEqual([]);
    expect(ledger.balance).toBe(expected);
    expect(ledger.entries).toHaveLength(appliedCount + 1);
    expect(appliedCount).toBeGreaterThan(0);
    expect(rejectedCount).toBeGreaterThan(0);
    expect(duplicateCount).toBeGreaterThan(0);
  });
});

describe('parseLedger', () => {
  it('accepts a ledger that went through JSON', () => {
    let ledger = createLedger(naira(2000));
    ledger = applied(ledger, request());
    const loaded = parseLedger(JSON.parse(JSON.stringify(ledger)));
    expect(loaded).toEqual(ledger);
  });

  it('rejects a save whose amount was edited', () => {
    const ledger = applied(createLedger(naira(2000)), request());
    const raw = JSON.parse(JSON.stringify(ledger)) as { entries: { amount: number }[] };
    raw.entries[1].amount += 100000;
    expect(() => parseLedger(raw)).toThrow('Invalid ledger');
  });

  it('rejects malformed data', () => {
    expect(() => parseLedger('nope')).toThrow('Invalid ledger');
    expect(() => parseLedger({})).toThrow('Invalid ledger');
    expect(() => parseLedger({ entries: [{ id: 1 }], balance: 0 })).toThrow('Invalid ledger');
    expect(() => parseLedger({ entries: [], balance: 5 })).toThrow('Invalid ledger');
  });
});
