import { formatClockTime } from '../economy/clock';
import { formatNaira } from '../economy/money';
import { useEconomyStore } from '../state/economyStore';
import { describePrompt, sellingStatusText } from './hudText';

export function EconomyHud() {
  const balance = useEconomyStore((state) => state.hustle.ledger.balance);
  const stock = useEconomyStore((state) => state.hustle.stock);
  const maxStock = useEconomyStore((state) => state.config.maxStock);
  const minute = useEconomyStore((state) => state.clock.minute);
  const prompt = useEconomyStore((state) => state.prompt);
  const atSellingSpot = useEconomyStore((state) => state.atSellingSpot);
  const panel = useEconomyStore((state) => state.panel);

  const promptView = panel === 'none' ? describePrompt(prompt) : null;

  return (
    <>
      <section className="eco-hud" aria-label="Business status">
        <div className="eco-hud__row">
          <span className="eco-hud__label">Cash</span>
          <strong>{formatNaira(balance)}</strong>
        </div>
        <div className="eco-hud__row">
          <span className="eco-hud__label">Time</span>
          <strong>{formatClockTime(minute)}</strong>
        </div>
        <div className="eco-hud__row">
          <span className="eco-hud__label">Stock</span>
          <strong>
            {stock} / {maxStock} sachets
          </strong>
        </div>
        <p className="eco-hud__status">{sellingStatusText(atSellingSpot, stock)}</p>
      </section>

      {promptView ? (
        <div className="prompt" role="status">
          {promptView.keyHint ? (
            <>
              <kbd>{promptView.keyHint}</kbd> {promptView.detail} · {promptView.title}
            </>
          ) : (
            <>
              {promptView.title}: {promptView.detail}
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
