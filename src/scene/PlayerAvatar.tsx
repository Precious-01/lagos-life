import type { RefObject } from 'react';
import type { Group } from 'three';

interface PlayerAvatarProps {
  /** The rig moves this group every frame, so React never re-renders the avatar. */
  groupRef: RefObject<Group | null>;
}

/**
 * Placeholder character built from simple shapes. Its feet are at y = 0 and it faces +Z,
 * which matches heading 0 in the game logic.
 */
export function PlayerAvatar({ groupRef }: PlayerAvatarProps) {
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.3, 1.2, 12]} />
        <meshStandardMaterial color="#2f6f8f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.4, 0]} castShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color="#8a5a3c" roughness={0.8} />
      </mesh>
      {/* A small marker on the front so you can see which way the character faces. */}
      <mesh position={[0, 1.4, 0.22]} castShadow>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshStandardMaterial color="#f3efe6" roughness={0.8} />
      </mesh>
    </group>
  );
}
