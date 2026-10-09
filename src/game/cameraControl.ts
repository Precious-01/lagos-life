import { headingToDirection, normalizeAngle } from './angles';
import type { CameraGoal } from './camera';
import type { Vec2 } from './collision';

/** The player's chosen view of the player: where the camera sits on a sphere around them. */
export interface OrbitView {
  /** Direction the camera looks, in radians. 0 looks along +Z. See angles.ts. */
  yaw: number;
  /** Angle of the camera above the horizontal, in radians. 0 is level with the player's head. */
  pitch: number;
  /** Straight-line distance from the camera to the point it looks at, in metres. */
  distance: number;
}

export interface OrbitLimits {
  minPitch: number;
  maxPitch: number;
  minDistance: number;
  maxDistance: number;
}

export const DEFAULT_ORBIT_LIMITS: OrbitLimits = {
  minPitch: 0.12,
  maxPitch: 1.25,
  minDistance: 4,
  maxDistance: 16,
};

export const DEFAULT_ORBIT_VIEW: OrbitView = { yaw: 0, pitch: 0.4, distance: 10 };

/** Radians of rotation per pixel of mouse drag. */
export const DEFAULT_LOOK_SENSITIVITY = 0.005;
/** Zoom per unit of wheel delta. Exponential, so every notch changes the distance by the same ratio. */
export const DEFAULT_ZOOM_RATE = 0.001;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Applies a mouse drag. Dragging right turns the camera right; dragging down raises the camera.
 * Returns a new view and never mutates the old one.
 */
export function applyLookDelta(
  view: OrbitView,
  deltaX: number,
  deltaY: number,
  sensitivity: number = DEFAULT_LOOK_SENSITIVITY,
  limits: OrbitLimits = DEFAULT_ORBIT_LIMITS,
): OrbitView {
  return {
    yaw: normalizeAngle(view.yaw - deltaX * sensitivity),
    pitch: clamp(view.pitch + deltaY * sensitivity, limits.minPitch, limits.maxPitch),
    distance: view.distance,
  };
}

/** Applies a mouse wheel. A positive wheel delta (scrolling down) zooms out. */
export function applyZoom(
  view: OrbitView,
  wheelDelta: number,
  rate: number = DEFAULT_ZOOM_RATE,
  limits: OrbitLimits = DEFAULT_ORBIT_LIMITS,
): OrbitView {
  return {
    yaw: view.yaw,
    pitch: view.pitch,
    distance: clamp(
      view.distance * Math.exp(wheelDelta * rate),
      limits.minDistance,
      limits.maxDistance,
    ),
  };
}

/** Keeps a view inside the limits. */
export function clampView(view: OrbitView, limits: OrbitLimits = DEFAULT_ORBIT_LIMITS): OrbitView {
  return {
    yaw: normalizeAngle(view.yaw),
    pitch: clamp(view.pitch, limits.minPitch, limits.maxPitch),
    distance: clamp(view.distance, limits.minDistance, limits.maxDistance),
  };
}

/**
 * Where the camera wants to be for a given view. It looks at the player's head
 * (`lookHeight` metres up) from `view.distance` metres away, behind and above.
 */
export function orbitFollowGoal(player: Vec2, view: OrbitView, lookHeight: number): CameraGoal {
  const forward = headingToDirection(view.yaw);
  const horizontal = view.distance * Math.cos(view.pitch);
  return {
    position: {
      x: player.x - forward.x * horizontal,
      y: lookHeight + view.distance * Math.sin(view.pitch),
      z: player.z - forward.z * horizontal,
    },
    target: { x: player.x, y: lookHeight, z: player.z },
  };
}
