import { facadeFeatures, type FacadeFeatureType } from '../game/facade';
import {
  GROUND_FLOOR_HEIGHT,
  UPPER_FLOOR_HEIGHT,
  type RoofStyle,
  type StreetBuildingSpec,
} from '../game/street';
import type { BoxPart } from './InstancedBoxes';

/** Boxes split by whether they should cast shadows. */
export interface BuildingParts {
  /** Walls, bands, roofs and awnings. */
  structure: BoxPart[];
  /** Windows, doors, openings and signboards. Thin details that do not need shadows. */
  details: BoxPart[];
}

const AWNING_COLORS = ['#c8553d', '#2f7f6a', '#e0a020', '#3a5f9a'] as const;
const PLINTH_COLOR = '#5c5750';

const DETAIL_COLORS: Record<Exclude<FacadeFeatureType, 'awning'>, string> = {
  window: '#2a3a4a',
  'shop-opening': '#2b2420',
  door: '#4a2f22',
  signboard: '#243b4a',
};

interface RoofTier {
  widthScale: number;
  depthScale: number;
  height: number;
}

/** Stepped roof blocks. Real rooflines come in a later batch. */
const ROOF_TIERS: Record<RoofStyle, readonly RoofTier[]> = {
  flat: [{ widthScale: 1, depthScale: 1, height: 0.4 }],
  corrugated: [
    { widthScale: 1, depthScale: 1, height: 0.3 },
    { widthScale: 0.92, depthScale: 0.7, height: 0.45 },
  ],
  hipped: [
    { widthScale: 1, depthScale: 1, height: 0.3 },
    { widthScale: 0.75, depthScale: 0.75, height: 0.8 },
    { widthScale: 0.45, depthScale: 0.45, height: 0.8 },
  ],
};

export function buildingBoxes(buildings: readonly StreetBuildingSpec[]): BuildingParts {
  const structure: BoxPart[] = [];
  const details: BoxPart[] = [];

  buildings.forEach((building, index) => {
    structure.push({
      x: building.x,
      y: building.height / 2,
      z: building.z,
      width: building.width,
      height: building.height,
      depth: building.depth,
      color: building.wallColor,
    });

    // Dark plinth at the foot of the wall.
    structure.push({
      x: building.x,
      y: 0.2,
      z: building.z,
      width: building.width + 0.1,
      height: 0.4,
      depth: building.depth + 0.1,
      color: PLINTH_COLOR,
    });

    // A band at every floor line, plus the top edge.
    for (let line = 0; line < building.floors - 1; line += 1) {
      structure.push({
        x: building.x,
        y: GROUND_FLOOR_HEIGHT + line * UPPER_FLOOR_HEIGHT,
        z: building.z,
        width: building.width + 0.12,
        height: 0.2,
        depth: building.depth + 0.12,
        color: building.trimColor,
      });
    }
    structure.push({
      x: building.x,
      y: building.height - 0.1,
      z: building.z,
      width: building.width + 0.12,
      height: 0.2,
      depth: building.depth + 0.12,
      color: building.trimColor,
    });

    // Roof tiers, stacked on top.
    let roofBase = building.height;
    for (const tier of ROOF_TIERS[building.roofStyle]) {
      structure.push({
        x: building.x,
        y: roofBase + tier.height / 2,
        z: building.z,
        width: (building.width + 0.3) * tier.widthScale,
        height: tier.height,
        depth: (building.depth + 0.3) * tier.depthScale,
        color: building.roofColor,
      });
      roofBase += tier.height;
    }

    for (const feature of facadeFeatures(building)) {
      const box = {
        x: feature.x,
        y: feature.y,
        z: feature.z,
        width: feature.width,
        height: feature.height,
        depth: feature.depth,
      };
      if (feature.type === 'awning') {
        structure.push({ ...box, color: AWNING_COLORS[index % AWNING_COLORS.length] });
      } else {
        details.push({ ...box, color: DETAIL_COLORS[feature.type] });
      }
    }
  });

  return { structure, details };
}
