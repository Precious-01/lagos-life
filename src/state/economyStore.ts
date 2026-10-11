import { create } from 'zustand';
import { createClock, createClockConfig, type ClockConfig, type GameClock } from '../economy/clock';
import {
  DEFAULT_HUSTLE_CONFIG,
  buyBags,
  createHustle,
  stepHustleMinute,
  type HustleConfig,
  type HustleState,
} from '../economy/hustle';
import { formatNaira, subtractMoney } from '../economy/money';
import type { InteractionPoint } from '../game/interaction';

/**
 * The player's business, as shared client state. The rules live in src/economy (pure and tested);
 * this store only holds the current state and calls those rules.
 *
 * Nothing here changes every frame. The clock's whole minute is stored, so this updates only a few
 * times a second while time runs. The fraction of a minute is kept by the clock driver.
 */

/** Which management panel is open. While one is open the game clock is paused. */
export type PanelId = 'none' | 'supplier';

export interface EconomyState {
  config: HustleConfig;
  clockConfig: ClockConfig;
  hustle: HustleState;
  clock: GameClock;
  panel: PanelId;
  /** The nearest interaction the player can press a key for, or null. */
  prompt: InteractionPoint | null;
  /** True while the player stands inside the selling-spot zone. */
  atSellingSpot: boolean;
  /** A short message about the last action, shown in the open panel. */
  notice: string | null;
  /** Called every frame by the driver. Changes nothing (and notifies nobody) unless a value differs. */
  setPrompt: (prompt: InteractionPoint | null, atSellingSpot: boolean) => void;
  /** Opens the supplier panel, but only when the supplier is the current prompt. */
  openSupplierPanel: () => void;
  closePanel: () => void;
  /** Buys whole bags. Ignored unless the supplier panel is open. */
  buy: (bags: number) => void;
  /** Processes finished game minutes. `clock` is the clock after those minutes. */
  applyMinutes: (minutes: readonly number[], selling: boolean, clock: GameClock) => void;
}

export const useEconomyStore = create<EconomyState>()((set) => ({
  config: DEFAULT_HUSTLE_CONFIG,
  clockConfig: createClockConfig(),
  hustle: createHustle(DEFAULT_HUSTLE_CONFIG),
  clock: createClock(),
  panel: 'none',
  prompt: null,
  atSellingSpot: false,
  notice: null,

  setPrompt: (prompt, atSellingSpot) =>
    set((state) =>
      state.prompt === prompt && state.atSellingSpot === atSellingSpot
        ? state
        : { prompt, atSellingSpot },
    ),

  openSupplierPanel: () =>
    set((state) =>
      state.panel === 'none' && state.prompt?.kind === 'supplier'
        ? { panel: 'supplier', notice: null }
        : state,
    ),

  closePanel: () =>
    set((state) => (state.panel === 'none' ? state : { panel: 'none', notice: null })),

  buy: (bags) =>
    set((state) => {
      if (state.panel !== 'supplier') {
        return state;
      }
      const result = buyBags(state.hustle, state.config, bags, state.clock.minute);
      if (!result.ok) {
        return { notice: result.message };
      }
      const spent = subtractMoney(state.hustle.ledger.balance, result.state.ledger.balance);
      return {
        hustle: result.state,
        notice: `Bought ${bags} ${bags === 1 ? 'bag' : 'bags'} for ${formatNaira(spent)}`,
      };
    }),

  applyMinutes: (minutes, selling, clock) =>
    set((state) => {
      let hustle = state.hustle;
      for (const minute of minutes) {
        hustle = stepHustleMinute(hustle, state.config, minute, selling);
      }
      return { hustle, clock };
    }),
}));
