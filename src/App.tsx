import { useState } from 'react';
import { isWebGLAvailable } from './lib/webgl';
import { GameCanvas } from './scene/GameCanvas';
import { useGameStore } from './state/gameStore';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { FallbackMessage } from './ui/FallbackMessage';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/LoadingScreen';
import { TitleOverlay } from './ui/TitleOverlay';

function GameScreen() {
  const phase = useGameStore((state) => state.phase);
  const sceneStatus = useGameStore((state) => state.sceneStatus);

  return (
    <div className="app">
      <GameCanvas />
      {sceneStatus === 'loading' && <LoadingScreen />}
      {sceneStatus === 'ready' && phase === 'intro' && <TitleOverlay />}
      {sceneStatus === 'ready' && phase === 'explore' && <Hud />}
    </div>
  );
}

export function App() {
  const [webglAvailable] = useState(isWebGLAvailable);

  if (!webglAvailable) {
    return (
      <FallbackMessage
        title="3D graphics unavailable"
        message="Your browser or device could not start WebGL, which Lagos Life needs. Try a current version of Chrome, Edge, Firefox or Safari, and make sure hardware acceleration is enabled."
      />
    );
  }

  return (
    <ErrorBoundary
      fallback={(error) => (
        <FallbackMessage
          title="Something went wrong"
          message="The game hit an unexpected error while drawing the world."
          details={error.message}
        />
      )}
    >
      <GameScreen />
    </ErrorBoundary>
  );
}
