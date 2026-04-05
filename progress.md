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
