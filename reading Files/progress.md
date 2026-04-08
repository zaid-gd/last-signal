# Last Signal Progress

## Original Objective
- Secure the Firebase setup after Firebase config was committed.
- Replace PeerJS with Firebase Firestore signaling plus pure WebRTC P2P.
- Keep the project on free services and environment-based configuration.

## Security And Config
- Verified `firebase.json` is not present in this checkout.
- Added ignore coverage for `firebase.json`, `.env*`, `node_modules/`, and `.DS_Store`.
- Added local Firebase env placeholders for `VITE_FIREBASE_*` values.
- Firebase config is expected through `import.meta.env`.
- Vercel deployments must mirror all `VITE_*` values in Project Settings -> Environment Variables.

## Network Layer
- Replaced the old P2P helper with `src/network/P2PManager.ts`.
- PeerJS has been removed from the app contract; do not reintroduce it.
- Signaling uses Firebase Firestore room documents with 6-character alphanumeric room codes.
- Transport after handshake is pure WebRTC DataChannel.
- The 10-second receive delay belongs in the network layer, not the screens.
- Added ICE candidate queueing, candidate-type diagnostics, connection-state diagnostics, and host-side ICE restart handling.
- Joiner answer flow now flushes remote ICE only after both local and remote descriptions are ready.
- Current ICE fallback servers include Google STUN, Cloudflare STUN, and Metered STUN.

## Gameplay And State
- `src/stores/useGameStore.ts` tracks system health, active minigame, nearest panel, and minigame close cooldown state.
- Timed degradation and crisis behavior were stabilized in the game loop and crisis engine.
- Minigame success callbacks now repair their target system and close after a short success delay.
- HUD warnings and mission-control readouts reflect current system health.
- Chat typing disables camera look while the input is active.

## Astronaut Ship View
- Ship geometry remains procedural in `src/astronaut/ShipCanvas.tsx`.
- Current corridor is Gemini's dark industrial procedural layout with generated grid textures, panels, floor/ceiling/walls, ribs, pipes, fill lights, spotlights, and emergency lighting.
- The astronaut black-screen regression was addressed by removing only the fragile `@react-three/postprocessing` composer layer from the ship canvas; Gemini's scene geometry, procedural textures, lighting, fog, material colors, and HUD styling remain in place.
- **Dynamic Environmental State System**:
  - Implemented `src/game/EnvironmentManager.ts` to calculate environment severity (nominal, warning, critical, endgame).
  - Severity scales with average system health, minimum system health, active crisis intensity, and game time.
  - Visuals in `ShipCanvas.tsx` dynamically transition ambient colors, spot intensities, fog density, and bloom intensity.
  - Audio in `AudioEngine.ts` responds with ambient hum shifts and alarm frequency changes.
  - Transitions are smooth (lerped) and rely on existing store variables.
- `PointerLockControls` from Drei owns camera look.
- Movement is WASD, with camera rotation from pointer lock.
- Nearest-panel detection drives the HUD prompt.
- Panels are not mouse-click activators; minigames open only with `[E]` near a panel.

## Minigames And Cursor Control
- Active minigames render in `src/components/AstronautScreen.tsx`.
- Opening a minigame exits pointer lock and shows the cursor.
- Closing a minigame uses `flushSync` to clear `activeMiniGame`, then requests camera control again.
- The current camera reacquire path uses `src/astronaut/shipCameraControl.ts` to reconnect the live Drei controls instance before calling `lock()`.
- This avoids the bad state where the browser hides the cursor but the camera controls miss `pointerlockchange`.
- The clicking/pointer-lock flow is verified working: 3D panel clicks no longer open minigames, `[E]` opens panels, and closing a minigame returns camera control without another viewport click.

## Minigame Modules
- Hull: `SealSequence`
- Life support: `PowerRouter`
- Power: `BreakerPanel`
- Navigation: `NavKeypad`
- Comms: `AntennaWheel`
- Each minigame accepts `onClose`; repaired flows also use `onSuccess`.

## Verification
- Latest static verification after the astronaut render fix:
  - `npm run typecheck`: passed
  - `npm run lint`: passed
  - `npm run build`: passed
- Latest manual browser verification:
  - Panel clicking issue: fixed.
  - Camera control after minigame close: fixed.
- The user reported the UI flashed briefly before the screen went black; the current fix targets the post-processing frame layer that overlaps that symptom.
- Browser visual verification for the black-screen regression was not rerun with automation in this sandbox because the repo does not include Playwright.
- Build still reports existing warnings:
  - `caniuse-lite` is outdated.
  - Main JS chunk is larger than 500 kB after minification.

## Current Risks And Follow-Up
- Consider code-splitting minigames or Three.js-heavy routes to reduce the large Vite chunk warning.
- Consider updating Browserslist data when dependency maintenance is in scope.
