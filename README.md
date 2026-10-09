# Lagos Life

A browser-first 3D life simulator inspired by Lagos. Built with React, TypeScript, Vite,
Three.js (React Three Fiber), Zustand and Vitest.

**Status: Phase 1: foundation.** A placeholder district renders in 3D with a free camera.
No gameplay systems exist yet.

## Requirements

- Node.js 20 or newer
- npm

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

- `src/game/`: pure game logic (no React / Three.js). Fully unit-tested.
- `src/state/`: shared Zustand store.
- `src/scene/`: React Three Fiber components (the 3D world).
- `src/ui/`: HTML overlays and fallbacks.
- `src/lib/`: small browser utilities.

## Deployment (Vercel)

Static Vite app. Import the GitHub repo in Vercel and use: Framework Preset **Vite**,
Build Command `npm run build`, Output Directory `dist`. No environment variables are needed.

## Roadmap

Later phases add: third-person controller and follow camera, collisions, interactions,
economy, inventory, saving, and eventually multiplayer.
