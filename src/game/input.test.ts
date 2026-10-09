import { describe, expect, it } from 'vitest';
import { actionForKey, clearInput, createInputState } from './input';

describe('actionForKey', () => {
  it('maps WASD and the arrow keys to movement', () => {
    expect(actionForKey('KeyW')).toBe('forward');
    expect(actionForKey('ArrowUp')).toBe('forward');
    expect(actionForKey('KeyS')).toBe('backward');
    expect(actionForKey('ArrowDown')).toBe('backward');
    expect(actionForKey('KeyA')).toBe('left');
    expect(actionForKey('ArrowLeft')).toBe('left');
    expect(actionForKey('KeyD')).toBe('right');
    expect(actionForKey('ArrowRight')).toBe('right');
  });

  it('maps Shift to sprint and Q/E to camera rotation', () => {
    expect(actionForKey('ShiftLeft')).toBe('sprint');
    expect(actionForKey('ShiftRight')).toBe('sprint');
    expect(actionForKey('KeyQ')).toBe('rotateLeft');
    expect(actionForKey('KeyE')).toBe('rotateRight');
  });

  it('returns null for unbound keys, including names that exist on every object', () => {
    expect(actionForKey('KeyZ')).toBeNull();
    expect(actionForKey('constructor')).toBeNull();
    expect(actionForKey('')).toBeNull();
  });
});

describe('clearInput', () => {
  it('releases every held action', () => {
    const input = createInputState();
    input.forward = true;
    input.sprint = true;
    input.rotateRight = true;
    clearInput(input);
    expect(input).toEqual(createInputState());
  });
});
