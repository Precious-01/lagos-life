# Lagos Life

A browser-first 3D life simulator inspired by Lagos. Built with React, TypeScript, Vite,
Three.js (React Three Fiber), Zustand and Vitest.

**Status: Phase 2: walking around.** A placeholder district renders in 3D. You can walk a
placeholder character with the keyboard, with a third-person follow camera, collisions with
buildings and the district edge, and camera collision so the camera never passes through a wall.
No economy, transport or multiplayer systems exist yet.

## Requirements

- Node.js 20 or newer
- npm

## Controls

| Key                | Action                  |
| ------------------ | ----------------------- |
| W A S D or arrows  | Walk (relative to the camera) |
| Shift              | Sprint                  |
| Q / E              | Turn the camera         |

Touch controls are not implemented yet.

## Commands

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm install`       | Install dependencies                          |
| `npm run dev`       | Start the dev server (http://localhost:5173)  |
| `npm run typecheck` | Strict TypeScript check                       |
| `npm run lint`      | ESLint                                        |
| `npm run test`      | Run unit tests once                           |
| `npm run check`     | Typecheck + lint + tests                      |
| `npm run build`     | Typecheck, then production build into `dist/` |
| `npm run preview`   | Serve the production build locally            |
| `npm run format`    | Format all files with Prettier                |

## Structure

- `src/game/`: pure game logic (no React / Three.js). Fully unit-tested. Includes the district
  generator, player movement, collision, input bindings and camera maths.
- `src/state/`: shared Zustand store (title screen vs exploring).
- `src/scene/`: React Three Fiber components (the 3D world, the player and the camera rig).
- `src/ui/`: HTML overlays and fallbacks.
- `src/lib/`: small browser utilities.

Per-frame data (player position, camera) lives in plain objects inside `PlayerRig`, not in React
state, so nothing re-renders every frame.

## Deployment (Vercel)

Static Vite app. Import the GitHub repo in Vercel and use: Framework Preset **Vite**,
Build Command `npm run build`, Output Directory `dist`. No environment variables are needed.

## Roadmap

Later phases add: interactions, economy, inventory, saving, and eventually multiplayer.
