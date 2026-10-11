import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import { advanceClock, type GameClock } from '../economy/clock';
import { DEFAULT_FOLLOW_CAMERA, damp, orbitCameraGoal, updateCameraYaw } from '../game/camera';
import type { CameraGoal, Vec3 } from '../game/camera';
import {
  DEFAULT_ORBIT_VIEW,
  applyLookDelta,
  applyZoom,
  orbitFollowGoal,
  type OrbitView,
} from '../game/cameraControl';
import { constrainCameraGoal } from '../game/cameraCollision';
import type { Collider } from '../game/collider';
import type { Vec2 } from '../game/collision';
import { evaluateInteractions, type InteractionPoint } from '../game/interaction';
import {
  createPlayer,
  stepPlayer,
  type MovementContext,
  type PlayerState,
} from '../game/player';
import type { Rect } from '../game/types';
import { useEconomyStore } from '../state/economyStore';
import { useGameStore } from '../state/gameStore';
import { PlayerAvatar } from './PlayerAvatar';
import { useInteractionKeys } from './useInteractionKeys';
import { useKeyboardInput } from './useKeyboardInput';
import { usePointerCamera } from './usePointerCamera';

interface PlayerRigProps {
  /** Everything solid. The player collides with all of it. */
  colliders: readonly Collider[];
  bounds: Rect;
  spawn: Vec2;
  /** Direction the player faces on spawn, in radians. */
  spawnHeading: number;
  /** Places the player can use. See game/interaction.ts. */
  interactions: readonly InteractionPoint[];
}

/** Everything that changes every frame lives here, in a plain object, not in React state. */
interface Simulation {
  player: PlayerState;
  /** The player's chosen camera angle and distance. See game/cameraControl.ts. */
  view: OrbitView;
  introAngle: number;
  walkPhase: number;
  /** The smoothed point the camera is looking at. */
  look: Vec3;
  /** The game clock, including the fraction of a minute. The store only gets whole minutes. */
  clock: GameClock;
}

const INTRO_RADIUS = 75;
const INTRO_HEIGHT = 38;
/** Starts the title-screen orbit where the canvas camera starts, so there is no jump. */
const INTRO_START_ANGLE = Math.PI / 4;
const INTRO_SPEED = 0.1;
/** Camera smoothing: higher is snappier. */
const INTRO_LAMBDA = 3;
const FOLLOW_LAMBDA = 8;
/** Longest frame the camera and player will simulate, in seconds (for example after a tab switch). */
const MAX_FRAME_SECONDS = 0.1;
const WALK_BOB_RATE = 1.8;
const WALK_BOB_HEIGHT = 0.06;
/** When the camera is closer than this to the player's head, the avatar is hidden. */
const AVATAR_HIDE_DISTANCE = 1.2;

/**
 * Owns the player, the camera and the game clock driver, and is the ONLY thing that moves the camera.
 * Title screen = slow automatic orbit, with the game paused.
 * Explore = third-person follow camera with mouse look, zoom and collision. While a management panel
 * is open the player is frozen and the clock does not advance.
 */
export function PlayerRig({ colliders, bounds, spawn, spawnHeading, interactions }: PlayerRigProps) {
  const phase = useGameStore((state) => state.phase);
  const exploringPhase = phase === 'explore';
  const keys = useKeyboardInput(exploringPhase);
  const pointer = usePointerCamera(exploringPhase);
  useInteractionKeys(exploringPhase);
  const avatarRef = useRef<Group>(null);

  const movement = useMemo<MovementContext>(
    () => ({ obstacles: colliders, bounds }),
    [colliders, bounds],
  );

  // The camera only collides with big solid things. Thin fences, poles and palms would make it
  // jerk in and out as it swings past them.
  const cameraObstacles = useMemo(
    () =>
      colliders.filter(
        (collider) =>
          collider.kind === 'building' || collider.kind === 'vehicle' || collider.kind === 'kiosk',
      ),
    [colliders],
  );

  const [simulation] = useState<Simulation>(() => ({
    player: createPlayer(spawn, spawnHeading),
    view: { ...DEFAULT_ORBIT_VIEW, yaw: spawnHeading },
    introAngle: INTRO_START_ANGLE,
    walkPhase: 0,
    look: { x: 0, y: 0, z: 0 },
    clock: useEconomyStore.getState().clock,
  }));

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_FRAME_SECONDS);
    const exploring = useGameStore.getState().phase === 'explore';

    let goal: CameraGoal;
    let lambda: number;
    if (exploring) {
      const economy = useEconomyStore.getState();
      const panelOpen = economy.panel !== 'none';

      // Read and clear the mouse movement collected since the last frame.
      let view = applyLookDelta(simulation.view, pointer.lookX, pointer.lookY);
      view = applyZoom(view, pointer.wheel);
      pointer.lookX = 0;
      pointer.lookY = 0;
      pointer.wheel = 0;

      if (panelOpen) {
        // Frozen: no keyboard camera turn, no walking, and the walking bob stops.
        if (simulation.player.speed !== 0) {
          simulation.player = { ...simulation.player, speed: 0 };
        }
      } else {
        // Q and E also turn the camera.
        view = {
          ...view,
          yaw: updateCameraYaw(view.yaw, keys, dt, DEFAULT_FOLLOW_CAMERA.rotateRate),
        };
        simulation.player = stepPlayer(simulation.player, keys, view.yaw, dt, movement);
      }
      simulation.view = view;

      goal = orbitFollowGoal(simulation.player, view, DEFAULT_FOLLOW_CAMERA.lookHeight);
      lambda = FOLLOW_LAMBDA;

      // What is the player near? The store ignores this call when nothing has changed.
      const status = evaluateInteractions(interactions, simulation.player);
      economy.setPrompt(status.prompt === null ? null : status.prompt.point, status.atSellingSpot);

      // Run the game clock. It is paused while a panel is open. The store only hears about
      // whole finished minutes, a few times a second, never every frame.
      const advance = advanceClock(simulation.clock, dt, economy.clockConfig, panelOpen);
      simulation.clock = advance.clock;
      if (advance.completed.length > 0) {
        economy.applyMinutes(advance.completed, status.atSellingSpot, advance.clock);
      }
    } else {
      simulation.introAngle += dt * INTRO_SPEED;
      goal = orbitCameraGoal({ x: 0, z: 0 }, simulation.introAngle, INTRO_RADIUS, INTRO_HEIGHT);
      lambda = INTRO_LAMBDA;
    }

    const camera = state.camera;
    const smoothed: Vec3 = {
      x: damp(camera.position.x, goal.position.x, lambda, dt),
      y: damp(camera.position.y, goal.position.y, lambda, dt),
      z: damp(camera.position.z, goal.position.z, lambda, dt),
    };
    const look = simulation.look;
    look.x = damp(look.x, goal.target.x, lambda, dt);
    look.y = damp(look.y, goal.target.y, lambda, dt);
    look.z = damp(look.z, goal.target.z, lambda, dt);

    // Collision runs AFTER smoothing, so the camera can never glide through a wall while easing.
    const finalPosition = exploring
      ? constrainCameraGoal({ position: smoothed, target: goal.target }, cameraObstacles).position
      : smoothed;

    camera.position.set(finalPosition.x, finalPosition.y, finalPosition.z);
    camera.lookAt(look.x, look.y, look.z);

    const avatar = avatarRef.current;
    if (avatar) {
      const player = simulation.player;
      simulation.walkPhase += player.speed * dt * WALK_BOB_RATE;
      const bob = player.speed > 0 ? Math.abs(Math.sin(simulation.walkPhase)) * WALK_BOB_HEIGHT : 0;
      avatar.position.set(player.x, bob, player.z);
      avatar.rotation.y = player.heading;

      const cameraDistance = Math.hypot(
        finalPosition.x - goal.target.x,
        finalPosition.y - goal.target.y,
        finalPosition.z - goal.target.z,
      );
      avatar.visible = !exploring || cameraDistance > AVATAR_HIDE_DISTANCE;
    }
  });

  return <PlayerAvatar groupRef={avatarRef} />;
}
