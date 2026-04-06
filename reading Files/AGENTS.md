# Agent Instructions

## Package Manager
- Use npm with `package-lock.json`: `npm install`, `npm run dev`, `npm run build`

## Commands
| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Typecheck | `npm run typecheck` |
| Lint project | `npm run lint` |
| Lint file | `npx eslint path/to/file.tsx` |
| Production build | `npm run build` |

## Commit Attribution
AI commits MUST include:
```
Co-Authored-By: (the agent model's name and attribution byline)
```

## Tech Stack
- Vite + React + TypeScript
- Three.js via `@react-three/fiber` and `@react-three/drei`
- Zustand game state, without persist middleware
- Firebase Firestore signaling + pure WebRTC DataChannel
- Pure CSS terminal/minigame UI

## Project Rules
- Do not reference or reintroduce PeerJS.
- Do not use `localStorage` or `sessionStorage`.
- Do not commit real Firebase secrets; use `VITE_FIREBASE_*` env vars.
- Keep `firebase.json`, `.env*`, `node_modules/`, and `.DS_Store` ignored.
- Do not add paid API services.
- Do not load external `.glb` or `.gltf` assets; ship geometry is procedural.
- Do not leave `console.log()` in production code.

## Current Gameplay Contracts
- Astronaut minigames open only through the keyboard hotkey `[E]` near a panel.
- 3D panel mouse/click handlers must not open minigames.
- Closing a minigame returns camera control through `src/astronaut/shipCameraControl.ts`; no extra viewport click is required.
- Chat typing disables camera look until typing ends.
- Minigame success uses `onSuccess`, repairs the system, then closes after a short success delay.

## Reference Docs
- `reading Files/progress.md`: current implementation and verification state.
- `reading Files/last-signal-gdd.md`: design source of truth.
