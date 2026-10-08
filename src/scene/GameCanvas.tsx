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
        camera={{ position: [90, 60, 90], fov: 50, near: 1, far: 2000 }}
        onCreated={() => markSceneReady()}
      >
        <World />
      </Canvas>
    </div>
  );
}
