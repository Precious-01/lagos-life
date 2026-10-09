import { useEffect, useState } from 'react';
import { actionForKey, clearInput, createInputState, type InputState } from '../game/input';

/**
 * Tracks which game keys are held. Returns ONE stable object that is updated in place,
 * so reading it every frame causes no React re-renders.
 * While `enabled` is false no listeners are attached and every key counts as released.
 */
export function useKeyboardInput(enabled: boolean): InputState {
  const [input] = useState(createInputState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      // Leave browser shortcuts such as Ctrl+W or Alt+Left alone.
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      const action = actionForKey(event.code);
      if (action === null) {
        return;
      }
      // Stops the arrow keys from scrolling the page.
      event.preventDefault();
      input[action] = true;
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      const action = actionForKey(event.code);
      if (action !== null) {
        input[action] = false;
      }
    };

    // If the window loses focus while a key is held, the keyup never arrives. Release everything.
    const releaseAll = (): void => clearInput(input);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', releaseAll);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', releaseAll);
      clearInput(input);
    };
  }, [enabled, input]);

  return input;
}
