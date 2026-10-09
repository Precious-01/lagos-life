import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useGameStore } from '../state/gameStore';

/**
 * Phase 1 camera: slow auto-orbit on the title screen, free orbit/zoom/pan when exploring.
 * A later phase replaces this component with a third-person follow camera.
 */
export function CameraRig() {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);
  const controlsRef = useRef<OrbitControls | null>(null);

  useEffect(() => {
    const controls = new OrbitControls(camera, domElement);
    controls.target.set(0, 0, 0);
    controls.enableDamping = true;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 10;
    controls.maxDistance = 220;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.update();
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, domElement]);

  // Reads the game phase straight from the store each frame, so no React re-render is needed.
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) {
      return;
    }
    const inIntro = useGameStore.getState().phase === 'intro';
    controls.autoRotate = inIntro;
    controls.enablePan = !inIntro;
    controls.update();
  });

  return null;
}
