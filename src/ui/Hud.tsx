import { useGameStore } from '../state/gameStore';
import './economy.css';
import { EconomyHud } from './EconomyHud';
import { SupplierPanel } from './SupplierPanel';

export function Hud() {
  const returnToTitle = useGameStore((state) => state.returnToTitle);

  return (
    <>
      <aside className="hud" aria-label="Controls">
        <h2>Lagos Tycoon</h2>
        <ul>
          <li>W A S D or arrow keys: walk</li>
          <li>Shift: sprint</li>
          <li>Drag with the mouse: look around</li>
          <li>Scroll: zoom</li>
          <li>Q / E: turn the camera</li>
          <li>F: use the market stall when you are next to it</li>
        </ul>
        <button type="button" className="button button--secondary" onClick={returnToTitle}>
          Back to title
        </button>
      </aside>
      <EconomyHud />
      <SupplierPanel />
    </>
  );
}
