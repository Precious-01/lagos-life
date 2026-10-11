import { describe, expect, it } from 'vitest';
import { DEFAULT_HUSTLE_CONFIG } from '../economy/hustle';
import { buildStreetInteractions, type InteractionPoint } from '../game/interaction';
import { DEFAULT_STREET_LAYOUT } from '../game/street';
import { bagOptions, describePrompt, sellingStatusText } from './hudText';

const points = buildStreetInteractions(DEFAULT_STREET_LAYOUT);

function pointOf(kind: InteractionPoint['kind']): InteractionPoint {
  const found = points.find((point) => point.kind === kind);
  if (!found) {
    throw new Error(`no ${kind} point`);
  }
  return found;
}

describe('describePrompt', () => {
  it('shows nothing when there is no prompt', () => {
    expect(describePrompt(null)).toBeNull();
  });

  it('tells the player to press F at the market stall', () => {
    expect(describePrompt(pointOf('supplier'))).toEqual({
      title: 'Market stall',
      detail: 'Buy stock',
      keyHint: 'F',
    });
  });

  it('shows the kiosk as not available, with no key to press', () => {
    expect(describePrompt(pointOf('kiosk'))).toEqual({
      title: 'Kiosk',
      detail: 'Not available yet',
      keyHint: null,
    });
  });

  it('never makes a prompt from the selling spot', () => {
    expect(describePrompt(pointOf('selling-spot'))).toBeNull();
  });
});

describe('sellingStatusText', () => {
  it('guides the player through the loop', () => {
    expect(sellingStatusText(false, 0)).toBe('Buy stock at the market stall');
    expect(sellingStatusText(false, 20)).toBe('Carry your stock to your selling spot');
    expect(sellingStatusText(true, 20)).toBe('Selling here');
    expect(sellingStatusText(true, 0)).toBe('Out of stock. Buy more at the market stall');
  });
});

describe('bagOptions', () => {
  it('offers 1 to 3 bags with the default capacity of 60 sachets', () => {
    expect(bagOptions(DEFAULT_HUSTLE_CONFIG)).toEqual([1, 2, 3]);
  });

  it('follows the capacity', () => {
    expect(bagOptions({ ...DEFAULT_HUSTLE_CONFIG, maxStock: 100 })).toEqual([1, 2, 3, 4, 5]);
    expect(bagOptions({ ...DEFAULT_HUSTLE_CONFIG, maxStock: 19 })).toEqual([]);
  });
});
