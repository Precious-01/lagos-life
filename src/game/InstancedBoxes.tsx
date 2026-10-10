import { useLayoutEffect, useRef } from 'react';
import { Color, Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';

/** One box to draw. x/y/z are the CENTRE of the box. */
export interface BoxPart {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  /** CSS hex colour. */
  color: string;
  /** Rotation about the vertical axis, in radians. */
  rotationY?: number;
}

interface InstancedBoxesProps {
  boxes: readonly BoxPart[];
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Draws any number of coloured boxes as ONE instanced mesh (a single draw call).
 * The geometry and material are shared by every box.
 */
export function InstancedBoxes({
  boxes,
  castShadow = true,
  receiveShadow = true,
}: InstancedBoxesProps) {
  const meshRef = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) {
      return;
    }
    const matrix = new Matrix4();
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    const euler = new Euler();
    const color = new Color();

    boxes.forEach((box, index) => {
      euler.set(0, box.rotationY ?? 0, 0);
      quaternion.setFromEuler(euler);
      position.set(box.x, box.y, box.z);
      scale.set(box.width, box.height, box.depth);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, color.set(box.color));
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  }, [boxes]);

  if (boxes.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      // A new instance count needs a new mesh, so the key follows the count.
      key={boxes.length}
      ref={meshRef}
      args={[undefined, undefined, boxes.length]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
      // The street is small, so skipping culling is cheaper than keeping bounds in sync.
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
