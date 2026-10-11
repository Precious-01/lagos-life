import type { InteractionPoint } from '../game/interaction';
import { useEconomyStore } from '../state/economyStore';

interface InteractionMarkersProps {
  points: readonly InteractionPoint[];
}

const FLAT: [number, number, number] = [-Math.PI / 2, 0, 0];

/**
 * Flat markers on the ground: a ring where to stand for each press point, and a green zone for the
 * selling spot that brightens while the player is inside it. Drawn just above the pavement.
 */
export function InteractionMarkers({ points }: InteractionMarkersProps) {
  const atSellingSpot = useEconomyStore((state) => state.atSellingSpot);

  return (
    <group>
      {points.map((point) =>
        point.activation === 'zone' ? (
          <mesh key={point.id} position={[point.area.x, 0.05, point.area.z]} rotation={FLAT}>
            <planeGeometry args={[point.area.width, point.area.depth]} />
            <meshBasicMaterial
              color="#3fb26b"
              transparent
              opacity={atSellingSpot ? 0.45 : 0.22}
              depthWrite={false}
            />
          </mesh>
        ) : (
          <mesh key={point.id} position={[point.standAt.x, 0.06, point.standAt.z]} rotation={FLAT}>
            <ringGeometry args={[0.55, 0.8, 32]} />
            <meshBasicMaterial
              color={point.kind === 'supplier' ? '#f2c200' : '#8fb8d8'}
              transparent
              opacity={0.85}
              depthWrite={false}
            />
          </mesh>
        ),
      )}
    </group>
  );
}
