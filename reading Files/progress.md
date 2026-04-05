Original prompt: You have a React/Vite game repo with Firebase config accidentally committed.

Immediate security fix:
1. Remove firebase.json from Git (git rm --cached firebase.json)
2. Add to .gitignore:
firebase.json
.env*
node_modules/
.DS_Store

3. Create .env.local with Firebase config loaded via import.meta.env.VITE_FIREBASE_*

Replace PeerJS with Firebase signaling + pure WebRTC P2P.

- Verified there is no `firebase.json` file in this checkout, so there was nothing to untrack from Git.
- Added `firebase.json`, `.env*`, `node_modules/`, and `.DS_Store` coverage in `.gitignore`.
- Added `.env.local` placeholder entries for the Firebase values so config can stay local.
- Replacing the old P2P helper with `src/network/P2PManager.ts` and moving the 10-second receive delay into the network layer.
- Replaced `src/signaling/P2PConnection.ts` with `src/network/P2PManager.ts`.
- Moved the 10-second receive delay out of the screens and into the networking layer.
- Verified `npm run typecheck` and `npm run build` pass after the refactor.
- Added distinct host/joiner waiting UI so the joiner no longer sees the host's "Share this Room ID" screen.
- Added candidate queueing, connection-state logs, and host-side ICE restart handling in `P2PManager`.
- Tightened the joiner answer flow so remote ICE candidates are only flushed after both local and remote descriptions are set; candidate logs now include the ICE candidate type to help diagnose `checking -> disconnected` failures.

## Critical Fixes Completed (Apr 5, 2026)

### ISSUE 1 — Ship Visuals (ShipCanvas.tsx)
- Removed ALL emissive properties and glowing materials from walls, floor, ceiling
- Set wall material: MeshStandardMaterial color=#1a1f2e roughness=0.8 metalness=0.3
- Set floor material: color=#0f1218 roughness=0.9 metalness=0.1
- Set ceiling material: color=#0d1018 roughness=0.9
- Removed bright/saturated blue LED strip lights entirely
- Replaced corridor lighting with:
  - ONE AmbientLight color=#112233 intensity=0.4 (very dim, dark atmosphere)
  - FOUR PointLights along ceiling: color=#334477 intensity=0.8 distance=6, evenly spaced
  - TWO emergency PointLights: color=#ff2222 intensity=0 distance=8 — pulse with Math.sin(clock.elapsedTime * 4) * 0.8 + 1.2 when any systemHealth < 50
- Result: Dark, cramped, industrial Alien 1979 aesthetic — barely lit

### ISSUE 2 — WebRTC Connection (P2PManager.ts)
- Replaced single STUN server with multiple fallback ICE servers:
  - stun:stun.l.google.com:19302
  - stun:stun1.l.google.com:19302
  - stun:stun.cloudflare.com:3478
  - stun:stun.relay.metered.ca:80
- Added reconnection logic: when connectionState === 'failed', wait 2 seconds then call restartIceNegotiation()

### ISSUE 3 — BreakerPanel Visibility (AstronautScreen.tsx + useGameStore.ts)
- Verified BreakerPanel only renders when activeMiniGame === 'power'
- Confirmed activeMiniGame: null is in store initial state
- Conditional rendering: {activeMiniGame === 'power' && <BreakerPanel />}

### ISSUE 4 — Ship Visual Redesign to Match Reference Image (ShipCanvas.tsx)
- Updated corridor dimensions: width=5, height=3.5 (more spacious industrial feel)
- New materials to match dark blue-grey metal reference:
  - Walls: color=#1e2838, metalness=0.4, roughness=0.7
  - Floor: color=#151a22, metalness=0.3, roughness=0.8
  - Ceiling: color=#0d1117, metalness=0.2, roughness=0.85
- Lighting redesign:
  - Ambient: color=#0a0f14, intensity=0.15 (very dark)
  - TWO SpotLights: color=#445566, intensity=2.5, narrow beams (angle=0.4, penumbra=0.3)
  - TWO Red warning lights: at corridor end (z=-9), pulse when health < 50
  - EIGHT Blue indicator point lights: 4 positions on each wall (z=-6, -2, 2, 6)
- Added visible blue glowing spheres on walls (emissiveIntensity=2):
  - 4 positions per wall, actual mesh spheres not just lights
  - color=#4488ff, roughness=0.2 for glossy look
- Updated SystemPanel components:
  - Detailed control panel with screen area
  - Green status light at top (emissive, changes color with health)
  - 5 keypad buttons below screen
  - Positioned at height 1.5 for visibility
- Result: Matches reference image with glowing blue wall indicators, focused spotlights, and detailed control panels
