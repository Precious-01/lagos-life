import { OrbitControls } from '@react-three/drei';
import { useGameStore } from '../state/gameStore';

/**
 * Phase 1 camera: slow auto-orbit on the title screen, free orbit/zoom/pan when exploring.
 * A later phase replaces this component with a third-person follow camera.
 */
export function CameraRig() {
  const phase = useGameStore((state) => state.phase);

  return (
    <OrbitControls
      makeDefault
      target={[0, 0, 0]}
      autoRotate={phase === 'intro'}
      autoRotateSpeed={0.6}
      enablePan={phase === 'explore'}
      enableDamping
      minDistance={10}
      maxDistance={220}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  );
}
