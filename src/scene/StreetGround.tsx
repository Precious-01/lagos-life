import { useMemo } from 'react';
import type { StreetLayout } from '../game/street';
import type { Rect } from '../game/types';
import { InstancedBoxes, type BoxPart } from './InstancedBoxes';

interface StreetGroundProps {
  street: StreetLayout;
}

interface SlabProps {
  rect: Rect;
  y: number;
  color: string;
}

const SLAB_ROTATION: [number, number, number] = [-Math.PI / 2, 0, 0];

function Slab({ rect, y, color }: SlabProps) {
  return (
    <mesh rotation={SLAB_ROTATION} position={[rect.x, y, rect.z]} receiveShadow>
      <planeGeometry args={[rect.width, rect.depth]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

const KERB_COLOR = '#c9c2b2';
const LINE_COLOR = '#e8e4d8';

function markingBoxes(street: StreetLayout): BoxPart[] {
  const { road, sidewalks } = street.surfaces;
  const boxes: BoxPart[] = [];

  // Dashed centre line.
  const dashLength = 2.2;
  const dashPitch = 4;
  const firstDash = road.x - road.width / 2 + 2;
  for (let x = firstDash; x < road.x + road.width / 2 - 1; x += dashPitch) {
    boxes.push({ x, y: 0.035, z: road.z, width: dashLength, height: 0.03, depth: 0.18, color: LINE_COLOR });
  }

  // Solid edge lines and kerbs, on both sides.
  for (const side of [-1, 1]) {
    boxes.push({
      x: road.x,
      y: 0.035,
      z: road.z + side * (road.depth / 2 - 0.6),
      width: road.width,
      height: 0.03,
      depth: 0.15,
      color: LINE_COLOR,
    });
  }
  for (const sidewalk of sidewalks) {
    const towardsRoad = sidewalk.z < road.z ? 1 : -1;
    boxes.push({
      x: sidewalk.x,
      y: 0.06,
      z: sidewalk.z + (towardsRoad * (sidewalk.depth - 0.24)) / 2,
      width: sidewalk.width,
      height: 0.12,
      depth: 0.24,
      color: KERB_COLOR,
    });
  }
  return boxes;
}

/**
 * Terrain, alley yard, road, sidewalks, kerbs and lane markings.
 * Layers sit a few centimetres apart so they never fight over the same pixels.
 */
export function StreetGround({ street }: StreetGroundProps) {
  const markings = useMemo(() => markingBoxes(street), [street]);
  const { road, sidewalks } = street.surfaces;

  return (
    <group>
      <Slab rect={{ x: 0, z: 0, width: 800, depth: 800 }} y={-0.05} color="#a8966c" />
      <Slab rect={street.bounds} y={0} color="#8d8576" />
      <Slab rect={road} y={0.02} color="#2c2f34" />
      {sidewalks.map((sidewalk) => (
        <Slab key={sidewalk.z} rect={sidewalk} y={0.03} color="#a39d90" />
      ))}
      <InstancedBoxes boxes={markings} castShadow={false} />
    </group>
  );
}
