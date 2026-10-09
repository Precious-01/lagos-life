/** Which game actions are currently held down. Mutated in place by the keyboard hook. */
export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  rotateLeft: boolean;
  rotateRight: boolean;
}

export type InputAction = keyof InputState;

/**
 * Bindings use KeyboardEvent.code (the physical key position), so WASD stays in the same
 * place on non-QWERTY keyboard layouts.
 */
const KEY_BINDINGS = new Map<string, InputAction>([
  ['KeyW', 'forward'],
  ['ArrowUp', 'forward'],
  ['KeyS', 'backward'],
  ['ArrowDown', 'backward'],
  ['KeyA', 'left'],
  ['ArrowLeft', 'left'],
  ['KeyD', 'right'],
  ['ArrowRight', 'right'],
  ['ShiftLeft', 'sprint'],
  ['ShiftRight', 'sprint'],
  ['KeyQ', 'rotateLeft'],
  ['KeyE', 'rotateRight'],
]);

export function createInputState(): InputState {
  return {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    rotateLeft: false,
    rotateRight: false,
  };
}

/** Returns the action bound to a key code, or null when the key does nothing. */
export function actionForKey(code: string): InputAction | null {
  return KEY_BINDINGS.get(code) ?? null;
}

/** Releases every action. Used when the window loses focus so keys cannot get "stuck". */
export function clearInput(input: InputState): void {
  Object.assign(input, createInputState());
}
