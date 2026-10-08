import { useLayoutEffect, useRef } from 'react';
import { Color, Matrix4, type InstancedMesh } from 'three';
import type { BuildingSpec } from '../game/types';

interface BuildingsProps {
  buildings: readonly BuildingSpec[];
}

/**
 * All buildings are drawn as ONE instanced box mesh (a single draw call).
 * Each instance is a unit cube scaled to the building's footprint and height.
 */
export function Buildings({ buildings }: BuildingsProps) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new Matrix4();
    const color = new Color();

    buildings.forEach((building, index) => {
      matrix.makeScale(building.width, building.height, building.depth);
      matrix.setPosition(building.x, building.height / 2, building.z);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.set(building.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [buildings]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, buildings.length]}
      castShadow
      receiveShadow
      // The scene is small, so skipping culling is cheaper than keeping bounds in sync.
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
