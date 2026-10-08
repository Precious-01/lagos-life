import { Sky } from '@react-three/drei';
import { useLayoutEffect, useRef } from 'react';
import type { DirectionalLight } from 'three';

interface LightingProps {
  /** Half-width of the area (in world units) that must receive shadows. */
  shadowExtent: number;
}

const SUN_POSITION: [number, number, number] = [60, 90, 40];

export function Lighting({ shadowExtent }: LightingProps) {
  const sunRef = useRef<DirectionalLight>(null);

  useLayoutEffect(() => {
    const sun = sunRef.current;
    if (!sun) {
      return;
    }
    sun.shadow.mapSize.set(2048, 2048);
    const shadowCamera = sun.shadow.camera;
    shadowCamera.left = -shadowExtent;
    shadowCamera.right = shadowExtent;
    shadowCamera.top = shadowExtent;
    shadowCamera.bottom = -shadowExtent;
    shadowCamera.near = 1;
    shadowCamera.far = 300;
    shadowCamera.updateProjectionMatrix();
  }, [shadowExtent]);

  return (
    <>
      <Sky sunPosition={SUN_POSITION} turbidity={6} rayleigh={1.5} />
      <hemisphereLight args={['#bcd7ff', '#8b7d5a', 0.8]} />
      <directionalLight ref={sunRef} position={SUN_POSITION} intensity={2.5} castShadow />
    </>
  );
}
