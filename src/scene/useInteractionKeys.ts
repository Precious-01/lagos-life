import { useEffect } from 'react';
import { useEconomyStore } from '../state/economyStore';

/**
 * F opens the supplier panel (when the supplier is the current prompt) and closes any open panel.
 * Esc closes an open panel. While `enabled` is false there are no listeners, any open panel is
 * closed and the prompt is cleared, so nothing is left over on the title screen.
 */
export function useInteractionKeys(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      const economy = useEconomyStore.getState();
      economy.closePanel();
      economy.setPrompt(null, false);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Leave browser shortcuts alone, and ignore a held key repeating.
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
        return;
      }
      const economy = useEconomyStore.getState();
      if (event.code === 'KeyF') {
        if (economy.panel === 'none') {
          economy.openSupplierPanel();
        } else {
          economy.closePanel();
        }
      } else if (event.code === 'Escape' && economy.panel !== 'none') {
        economy.closePanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
