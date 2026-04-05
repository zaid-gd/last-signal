## Tech stack
- Vite + React + TypeScript
- Firebase Firestore signaling + pure WebRTC DataChannel (PeerJS removed)
- Three.js (via @react-three/fiber) for Astronaut's 3D ship view
- Zustand for state (NO persist middleware — localStorage may be blocked)
- Pure CSS terminal UI for Mission Control screen

## Network layer (UPDATED — Phase 0)
- Signaling: Firebase Firestore (free tier)
- Transport: Pure WebRTC DataChannel (no PeerJS dependency)
- Room codes: Firestore document IDs (6-char alphanumeric)
- After handshake: fully P2P, Firestore no longer involved
- .env.local holds VITE_FIREBASE_API_KEY and related vars
- On Vercel: mirror all VITE_* vars in Project → Settings → Environment Variables

## NEVER
- Reference PeerJS — it has been replaced with Firebase Firestore + pure WebRTC
- Use localStorage or sessionStorage (may be blocked on Vercel preview)
- Use any paid API services
- Load external 3D asset files (.glb, .gltf) — all geometry must be procedural
- Use setTimeout for game timing — use Date.now() deltas and requestAnimationFrame
- Leave console.log() in any code going to production