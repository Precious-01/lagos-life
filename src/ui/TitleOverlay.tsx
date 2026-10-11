import { useGameStore } from '../state/gameStore';

export function TitleOverlay() {
  const enterWorld = useGameStore((state) => state.enterWorld);

  return (
    <div className="overlay overlay--center">
      <section className="card" aria-labelledby="title-heading">
        <p className="eyebrow">Early prototype</p>
        <h1 id="title-heading">Lagos Tycoon</h1>
        <p className="lede">
          Start as a street hustler. Buy sachet water at the market stall, sell it on your pitch,
          and grow your first naira. All money in this game is fictional. It needs a keyboard.
        </p>
        <button type="button" className="button" onClick={enterWorld}>
          Start hustling
        </button>
      </section>
    </div>
  );
}
