import { useGameStore } from '../state/gameStore';

export function TitleOverlay() {
  const enterWorld = useGameStore((state) => state.enterWorld);

  return (
    <div className="overlay overlay--center">
      <section className="card" aria-labelledby="title-heading">
        <p className="eyebrow">Technical prototype · Phase 2</p>
        <h1 id="title-heading">Lagos Life</h1>
        <p className="lede">
          A 3D life simulator inspired by Lagos. This build is a placeholder district you can walk
          around, with a follow camera and collisions. It needs a keyboard.
        </p>
        <button type="button" className="button" onClick={enterWorld}>
          Start walking
        </button>
      </section>
    </div>
  );
}
