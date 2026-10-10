import { useMemo } from 'react';
import type { StreetBuildingSpec } from '../game/street';
import { buildingBoxes } from './buildingParts';
import { InstancedBoxes } from './InstancedBoxes';

interface StreetBuildingsProps {
  buildings: readonly StreetBuildingSpec[];
}

export function StreetBuildings({ buildings }: StreetBuildingsProps) {
  const parts = useMemo(() => buildingBoxes(buildings), [buildings]);

  return (
    <>
      <InstancedBoxes boxes={parts.structure} />
      <InstancedBoxes boxes={parts.details} castShadow={false} />
    </>
  );
}
