import { formatNaira } from '../economy/money';
import { previewBuyBags } from '../economy/shopping';
import { useEconomyStore } from '../state/economyStore';
import { bagOptions } from './hudText';

export function SupplierPanel() {
  const open = useEconomyStore((state) => state.panel === 'supplier');
  const hustle = useEconomyStore((state) => state.hustle);
  const config = useEconomyStore((state) => state.config);
  const notice = useEconomyStore((state) => state.notice);
  const buy = useEconomyStore((state) => state.buy);
  const closePanel = useEconomyStore((state) => state.closePanel);

  if (!open) {
    return null;
  }

  return (
    <div className="panel-backdrop">
      <section className="panel" role="dialog" aria-modal="true" aria-labelledby="supplier-title">
        <h2 id="supplier-title">Market stall</h2>
        <p className="panel__lede">
          Buy bags of sachet water to sell on your pitch. Every trip to the supplier costs{' '}
          {formatNaira(config.tripCost)}, however many bags you buy.
        </p>

        <dl className="panel__facts">
          <div>
            <dt>Cash</dt>
            <dd>{formatNaira(hustle.ledger.balance)}</dd>
          </div>
          <div>
            <dt>Carrying</dt>
            <dd>
              {hustle.stock} / {config.maxStock} sachets
            </dd>
          </div>
          <div>
            <dt>One bag</dt>
            <dd>
              {formatNaira(config.bagCost)} for {config.bagSize} sachets
            </dd>
          </div>
        </dl>

        <div className="panel__actions">
          {bagOptions(config).map((bags) => {
            const preview = previewBuyBags(hustle, config, bags);
            return (
              <button
                key={bags}
                type="button"
                className="button panel__buy"
                disabled={!preview.ok}
                onClick={() => buy(bags)}
              >
                Buy {bags} {bags === 1 ? 'bag' : 'bags'}
                <small>{preview.ok ? formatNaira(preview.totalCost) : preview.reason}</small>
              </button>
            );
          })}
        </div>

        {notice ? (
          <p className="panel__notice" role="status">
            {notice}
          </p>
        ) : null}

        <p className="panel__hint">The clock is paused while this is open.</p>
        <button type="button" className="button button--secondary" onClick={closePanel}>
          Close (Esc)
        </button>
      </section>
    </div>
  );
}
