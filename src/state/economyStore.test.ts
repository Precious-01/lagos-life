import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_START_MINUTE, formatClockTime } from '../economy/clock';
import { DEFAULT_HUSTLE_CONFIG, type HustleConfig } from '../economy/hustle';
import { reconcileLedger } from '../economy/ledger';
import { naira } from '../economy/money';
import { buildStreetInteractions, type InteractionPoint } from '../game/interaction';
import { DEFAULT_STREET_LAYOUT } from '../game/street';
import { useEconomyStore } from './economyStore';

const points = buildStreetInteractions(DEFAULT_STREET_LAYOUT);

function pointOf(kind: InteractionPoint['kind']): InteractionPoint {
  const found = points.find((point) => point.kind === kind);
  if (!found) {
    throw new Error(`no ${kind} point`);
  }
  return found;
}

function openSupplier(): void {
  useEconomyStore.getState().setPrompt(pointOf('supplier'), false);
  useEconomyStore.getState().openSupplierPanel();
}

/** A customer arrives every minute and buys exactly one sachet, so results are predictable. */
const ALWAYS: HustleConfig = {
  ...DEFAULT_HUSTLE_CONFIG,
  arrivalsPerHour: Array.from({ length: 24 }, () => 60),
  maxPerCustomer: 1,
};

beforeEach(() => {
  useEconomyStore.setState(useEconomyStore.getInitialState(), true);
});

describe('initial state', () => {
  it('starts on day 1 at 06:00 with 2,000 naira and no stock', () => {
    const state = useEconomyStore.getState();
    expect(state.hustle.ledger.balance).toBe(naira(2000));
    expect(state.hustle.stock).toBe(0);
    expect(state.clock.minute).toBe(DEFAULT_START_MINUTE);
    expect(formatClockTime(state.clock.minute)).toBe('Day 1, 06:00');
    expect(state.clockConfig.realSecondsPerDay).toBe(240);
    expect(state.panel).toBe('none');
    expect(state.prompt).toBeNull();
    expect(state.atSellingSpot).toBe(false);
    expect(state.notice).toBeNull();
  });
});

describe('setPrompt', () => {
  it('stores the prompt and the selling-spot flag', () => {
    useEconomyStore.getState().setPrompt(pointOf('kiosk'), true);
    const state = useEconomyStore.getState();
    expect(state.prompt).toBe(pointOf('kiosk'));
    expect(state.atSellingSpot).toBe(true);
  });

  it('changes nothing, and creates no new state, when the values are the same', () => {
    const supplier = pointOf('supplier');
    useEconomyStore.getState().setPrompt(supplier, true);
    const before = useEconomyStore.getState();
    useEconomyStore.getState().setPrompt(supplier, true);
    expect(useEconomyStore.getState()).toBe(before);
  });
});

describe('opening and closing the supplier panel', () => {
  it('does not open without a prompt', () => {
    useEconomyStore.getState().openSupplierPanel();
    expect(useEconomyStore.getState().panel).toBe('none');
  });

  it('does not open for the kiosk or the selling spot', () => {
    useEconomyStore.getState().setPrompt(pointOf('kiosk'), false);
    useEconomyStore.getState().openSupplierPanel();
    expect(useEconomyStore.getState().panel).toBe('none');

    useEconomyStore.getState().setPrompt(pointOf('selling-spot'), true);
    useEconomyStore.getState().openSupplierPanel();
    expect(useEconomyStore.getState().panel).toBe('none');
  });

  it('opens when the supplier is the prompt, and closes again', () => {
    openSupplier();
    expect(useEconomyStore.getState().panel).toBe('supplier');
    useEconomyStore.getState().closePanel();
    expect(useEconomyStore.getState().panel).toBe('none');
  });

  it('clears the notice when it opens and when it closes', () => {
    useEconomyStore.setState({ notice: 'old message' });
    openSupplier();
    expect(useEconomyStore.getState().notice).toBeNull();
    useEconomyStore.setState({ notice: 'another' });
    useEconomyStore.getState().closePanel();
    expect(useEconomyStore.getState().notice).toBeNull();
  });
});

describe('buy', () => {
  it('is ignored while the panel is closed', () => {
    useEconomyStore.getState().setPrompt(pointOf('supplier'), false);
    const before = useEconomyStore.getState();
    useEconomyStore.getState().buy(1);
    const after = useEconomyStore.getState();
    expect(after.hustle).toBe(before.hustle);
    expect(after.hustle.stock).toBe(0);
  });

  it('buys a bag, charges the trip, and records it at the current game minute', () => {
    openSupplier();
    useEconomyStore.getState().buy(1);
    const { hustle, notice } = useEconomyStore.getState();
    expect(hustle.stock).toBe(20);
    expect(hustle.ledger.balance).toBe(naira(1500));
    expect(notice).toBe('Bought 1 bag for ₦500');
    expect(hustle.ledger.entries[1].at).toBe(DEFAULT_START_MINUTE);
    expect(reconcileLedger(hustle.ledger)).toEqual([]);
  });

  it('says "bags" for more than one', () => {
    openSupplier();
    useEconomyStore.getState().buy(2);
    expect(useEconomyStore.getState().notice).toBe('Bought 2 bags for ₦900');
  });

  it('refuses an impossible purchase, leaves the business unchanged and explains why', () => {
    openSupplier();
    const before = useEconomyStore.getState().hustle;
    useEconomyStore.getState().buy(4);
    const after = useEconomyStore.getState();
    expect(after.hustle).toBe(before);
    expect(after.notice).toContain('carry');
  });
});

describe('applyMinutes', () => {
  it('sells to customers while the player is at the selling spot', () => {
    useEconomyStore.setState({ config: ALWAYS });
    openSupplier();
    useEconomyStore.getState().buy(1);
    const base = DEFAULT_START_MINUTE;
    const clock = { minute: base + 3, fraction: 0.25 };
    useEconomyStore.getState().applyMinutes([base + 1, base + 2, base + 3], true, clock);

    const state = useEconomyStore.getState();
    expect(state.hustle.totalSold).toBe(3);
    expect(state.hustle.stock).toBe(17);
    expect(state.hustle.ledger.balance).toBe(naira(1500 + 3 * 50));
    expect(state.clock).toEqual(clock);
    expect(reconcileLedger(state.hustle.ledger)).toEqual([]);
  });

  it('sells nothing when the player is not selling, but still moves time on', () => {
    useEconomyStore.setState({ config: ALWAYS });
    openSupplier();
    useEconomyStore.getState().buy(1);
    const base = DEFAULT_START_MINUTE;
    useEconomyStore.getState().applyMinutes([base + 1, base + 2], false, {
      minute: base + 2,
      fraction: 0,
    });
    const state = useEconomyStore.getState();
    expect(state.hustle.totalSold).toBe(0);
    expect(state.hustle.stock).toBe(20);
    expect(state.hustle.lastMinute).toBe(base + 2);
    expect(state.clock.minute).toBe(base + 2);
  });

  it('never sells the same minute twice', () => {
    useEconomyStore.setState({ config: ALWAYS });
    openSupplier();
    useEconomyStore.getState().buy(1);
    const base = DEFAULT_START_MINUTE;
    const clock = { minute: base + 1, fraction: 0 };
    useEconomyStore.getState().applyMinutes([base + 1], true, clock);
    useEconomyStore.getState().applyMinutes([base + 1], true, clock);
    expect(useEconomyStore.getState().hustle.totalSold).toBe(1);
  });

  it('misses customers when the player has no stock', () => {
    useEconomyStore.setState({ config: ALWAYS });
    const base = DEFAULT_START_MINUTE;
    useEconomyStore.getState().applyMinutes([base + 1, base + 2], true, {
      minute: base + 2,
      fraction: 0,
    });
    const { hustle } = useEconomyStore.getState();
    expect(hustle.totalSold).toBe(0);
    expect(hustle.totalMissed).toBe(2);
  });
});
