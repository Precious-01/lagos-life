import { useGameStore } from '../state/gameStore';

export function Hud() {
  const returnToTitle = useGameStore((state) => state.returnToTitle);

  return (
    <aside className="hud" aria-label="Camera controls">
      <h2>Lagos Life</h2>
      <ul>
        <li>Drag: orbit the camera</li>
        <li>Scroll or pinch: zoom</li>
        <li>Right-drag or two fingers: pan</li>
      </ul>
      <button type="button" className="button button--secondary" onClick={returnToTitle}>
        Back to title
      </button>
    </aside>
  );
}
