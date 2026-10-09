import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import type { Group } from 'three';
import {
  DEFAULT_FOLLOW_CAMERA,
  damp,
  followCameraGoal,
  orbitCameraGoal,
  updateCameraYaw,
  type CameraGoal,
  type Vec3,
} from '../game/camera';
import { constrainCameraGoal } from '../game/cameraCollision';
import {
  DEFAULT_PLAYER_CONFIG,
  createPlayer,
  findSpawnPoint,
  stepPlayer,
  type MovementContext,
  type PlayerState,
} from '../game/player';
import type { District } from '../game/types';
import { useGameStore } from '../state/gameStore';
import { PlayerAvatar } from './PlayerAvatar';
import { useKeyboardInput } from './useKeyboardInput';

interface PlayerRigProps {
  district: District;
}

/** Everything that changes every frame lives here, in a plain object, not in React state. */
interface Simulation {
  player: PlayerState;
  /** Direction the camera looks, in radians. See game/angles.ts for the convention. */
  yaw: number;
  introAngle: number;
  walkPhase: number;
  /** The smoothed point the camera is looking at. */
  look: Vec3;
}

const INTRO_RADIUS = 127;
const INTRO_HEIGHT = 60;
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
 * Owns the player and the camera. Replaces the Phase 1 orbit rig:
 * title screen = slow automatic orbit, explore = third-person follow camera with collision.
 */
export function PlayerRig({ district }: PlayerRigProps) {
  const phase = useGameStore((state) => state.phase);
  const input = useKeyboardInput(phase === 'explore');
  const avatarRef = useRef<Group>(null);

  const movement = useMemo<MovementContext>(
    () => ({ obstacles: district.buildings, bounds: district.bounds }),
    [district],
  );

  const [simulation] = useState<Simulation>(() => ({
    player: createPlayer(findSpawnPoint(movement, DEFAULT_PLAYER_CONFIG.radius)),
    yaw: 0,
    introAngle: INTRO_START_ANGLE,
    walkPhase: 0,
    look: { x: 0, y: 0, z: 0 },
  }));

  useFrame((state, delta) => {
    const dt = Math.min(delta, MAX_FRAME_SECONDS);
    const exploring = useGameStore.getState().phase === 'explore';

    let goal: CameraGoal;
    let lambda: number;
    if (exploring) {
      simulation.yaw = updateCameraYaw(simulation.yaw, input, dt, DEFAULT_FOLLOW_CAMERA.rotateRate);
      simulation.player = stepPlayer(simulation.player, input, simulation.yaw, dt, movement);
      goal = followCameraGoal(simulation.player, simulation.yaw);
      lambda = FOLLOW_LAMBDA;
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
      ? constrainCameraGoal({ position: smoothed, target: goal.target }, district.buildings)
          .position
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
