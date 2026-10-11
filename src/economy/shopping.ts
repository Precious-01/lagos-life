import type { HustleConfig, HustleState } from './hustle';
import { canAfford } from './ledger';
import { ZERO_MONEY, addMoney, formatNaira, multiplyMoney, type Money } from './money';

/**
 * Read-only questions about buying stock. These never change anything: `buyBags` in hustle.ts is
 * still the only thing that spends money. A test checks that the two always agree.
 */

export interface BuyPreview {
  /** True when buyBags would accept this purchase. */
  ok: boolean;
  bags: number;
  sachets: number;
  /** Stock plus the supplier trip. Zero when the quantity is invalid or over capacity. */
  totalCost: Money;
  /** A short reason when `ok` is false, otherwise null. */
  reason: string | null;
}

export function previewBuyBags(
  state: HustleState,
  config: HustleConfig,
  bags: number,
): BuyPreview {
  if (!Number.isSafeInteger(bags) || bags <= 0) {
    return { ok: false, bags, sachets: 0, totalCost: ZERO_MONEY, reason: 'Invalid amount' };
  }
  const sachets = bags * config.bagSize;
  if (state.stock + sachets > config.maxStock) {
    return { ok: false, bags, sachets, totalCost: ZERO_MONEY, reason: 'Too many to carry' };
  }
  const totalCost = addMoney(multiplyMoney(config.bagCost, bags), config.tripCost);
  if (!canAfford(state.ledger, totalCost)) {
    return {
      ok: false,
      bags,
      sachets,
      totalCost,
      reason: `Needs ${formatNaira(totalCost)}`,
    };
  }
  return { ok: true, bags, sachets, totalCost, reason: null };
}

/** The most whole bags that can be bought right now, limited by what you can carry and afford. */
export function maxBuyableBags(state: HustleState, config: HustleConfig): number {
  const room = Math.floor((config.maxStock - state.stock) / config.bagSize);
  const affordable = Math.floor((state.ledger.balance - config.tripCost) / config.bagCost);
  return Math.max(0, Math.min(room, affordable));
}
