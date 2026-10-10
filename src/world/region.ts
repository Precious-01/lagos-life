import type { Rect } from '../game/types';
import type { LonLat } from './projection';
import { createWorldFrame } from './worldFrame';

export interface RegionDefinition {
  id: string;
  name: string;
  /** The world frame's origin, and the middle of the region, in degrees. */
  origin: LonLat;
  /** East-west extent in metres. */
  widthM: number;
  /** North-south extent in metres. */
  depthM: number;
  /** False until the box has been checked against OpenStreetMap. */
  verified: boolean;
}

/**
 * PROVISIONAL. The origin is an approximate point near Ebute Metta and Yaba. It has NOT been checked
 * against OpenStreetMap yet; Milestone 1b verifies and, if needed, moves it.
 *
 * Known limit: 6 km north to south cannot hold both the southern shore of Lagos Island and the
 * northern part of Yaba. This box favours Ebute Metta, Yaba and the northern half of the Island.
 * A taller box (for example 8 km wide by 10 km deep) is an option to decide in 1b.
 */
export const LAGOS_ISLAND_YABA_REGION: RegionDefinition = {
  id: 'lagos-island-yaba',
  name: 'Lagos Island, Ebute Metta and Yaba',
  origin: { lon: 3.385, lat: 6.485 },
  widthM: 8000,
  depthM: 6000,
  verified: false,
};

export const REGION_FRAME = createWorldFrame(LAGOS_ISLAND_YABA_REGION.origin);

/** The region as a rectangle in world metres. It is centred on the world origin. */
export function regionBounds(region: RegionDefinition): Rect {
  return { x: 0, z: 0, width: region.widthM, depth: region.depthM };
}
