import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './gameStore';

beforeEach(() => {
  useGameStore.setState(useGameStore.getInitialState(), true);
});

describe('gameStore', () => {
  it('starts on the intro phase while loading', () => {
    const state = useGameStore.getState();
    expect(state.phase).toBe('intro');
    expect(state.sceneStatus).toBe('loading');
  });

  it('ignores enterWorld until the scene is ready', () => {
    useGameStore.getState().enterWorld();
    expect(useGameStore.getState().phase).toBe('intro');
  });

  it('enters the world once the scene is ready', () => {
    useGameStore.getState().markSceneReady();
    useGameStore.getState().enterWorld();
    expect(useGameStore.getState().phase).toBe('explore');
  });

  it('can return to the title screen', () => {
    useGameStore.getState().markSceneReady();
    useGameStore.getState().enterWorld();
    useGameStore.getState().returnToTitle();
    expect(useGameStore.getState().phase).toBe('intro');
  });
});
