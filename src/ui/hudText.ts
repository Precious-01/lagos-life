import type { HustleConfig } from '../economy/hustle';
import type { InteractionPoint } from '../game/interaction';

/** Text and options shown by the HUD. Pure, so it can be tested without a browser. */

export interface PromptView {
  title: string;
  detail: string;
  /** The key to press, or null when the place cannot be used yet. */
  keyHint: string | null;
}

/**
 * What the on-screen prompt says for the nearest press point. The kiosk cannot be used yet, so it
 * shows no key. Selling spots are zones, not prompts, so they return null.
 */
export function describePrompt(point: InteractionPoint | null): PromptView | null {
  if (point === null) {
    return null;
  }
  switch (point.kind) {
    case 'supplier':
      return { title: point.label, detail: point.action, keyHint: 'F' };
    case 'kiosk':
      return { title: point.label, detail: 'Not available yet', keyHint: null };
    case 'selling-spot':
      return null;
  }
}

/** One short line telling the player what to do next. */
export function sellingStatusText(atSellingSpot: boolean, stock: number): string {
  if (stock === 0) {
    return atSellingSpot
      ? 'Out of stock. Buy more at the market stall'
      : 'Buy stock at the market stall';
  }
  return atSellingSpot ? 'Selling here' : 'Carry your stock to your selling spot';
}

/** The bag quantities the supplier panel offers: 1 up to the most you can carry. */
export function bagOptions(config: HustleConfig): number[] {
  const count = Math.floor(config.maxStock / config.bagSize);
  return Array.from({ length: count }, (_, index) => index + 1);
}
