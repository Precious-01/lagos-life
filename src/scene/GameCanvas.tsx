import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../state/gameStore';
import { World } from './World';

export function GameCanvas() {
  const markSceneReady = useGameStore((state) => state.markSceneReady);

  return (
    <div className="canvas-host">
      <Canvas
        shadows
        dpr={[1, 2]}
        // A small near plane lets the camera sit close to the player when a wall is behind them.
        camera={{ position: [90, 60, 90], fov: 50, near: 0.2, far: 2000 }}
        onCreated={() => markSceneReady()}
      >
        <World />
      </Canvas>
    </div>
  );
}
