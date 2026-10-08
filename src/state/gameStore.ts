import { create } from 'zustand';

/** 'intro' = title screen with auto-rotating camera. 'explore' = free camera control. */
export type GamePhase = 'intro' | 'explore';
/** 'loading' until the 3D canvas has created its renderer. */
export type SceneStatus = 'loading' | 'ready';

export interface GameState {
  phase: GamePhase;
  sceneStatus: SceneStatus;
  /** Switches to free exploration. Ignored until the scene is ready. */
  enterWorld: () => void;
  returnToTitle: () => void;
  markSceneReady: () => void;
}

export const useGameStore = create<GameState>()((set) => ({
  phase: 'intro',
  sceneStatus: 'loading',
  enterWorld: () =>
    set((state): Partial<GameState> => (state.sceneStatus === 'ready' ? { phase: 'explore' } : {})),
  returnToTitle: () => set({ phase: 'intro' }),
  markSceneReady: () => set({ sceneStatus: 'ready' }),
}));
