import { useGameStore } from '../state/gameStore';

export function TitleOverlay() {
  const enterWorld = useGameStore((state) => state.enterWorld);

  return (
    <div className="overlay overlay--center">
      <section className="card" aria-labelledby="title-heading">
        <p className="eyebrow">Technical prototype · Phase 1</p>
        <h1 id="title-heading">Lagos Life</h1>
        <p className="lede">
          A 3D life simulator inspired by Lagos. This build is a placeholder district with
          buildings, roads, lighting and a free camera.
        </p>
        <button type="button" className="button" onClick={enterWorld}>
          Explore the district
        </button>
      </section>
    </div>
  );
}
