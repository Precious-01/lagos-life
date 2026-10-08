import type { District } from '../game/types';

interface GroundProps {
  district: District;
}

const GROUND_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

export function Ground({ district }: GroundProps) {
  return (
    <group>
      {/* Wide sandy terrain around the district. Sits slightly below the road surface. */}
      <mesh rotation={GROUND_ROTATION} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[800, 800]} />
        <meshStandardMaterial color="#b9a77e" roughness={1} />
      </mesh>

      {/* Asphalt covering the whole district; blocks sit on top of it, leaving roads visible. */}
      <mesh rotation={GROUND_ROTATION} receiveShadow>
        <planeGeometry args={[district.width, district.depth]} />
        <meshStandardMaterial color="#2c2f34" roughness={0.95} />
      </mesh>

      {/* Raised pavement slab for each city block. */}
      {district.blocks.map((block) => (
        <mesh key={`${block.x}:${block.z}`} position={[block.x, 0.1, block.z]} receiveShadow>
          <boxGeometry args={[block.width, 0.2, block.depth]} />
          <meshStandardMaterial color="#8a8578" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
