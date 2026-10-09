import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { DirectionalLight } from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

interface LightingProps {
  /** Half-width of the area (in world units) that must receive shadows. */
  shadowExtent: number;
}

const SUN_POSITION: [number, number, number] = [60, 90, 40];

export function Lighting({ shadowExtent }: LightingProps) {
  const sunRef = useRef<DirectionalLight>(null);

  const sky = useMemo(() => {
    const mesh = new Sky();
    // Must stay inside the camera far plane (2000) when the camera is near the origin.
    mesh.scale.setScalar(1500);
    const uniforms = mesh.material.uniforms;
    uniforms.turbidity.value = 6;
    uniforms.rayleigh.value = 1.5;
    uniforms.mieCoefficient.value = 0.005;
    uniforms.mieDirectionalG.value = 0.8;
    uniforms.sunPosition.value.set(...SUN_POSITION);
    return mesh;
  }, []);

  useEffect(() => {
    return () => {
      sky.geometry.dispose();
      sky.material.dispose();
    };
  }, [sky]);

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
      <primitive object={sky} />
      <hemisphereLight args={['#bcd7ff', '#8b7d5a', 0.8]} />
      <directionalLight ref={sunRef} position={SUN_POSITION} intensity={2.5} castShadow />
    </>
  );
}
