# LAST SIGNAL — Complete Game Design Document

### Vibe Jam 2026 · Asymmetric Multiplayer · Browser-First · 100% Free Stack

\---

## The Concept

> Two players. One is an astronaut on a crippled spaceship. One is Mission Control on Earth.
> There is a \*\*real 10-second communications delay\*\* between them.
> They must save the ship together — without ever being in sync.

**One-line pitch for judges:**
*"Multiplayer survival game where you and a partner are separated by a 10-second signal delay — like the real Mars missions."*

**Why this wins Vibe Jam 2026:**

* Multiplayer is **explicitly preferred** in the rules — scoring edge over solo games
* The delay mechanic is **the game** — not a gimmick on top of a game
* Completely original: zero prior browser games use signal delay as core mechanic
* Judges understand it in 3 seconds. They feel the tension immediately.
* It **couldn't have placed in 2025** — the technology and the AI tooling to build it fast weren't ready

\---

## Emotional Design Target

**Astronaut feels:** Alone. Urgent. Dependent on a voice that's always 10 seconds late.
**Mission Control feels:** Helpless. Analytical. Watching someone they care about struggle with outdated information.
**Both feel together:** The euphoria of a perfectly-timed solution that required inhuman coordination.

Reference feelings:

* Apollo 13's "Houston, we have a problem" — Mission Control hears bad news 10 seconds after it happened
* Firewatch's radio conversations — intimate, voice-only connection creates real care
* Keep Talking and Nobody Explodes — asymmetric information as the core mechanic

\---

## Visual References

|Reference|What to take|
|-|-|
|**Alien (1979) ship interior**|Cold utility, worn metal, CRT readouts, emergency red lighting|
|**NASA Mission Control 1969**|Green phosphor terminals, ticker paper, desk clusters, coffee cups|
|**Obra Dinn (Return of the Obra Dinn)**|1-bit / dithered aesthetic — high contrast, instantly readable, deeply atmospheric|
|**Papers Please terminal UI**|Dense information on a small screen, stamps, decisions under pressure|
|**80 Days (Inkle)**|Clean text UI married to an atmospheric illustration — information IS the game|
|**Subnautica distress beacon**|Audio design — static crackle, compression artifacts, echo on voice|

**Visual direction:**

* **Astronaut screen:** Dark 3D pixel ship interior. Three.js WebGPU. Heavy bloom on warning lights. Emergency red when systems fail. CRT scanline overlay.
* **Mission Control screen:** Pure 2D terminal aesthetic. Green-on-black phosphor. Grid of readout panels. Incoming messages appear with a typewriter tick. Sent messages show a "TRANSMITTING..." status then a 10-second countdown.

\---

## The 10-Second Delay — How It Actually Works

This is the heart of the game. Every design decision flows from it.

```
ASTRONAUT types: "Hull breach in sector 4. Do I seal it or vent atmosphere?"
                 → Message sent to Mission Control, tagged with timestamp T

10 SECONDS PASS

MISSION CONTROL receives the message at T+10
Mission Control types: "Vent atmosphere — sealing will trap toxic fumes"
                       → Message sent to Astronaut, tagged T+20

10 SECONDS PASS

ASTRONAUT receives the answer at T+30
By this point: the hull breach has progressed 30 seconds further
               Astronaut may have already made a decision
               The situation may have completely changed
```

The drama IS the gap. Right answers that arrive too late. Questions asked about problems that no longer exist. The asymmetry in knowledge creates natural narrative tension with zero scripting.

**Technical implementation:** PeerJS (WebRTC P2P, free forever)\[web:87]\[web:88]
Every message is tagged with a timestamp. Receiving client holds the message in a queue and renders it only after `message.timestamp + 10000ms <= Date.now()`. Zero server needed for the delay logic — it's pure math on the client.\[web:86]\[web:88]

\---

## Core Gameplay Loop

```
PRE-GAME
  ├── Player 1 opens game, gets a shareable URL/room code
  ├── Player 2 opens URL, joins room
  └── 5-second countdown → game begins

GAME PHASE (5–10 minute run)
  │
  ├── ASTRONAUT CLIENT
  │     ├── 3D ship interior visible (Three.js / WebGPU)
  │     ├── Crisis events appear on ship systems (fires, hull breach, power failure)
  │     ├── Physical interaction: click panels, pull levers, reroute power
  │     ├── Text/voice communication to Mission Control (typed, sent with delay)
  │     └── Limited information: can see the ship but has NO global data readouts
  │
  ├── MISSION CONTROL CLIENT
  │     ├── 2D terminal dashboard visible
  │     ├── Full ship telemetry: oxygen%, hull integrity, power grid, temperature
  │     ├── Can see all system states BUT cannot act on the ship
  │     ├── Text communication to Astronaut (sent with delay)
  │     └── Has information the Astronaut doesn't, lacks physical control
  │
  └── SHARED WIN/LOSE
        ├── WIN: Survive until rescue ship arrives (timer counts down, visible to both)
        ├── LOSE: Any critical system reaches 0% — ship destroyed or astronaut dead
        └── CRISIS EVENTS escalate over time — solo survival becomes impossible

POST-GAME
  └── Shared replay screen: timeline showing all messages sent and received,
      overlaid against what was actually happening on the ship at each moment.
      (This is the "wow" moment — seeing how close the timing was)
```

\---

## Ship Systems (Astronaut Screen)

Five systems. Each has a health bar visible on both screens (but Mission Control sees precise %, Astronaut sees only visual state: OK / WARNING / CRITICAL).

|System|Icon|Failure State|Action to Fix|
|-|-|-|-|
|**Hull Integrity**|🔶|Hull breach — oxygen leaking|Seal breach panel (timed click sequence)|
|**Life Support**|💧|CO2 build-up, then suffocation|Reroute scrubbers (power rerouting mini-game)|
|**Power Grid**|⚡|Cascading failures|Manually reset breakers in correct order|
|**Navigation**|🧭|Drifting off course — rescue ship misses|Input correct burn sequence (Mission Control must provide numbers)|
|**Comms Array**|📡|Delay INCREASES to 15s or 20s|Realign antenna (timing-based input)|

**Cascade design:** Fixing one system under-powered state can stress another. Mission Control sees the cascade coming 10 seconds before the Astronaut feels it.

\---

## Mission Control Dashboard (Mission Control Screen)

Pure terminal UI. Green phosphor on black. Five panels, one per system.

```
╔══════════════════════════════════════════════════════╗
║  DEEP SPACE RELAY STATION — MISSION CONTROL          ║
║  SIGNAL DELAY: 10.0s  │  ELAPSED: 04:32  │  ETA: 05:28 ║
╠══════════════════════════════════════════════════════╣
║ HULL: ████████░░ 81%    │ LIFE SUPPORT: █████░░░░░ 52% ║
║ POWER: ███████░░░ 71%   │ NAVIGATION: ██████████ 100%  ║
║ COMMS: ██████████ 100%  │                              ║
╠══════════════════════════════════════════════════════╣
║ EVENT LOG:                                           ║
║ \[04:18] ⚠ Hull integrity dropping — sector 4        ║
║ \[04:22] ⚠ Life support at 60% — CO2 rising          ║
║ \[04:29] ● Navigation nominal                         ║
╠══════════════════════════════════════════════════════╣
║ COMMS — RECEIVED (10s ago):                         ║
║ \[04:22] ASTRONAUT: "Hull is making noise. Sector 4?" ║
╠══════════════════════════════════════════════════════╣
║ COMMS — TRANSMIT:                                    ║
║ > \[typing here...]                    \[SEND ▶]       ║
║ STATUS: Last sent 04:24 — DELIVERED               ║
╚══════════════════════════════════════════════════════╝
```

**Mission Control ONLY powers:**

* Can trigger emergency protocols that override one system for 30 seconds (1 use only)
* Can see the full crisis event timeline 15 seconds before it manifests visually on the ship
* Can toggle individual system data to "highlight" it for the astronaut (flashes on astronaut's HUD)

\---

## Astronaut Ship Interior (Astronaut Screen)

3D voxel/pixel-art spaceship interior rendered in Three.js.

**Camera:** First-person or close third-person. Ship corridor layout.
**Interaction:** Click on panels, pull levers, input sequences on keypads.
**Visual language:**

* Normal state: cool blue-white operational lighting
* WARNING: amber emergency lights pulse
* CRITICAL: red strobes, smoke particle effect, structural groan audio
* Each system has a physical panel in the ship with status lights

**Astronaut ONLY powers:**

* Can physically interact with any system (Mission Control cannot)
* Has a torch/flashlight for exploring darkened sections after power failures
* Can perform EVA (spacewalk) for hull repairs — high risk, takes 60 seconds, comms go STATIC during EVA (delay increases to 20s)

\---

## The Delay as Drama — Designed Moments

These are the choreographed tension peaks the game is built around:

### Moment 1: "The Setup"

Mission Control sees hull integrity dropping at 3:00.
They send a message: *"Sector 4, check your hull panels."*
Astronaut receives it at 3:10.
By 3:10, there's already an audible hissing. The astronaut was already looking at the panel.
**Drama:** The message arrives just as the astronaut feels it. Perfect sync. Euphoric.

### Moment 2: "The Cross"

Mission Control sends: *"Do NOT reroute power from life support"* at 4:00.
Astronaut, facing a power failure, reroutes life support at 4:05.
Mission Control's message arrives at 4:10 — 5 seconds too late.
**Drama:** Both players see the mistake happen in real time. No blame. Just anguish.

### Moment 3: "The Navigation Puzzle"

At 6:00 the rescue ship's intercept window opens. Navigation must be precise.
Mission Control has the burn sequence numbers. Astronaut has the keypad.
They have exactly 60 seconds. Each number must be transmitted and received — 10 seconds per transmission.
**Drama:** Mission Control must send in the correct order, pre-calculating what the astronaut needs. Maximum planning under pressure.

### Moment 4: "The EVA"

Hull is critical. Only an EVA can fix it.
Astronaut announces: *"Going EVA."* — message arrives 10 seconds later.
During EVA: comms go to static. 20-second delay. Neither player can help the other.
**Drama:** 60 seconds of isolated silence. Mission Control watches oxygen tick down. Astronaut works alone.

### Moment 5: "Rescue"

Timer reaches 00:00. Rescue ship arrives.
Both screens show: shared victory animation. The message log replays.
**Drama:** Players see every message side by side with what was actually happening on the ship at that moment. Understanding how close everything was.

\---

## Crisis Event System

Events are pre-authored, not fully random. The game runs a script of escalating crises timed to create the designed moments above. Crisis intensity increases over time.

```
Crisis Event object:
{
  id: string,
  startTime: number,       // seconds from game start
  system: SystemKey,
  decayRate: number,       // % per second this system loses health
  fixAction: ActionType,   // what astronaut must do to fix it
  missionControlHint: string, // text Mission Control sees 15s before astronaut sees visual
  visualCue: string,       // what appears on astronaut screen
  audioEvent: string       // sound ID
}
```

**Crisis script (10-minute game):**

|Time|Event|Decay Rate|Fix Complexity|
|-|-|-|-|
|0:45|Power fluctuation|Slow 1%/s|Easy — reset one breaker|
|2:00|Sector 4 hull micro-fracture|Medium 2%/s|Medium — 4-step seal sequence|
|3:30|Life support CO2 rise|Slow 1.5%/s|Medium — power rerouting|
|5:00|Navigation drift|Fast if ignored|Hard — MC must transmit 6-digit code|
|6:30|Comms array damage|Instant — delay spikes|Medium — antenna realignment|
|7:30|Simultaneous: Power + Hull|Very fast 4%/s|Hard — must prioritize|
|8:45|Final crisis — player choice|Escalating|One system will fail — which one?|

\---

## Technical Architecture — 100% Free

```
┌─────────────────────────────────────────────────────┐
│  BROWSER (Player 1 — Astronaut)                     │
│  React + Three.js (WebGL/WebGPU) + Game State       │
└──────────────────┬──────────────────────────────────┘
                   │ WebRTC P2P (PeerJS)
                   │ Message: { type, data, sentAt }
                   │ Rendered after: sentAt + 10000ms
                   │
┌──────────────────▼──────────────────────────────────┐
│  BROWSER (Player 2 — Mission Control)                │
│  React + Pure CSS Terminal UI + Game State           │
└──────────────────────────────────────────────────────┘

SIGNALING SERVER (needed only for initial WebRTC handshake):
→ PeerJS Cloud (free, peerjs.com — no account, no config needed)
→ Zero ongoing server cost after connection established
→ After handshake: fully P2P, no server involved
```

### Why PeerJS is the right choice

* **Free forever** — PeerJS Cloud handles signaling at no cost\[web:87]\[web:91]
* **Zero backend code** — `new Peer()` is the entire server setup
* **Proven for browser games** — used by hundreds of jam games\[web:88]\[web:91]
* **No CORS issues** — same CDN install, works on Vercel
* **Room sharing:** Player 1's Peer ID becomes the room code. Share it as a URL param: `?room=abc123`

### The Delay Implementation

```typescript
// Sending (both players)
const sendMessage = (text: string) => {
  const message = { type: 'chat', text, sentAt: Date.now() };
  peer.send(JSON.stringify(message));
};

// Receiving (both players)
peer.on('data', (raw) => {
  const message = JSON.parse(raw);
  const delayMs = 10000; // 10 seconds
  const timeUntilReveal = (message.sentAt + delayMs) - Date.now();
  setTimeout(() => {
    renderMessage(message); // show message
  }, Math.max(0, timeUntilReveal));
});
```

No server. No database. Pure browser math.\[web:86]\[web:88]

\---

## Complete Free Tool Chain

```
TOOL          FREE TIER              ROLE                    LIMIT MANAGEMENT
─────────────────────────────────────────────────────────────────────────────
Bolt.new      300K tokens/day        Build the MVP shell     New account = fresh 1M tokens
              1M tokens/month        (P2P connection,        Use ONLY for initial scaffold:
                                     basic UI layout,        room system + basic 3D scene
                                     game state store)       \~3-4 sessions max

Cursor        2,000 completions      Complete the game       50 premium requests is critical
              50 premium req/month   (game loop, systems,    Use for Tab completions freely
              New account = new      crisis events,          Save 50 premium for complex
              free trial             UI polish)              multi-file Composer sessions

Antigravity   Gemini 3.1 Pro free   Visual polish,          Unlimited — use freely
              Claude via API key     PostFX, shaders,        Switch to Claude only when
              (bring your own key)   performance audit,      Gemini output is imprecise
                                     browser QA agent

Codex (CLI)   Free tier available   Final code review,      Run once at end of each phase:
                                     cleanup, refactor,      security review, dead code
                                     anti-slop pass          removal, TypeScript errors

Vercel        Free hobby plan        Deploy + hosting        Free forever for static sites
              Unlimited deploys      Custom domain           Connect custom domain free
              100GB bandwidth/mo

PeerJS Cloud  Free forever           WebRTC signaling        No account needed
                                     (initial handshake)     Zero config

GitHub        Free                   Version control         Push after every phase
```

### Bolt Token Strategy (Critical)

Bolt burns through 300K tokens in a few sessions on complex code.\[web:89]\[web:92]

**Use Bolt ONLY for:**

1. The room/lobby system (create room, share URL, join by code)
2. Basic Zustand game state store
3. One bare-bones 3D scene (grey box ship, no systems)
4. Basic 2D terminal UI shell (no real functionality)

**Then export to GitHub → open in Cursor.** Never go back to Bolt.

\---

## File Structure

```
last-signal/
│
├── index.html                        ← Vite entry + PeerJS CDN script
├── vite.config.ts
├── package.json
├── tsconfig.json
├── vercel.json                       ← SPA rewrite rules
├── AGENTS.md                         ← AI context file (read by all AI tools)
│
├── public/
│   └── favicon.ico
│
└── src/
    │
    ├── main.tsx
    ├── App.tsx                       ← Phase router: lobby/playing/postgame
    │
    ├── store/
    │   ├── useGameStore.ts           ← Zustand: phase, systemHealth, crisisEvents,
    │   │                                role, messages\[], gameTime, isConnected
    │   └── useConnectionStore.ts    ← Zustand: peerId, partnerPeerId, connectionState
    │
    ├── network/
    │   ├── PeerConnection.ts         ← PeerJS wrapper: init, connect, send, receive
    │   ├── MessageQueue.ts           ← Delay queue: holds messages, releases at T+10s
    │   └── types.ts                  ← NetworkMessage type, GameEvent type
    │
    ├── game/
    │   ├── CrisisEngine.ts           ← Pre-authored crisis script, event scheduler
    │   ├── SystemsManager.ts         ← Health tracking, decay rates, fix validation
    │   ├── GameLoop.ts               ← Main tick: update systems, fire events, check win/lose
    │   └── actions/
    │       ├── SealHull.ts           ← Hull breach fix mini-game logic
    │       ├── ReroutePower.ts       ← Power rerouting mini-game logic
    │       ├── ResetBreakers.ts      ← Breaker reset logic
    │       ├── NavigationBurn.ts     ← Code input validation
    │       └── AntennaAlign.ts       ← Timing-based antenna fix
    │
    ├── astronaut/                    ← Everything the Astronaut player sees
    │   ├── AstronautScreen.tsx       ← Root screen component
    │   ├── ShipCanvas.tsx            ← Three.js WebGL scene
    │   ├── ship/
    │   │   ├── ShipInterior.tsx      ← Ship corridor geometry (voxel/pixel art)
    │   │   ├── SystemPanel.tsx       ← Interactive panel component (per system)
    │   │   ├── EmergencyLights.tsx   ← PointLight system, pulsing red/amber
    │   │   └── SmokeParticles.tsx    ← Particle effect for critical systems
    │   ├── hud/
    │   │   ├── AstronautHUD.tsx      ← Minimal overlay (O2%, warning icons)
    │   │   └── CommPanel.tsx         ← Message input + received messages (with delay)
    │   └── minigames/
    │       ├── SealSequence.tsx      ← Click-in-order hull seal UI
    │       ├── PowerRouter.tsx       ← Drag-to-reroute power UI
    │       ├── BreakerPanel.tsx      ← Toggle breakers UI
    │       ├── NavKeypad.tsx         ← Number input UI
    │       └── AntennaWheel.tsx      ← Timing wheel UI
    │
    ├── missioncontrol/               ← Everything Mission Control sees
    │   ├── MissionControlScreen.tsx  ← Root screen component
    │   ├── terminal/
    │   │   ├── TerminalShell.tsx     ← Green phosphor terminal wrapper
    │   │   ├── SystemReadouts.tsx    ← 5 system health panels with precise %
    │   │   ├── EventLog.tsx          ← Scrolling event log with timestamps
    │   │   └── AlertPanel.tsx        ← Upcoming crisis hints (15s preview)
    │   └── comms/
    │       ├── CommsFeed.tsx         ← Received messages (with delay visual)
    │       └── TransmitPanel.tsx     ← Text input + SEND button + status
    │
    ├── lobby/
    │   ├── LobbyScreen.tsx           ← Create room / join room
    │   ├── RoleSelect.tsx            ← Choose Astronaut or Mission Control
    │   └── WaitingRoom.tsx           ← Waiting for partner to connect
    │
    ├── postgame/
    │   ├── PostGameScreen.tsx        ← Win/lose reveal
    │   └── MessageTimeline.tsx       ← Replay showing messages vs. ship state
    │
    └── styles/
        ├── tokens.css                ← CSS custom properties
        ├── base.css                  ← Reset + defaults
        ├── astronaut.css             ← Ship UI styles
        └── terminal.css              ← Terminal / phosphor styles
```

\---

## AGENTS.md (AI Context File — Copy to Project Root)

```markdown
# Last Signal — AI Context

## What this game is
An asymmetric 2-player browser game for Vibe Jam 2026.
Player 1 is an ASTRONAUT on a crippled spaceship.
Player 2 is MISSION CONTROL on Earth.
A REAL 10-second signal delay separates all communications between them.
They must keep 5 ship systems alive until a rescue ship arrives (\~10 minutes).

## Core mechanic
Every message sent by either player is held in a queue on the RECEIVER's client.
It renders/plays only after: message.sentAt + 10000 (ms) <= Date.now().
The delay is 100% client-side math. No server. No real delay network-side.

## Tech stack
- Vite + React + TypeScript
- PeerJS (WebRTC P2P) for all network communication — free, no backend
- Three.js (via @react-three/fiber) for Astronaut's 3D ship view
- Zustand for state (NO persist middleware — localStorage may be blocked)
- Pure CSS terminal UI for Mission Control screen

## NEVER
- Use localStorage or sessionStorage (may be blocked on Vercel preview)
- Use any paid API services
- Load external 3D asset files (.glb, .gltf) — all geometry must be procedural
- Use setTimeout for game timing — use Date.now() deltas and requestAnimationFrame
- Leave console.log() in any code going to production

## System health shape
type SystemKey = 'hull' | 'lifeSupport' | 'power' | 'navigation' | 'comms'
interface SystemHealth { \[K in SystemKey]: number } // 0–100

## Message type
interface NetworkMessage {
  id: string
  type: 'chat' | 'gameEvent' | 'systemState' | 'ping'
  payload: unknown
  sentAt: number  // Date.now() on sender's client
}

## Role colors
Astronaut UI: #0a0e1a background, #00e5ff cyan accents, #ff4444 danger
Mission Control: #000000 background, #00ff41 phosphor green text

## Crisis events fire from CrisisEngine.ts on a pre-authored timeline.
Both clients run the same CrisisEngine with the same seed — no sync needed.
Only PLAYER ACTIONS need to be synced over PeerJS.
```

\---

## Build Pipeline — Phase by Phase

### PHASE 0 — Bolt MVP (New Account, 1 Session)

**What to build in Bolt:** The thinnest possible working skeleton.
**Bolt Prompt (single session, do not exceed):**

```
Build a browser game MVP called "Last Signal" using React + TypeScript + Vite.

Read this before coding:
- PeerJS is used for P2P. Install from CDN: <script src="https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js">
- NO localStorage. NO paid APIs. Use Zustand for state.
- The game has TWO roles: Astronaut and Mission Control.

Build ONLY these things — nothing else:

1. LobbyScreen.tsx:
   - "Create Room" button: initializes new Peer(), displays the Peer ID as a 6-char room code
   - "Join Room" input: enter a room code → connect to that Peer
   - After connection: ask user to choose role (Astronaut / Mission Control)
   - After role chosen: transition to game screen

2. useConnectionStore.ts (Zustand):
   - peerId, partnerPeerId, connectionState ('idle'|'waiting'|'connected'), role ('astronaut'|'missionControl'), conn (PeerJS connection ref)

3. useGameStore.ts (Zustand):
   - phase: 'lobby'|'playing'|'postgame'
   - systemHealth: { hull: 100, lifeSupport: 100, power: 100, navigation: 100, comms: 100 }
   - messages: Array<{id, text, sentAt, from, receivedAt?}>
   - gameTime: 0

4. A placeholder AstronautScreen.tsx: 
   Just a dark div (#0a0e1a) with "ASTRONAUT VIEW" in cyan text and a message input + send button.
   On send: call conn.send({ type:'chat', text, sentAt: Date.now() })
   On receive: add to messages ONLY after Date.now() >= msg.sentAt + 10000

5. A placeholder MissionControlScreen.tsx:
   Just a black div with green text (#00ff41), "MISSION CONTROL" heading, same message input + send.
   Same delay logic.

Test the delay works: open two browser tabs, send a message from one, verify it appears 10 seconds later in the other.

Do NOT build: 3D graphics, ship systems, crisis events, mini-games, animations.
Export to GitHub when done.
```

**Expected output after Bolt:** Two players can connect, choose roles, and exchange delayed messages. Nothing more.

\---

### PHASE 1 — Cursor: Astronaut Ship (Days 1–4)

Build the 3D ship interior and system panels.
Use Cursor Tab completions freely (2,000/month). Save premium requests for Composer (50/month limit).

**Cursor Composer Prompt 1 (use 1 premium request):**

```
Build src/astronaut/ShipCanvas.tsx — a React Three Fiber 3D ship interior.

Context: This is Last Signal, a browser game. The Astronaut player sees a 3D spaceship interior.
Read AGENTS.md for full project context.

Ship layout: A narrow corridor (4u wide, 3u tall, 20u long).
Built from BoxGeometry only — no external 3D assets.

Wall material: MeshStandardMaterial color=#1a1f2e (dark blue-grey metal)
Floor material: color=#0f1218 with a subtle grid pattern (emissive lines)
Ceiling material: color=#0d1018

Lighting:
  - AmbientLight color=#112233 intensity=0.4
  - 4 PointLights along the corridor ceiling: color=#334477 intensity=0.8 distance=6
  - Emergency light refs: 2 PointLights color=#ff2222 intensity=0 (activated by system alerts)

5 system panel positions along the walls:
  Each panel: a BoxGeometry (2u x 1.5u x 0.1u) flush with the wall
  With status indicator lights: small sphere geometry above each panel
  Light colors: green (OK) → amber (WARNING) → red (CRITICAL) based on systemHealth

Camera: positioned in corridor, looking forward. Player can look left/right (mouse).
No movement — camera is fixed position, just rotation.

Use @react-three/fiber. Use @react-three/drei for any helpers.
Access systemHealth from useGameStore.
Update panel light colors in useFrame based on current health values.
```

**Cursor Composer Prompt 2 (use 1 premium request):**

```
Build the 5 mini-game components in src/astronaut/minigames/.
These are HTML overlay components (not 3D) that appear over the ship view when a system is interacted with.

Read AGENTS.md for project context.

1. SealSequence.tsx (hull breach):
   - Shows 4 numbered buttons that must be clicked in the correct order (1→2→3→4)
   - Wrong order: resets and deducts 5% from hull health (call SystemsManager.applyPenalty)
   - Correct completion: calls SystemsManager.fixSystem('hull', 20) — restores 20% hull
   - 30-second countdown timer visible. If timer expires: hull loses 10% more.

2. PowerRouter.tsx (life support):
   - 3 power nodes displayed as circles connected by lines (SVG)
   - Player must drag a power token from node to node to complete a circuit
   - Correct circuit: restores 25% life support
   - Wrong drag: nothing happens (forgive errors)
   - 45-second timer.

3. BreakerPanel.tsx (power grid):
   - 6 breaker switches (toggle on/off). Only one correct combination restores power.
   - Correct combination changes per crisis event (received from CrisisEngine)
   - Visual: industrial switch UI, satisfying click feedback
   - 40-second timer.

4. NavKeypad.tsx (navigation):
   - Numeric keypad (0–9 + ENTER + CLEAR)
   - Mission Control must transmit a 6-digit code via chat
   - Astronaut inputs it here — validated against CrisisEngine's stored code
   - Correct: navigation fixed. Wrong: timer -10 seconds.
   - 60-second timer (accounts for the 10-second transmission delay).

5. AntennaWheel.tsx (comms):
   - A circular dial the player rotates by clicking left/right arrows
   - Must stop within a 15° window of the correct angle
   - Visual feedback: signal strength meter increases as you approach correct angle
   - Correct: comms delay returns to 10s (from spiked 20s). Wrong: try again.
   - 50-second timer.

All mini-games: CSS modules for styling, dark theme, cyan (#00e5ff) for interactive elements.
```

\---

### PHASE 2 — Cursor: Mission Control + Crisis Engine (Days 5–8)

**Cursor Composer Prompt 3 (use 1 premium request):**

```
Build src/missioncontrol/terminal/ — the Mission Control screen UI.

Read AGENTS.md. Mission Control is a pure CSS terminal interface, NO 3D.

TerminalShell.tsx:
  Full-screen black background (#000000).
  Subtle CRT scanline overlay: repeating CSS gradient (rgba(0,255,65,0.03) lines every 3px).
  Font: 'Courier New' monospace, color #00ff41.
  Flicker animation: opacity 0.99→1.0 every 8 seconds (subtle, not annoying).

SystemReadouts.tsx:
  5 panels in a 2-column grid (hull+lifeSupport / power+navigation / comms full-width).
  Each panel:
    System name in uppercase, letter-spacing 0.15em
    Progress bar: filled with # characters, empty with · characters (terminal style)
    Example: HULL     \[########··] 81%
    Color thresholds: >60% = #00ff41, 30-60% = #ffb000 (amber), <30% = #ff4444 (red)
  Update every 250ms from useGameStore.systemHealth

EventLog.tsx:
  Scrolling list of events with timestamps (MM:SS format from game start).
  Format: \[04:18] ⚠ Hull integrity dropping — sector 4
  Color: ⚠ = amber, ● = green, ✗ = red, ℹ = green dim
  Auto-scroll to bottom on new event.
  Max 50 events visible (truncate older ones).

AlertPanel.tsx:
  Shows upcoming crisis hints 15 seconds before they manifest on the ship.
  Format: \[UPCOMING in 15s] Life support CO2 rising — advise scrubber reroute
  Flashes amber when timer < 5s.
  This is Mission Control's EXCLUSIVE advantage over the Astronaut.
```

**Cursor Composer Prompt 4 (use 1 premium request):**

```
Build src/game/CrisisEngine.ts — the pre-authored crisis event system.

Read AGENTS.md for project context.

Both clients run identical CrisisEngine instances. No sync needed for events.
Only player ACTIONS sync over PeerJS.

CrisisEvent type:
{
  id: string
  triggerTime: number      // seconds from game start
  system: SystemKey
  decayRate: number        // health % lost per second while unfixed
  duration: number         // seconds until auto-fail if unfixed
  fixAction: ActionType    // which mini-game fixes it
  mcHintText: string       // text shown to Mission Control 15s before trigger
  astronautCue: string     // visual cue on ship at trigger time
  audioEvent: AudioKey     // sound to play at trigger
  navigationCode?: string  // 6-digit code for NavKeypad (navigation events only)
  breakerCombo?: boolean\[] // correct breaker combination for power events
}

Pre-authored crisis script (hardcoded array, same every game — balance is more important than variety):
\[
  { triggerTime: 45,  system:'power',       decayRate:0.8,  duration:90,  fixAction:'breakers',  ... },
  { triggerTime: 120, system:'hull',        decayRate:1.5,  duration:120, fixAction:'seal',      ... },
  { triggerTime: 210, system:'lifeSupport', decayRate:1.2,  duration:150, fixAction:'power',     ... },
  { triggerTime: 300, system:'navigation',  decayRate:2.0,  duration:60,  fixAction:'navcode',   ... },
  { triggerTime: 390, system:'comms',       decayRate:0,    duration:90,  fixAction:'antenna',   ... },
  { triggerTime: 450, system:'hull',        decayRate:2.5,  duration:90,  fixAction:'seal',      ... },
  { triggerTime: 450, system:'power',       decayRate:2.0,  duration:90,  fixAction:'breakers',  ... },
  { triggerTime: 525, system:'lifeSupport', decayRate:3.0,  duration:75,  fixAction:'power',     ... }
]

CrisisEngine class methods:
  start(gameStartTime: number): void  — begins the engine
  tick(now: number): CrisisUpdate     — call every frame, returns {newEvents, missionControlHints, activeDecays}
  reportFixed(eventId: string): void  — stops decay for that event
  getUpcomingHints(now: number): Hint\[] — returns hints for MC that trigger in next 15s
```

\---

### PHASE 3 — Cursor: Polish + Postgame (Days 9–11)

**Cursor Composer Prompt 5 (use 1 premium request):**

```
Build src/postgame/MessageTimeline.tsx — the end-of-game replay screen.

Read AGENTS.md.

After the game ends (win or lose), both players see this screen.

Data available:
  - messages\[]: all messages with { text, sentAt, from, receivedAt } timestamps
  - crisisLog\[]: array of { time, system, event } from CrisisEngine
  - gameEndReason: 'rescued' | SystemKey (which system failed)
  - gameStartTime: number

Layout:
  Dark background. Two-column layout:
    Left column: The message thread (all messages in chronological order by sentAt)
    Right column: The crisis timeline (what was happening on the ship at each moment)
  
  Both columns share the same time axis. Use a horizontal line to mark game time.
  
  For each message: show sent time, received time, and the 10-second gap visualized
  as a dotted arrow between them.
  
  Highlight moments where:
    - A message arrived AFTER the crisis it referenced had already resolved (too late)
    - A message arrived JUST as the crisis was at peak (perfect timing — gold highlight)
    - No message was sent during a crisis (communication gap — red highlight)

  WIN state: "CREW RESCUED" in large text, green, with a particle burst animation.
  LOSE state: "SIGNAL LOST — \[system] FAILURE" in red, with static noise effect.

  PLAY AGAIN button: resets everything, returns to lobby.
```

**Cursor Composer Prompt 6 (use 1 premium request):**

```
Add audio to Last Signal. Read AGENTS.md.

All audio is procedural Web Audio API — no audio files. Initialize AudioContext on first click.

Build src/audio/AudioEngine.ts:

sounds to implement:

// Ship sounds (Astronaut)
playHullCreak():   Low-frequency filtered noise, 0.8s, pan slightly left
playAlarmPulse():  Square wave 440Hz, 0.1s on/off pulsing at 1Hz, while system in WARNING
playCriticalAlarm(): Sawtooth 880Hz descending, urgent, loops while CRITICAL
playBreatherHiss(): Filtered noise, very subtle, loops always (space atmosphere)
playEVAStatic():   Bandpass filtered noise, mid frequency, loops during EVA
playPanelClick():  Short sine 800Hz, 0.04s (mini-game interactions)
playSuccessChime(): Sine C5→E5→G5, 0.12s each, on successful fix

// Comms sounds (both players)  
playMessageSent(): Soft click, 220Hz sine, 0.06s
playMessageReceive(): Two-tone blip, 440+880Hz, 0.08s each, with 0.05s gap
playTransmitting(): Subtle static burst, 0.15s, before message resolves

// Mission Control
playTerminalType(): Random pitch 400–600Hz sine, 0.03s, each keypress
playAlertIncoming(): Ascending 3-note sting when crisis hint appears

// Game state
playVictory(): Orchestral-ish — stacked sine waves C+E+G+C(octave), 2s
playGameOver(): Descending sawtooth, 1.5s, reverb tail using convolver node
playRescueApproach(): Rising sine, 4s, from 200→800Hz (30s before game end)

Export: AudioEngine singleton, init(), and all play methods.
```

\---

### PHASE 4 — Antigravity (Gemini + Claude): Visual Polish

**Use Antigravity Agent Manager (Gemini 3.1 Pro) for all these prompts:**

```
Prompt A — Ship Visual Upgrade:
"Open the game in the browser. The Astronaut's ship interior uses basic BoxGeometry.
Add these visual upgrades using Three.js — no external assets:

1. Add EffectComposer with:
   - UnrealBloomPass: threshold 0.7, strength 0.4, radius 0.4
   - After it: a CRT vignette (dark edges, slight green tint)

2. Make the emergency lights PULSE: use a sine wave on PointLight.intensity
   Normal: 0.8 intensity at 1Hz pulse
   Warning: 1.2 intensity at 2Hz pulse, amber color
   Critical: 2.0 intensity at 4Hz pulse, red color

3. Add smoke particles to critical systems:
   Object-pooled Points geometry, 50 particles per active system.
   Particles drift upward slowly, fade alpha as they rise.
   Color: rgba(200, 200, 200, 0.3) — grey smoke.

4. Add a starfield visible through two small porthole windows in the ship corridor:
   Porthole: CylinderGeometry (radius 0.5), hole in the wall.
   Stars: a SphereGeometry far away with a star texture built from canvas.

Report what you changed and if any performance issues occurred."

Prompt B — Terminal Visual Upgrade:
"The Mission Control terminal UI needs visual polish.
Add these CSS effects to make it feel like a real 1980s phosphor terminal:

1. Green glow on all text: text-shadow 0 0 8px #00ff41, 0 0 2px #00ff41
2. Scanlines: fixed overlay with repeating-linear-gradient
   (rgba(0,0,0,0.15) 50%, transparent 50%), background-size 100% 3px
3. Screen curvature: subtle border-radius on the terminal container, 
   with a dark vignette via radial-gradient overlay
4. Cursor blink on the transmit input: 1s step-end infinite opacity animation
5. New message animation: messages slide in from the left, fade in over 0.3s
6. Typewriter effect on MC hints: text reveals character by character at 40ms/char

Apply these without breaking the existing layout or functionality."
```

\---

### PHASE 5 — Codex: Final Review

**Run Codex at the end of each phase and before final deployment:**

```
Codex CLI prompt:
"Review src/ directory for these specific issues in a Last Signal browser game:

1. SECURITY:
   - Any user input that reaches PeerJS conn.send() without sanitization?
   - Any eval() or innerHTML with user data?

2. PERFORMANCE:
   - Any setTimeout() used for game timing? (Should be Date.now() deltas)
   - Any state updates inside useFrame()? (Should be refs)
   - Any non-memoized components re-rendering in the game loop?

3. BUGS:
   - What happens if one player closes the tab mid-game?
   - What happens if the PeerJS connection drops and reconnects?
   - Does the delay queue handle messages that arrive out of order by sentAt?
   - What if both players choose the same role?

4. ANTI-SLOP:
   - Any console.log() in production code?
   - Any TODO comments left in?
   - Any hardcoded magic numbers without constants?
   - Any default Three.js gray materials?

5. TYPESCRIPT:
   - Any 'any' types that should be properly typed?
   - Any missing null checks on PeerJS conn?

Report findings as a numbered list. Include file and line number for each issue.
Do NOT fix automatically — report only."
```

\---

## UI Design System

### Astronaut Screen

```css
:root {
  --astro-bg:        #0a0e1a;
  --astro-surface:   #111827;
  --astro-cyan:      #00e5ff;
  --astro-amber:     #ffb000;
  --astro-red:       #ff4444;
  --astro-text:      #c8d8e8;
  --astro-text-dim:  #4a5a6a;
  --font-astro:      'Azeret Mono', monospace;  /\* Helmet HUD feel \*/
}

/\* HUD elements: minimal, semi-transparent overlays \*/
/\* System warnings: pulsing amber/red text, never solid block \*/
/\* Mini-game overlays: dark glass panel, backdrop-filter: blur(8px) \*/
```

### Mission Control Screen

```css
:root {
  --mc-bg:           #000000;
  --mc-surface:      #050505;
  --mc-phosphor:     #00ff41;   /\* Classic green phosphor \*/
  --mc-amber:        #ffb000;   /\* Warning amber \*/
  --mc-red:          #ff3333;   /\* Critical red \*/
  --mc-dim:          #003311;   /\* Dim phosphor for secondary info \*/
  --font-mc:         'Courier New', 'Courier', monospace;  /\* No CDN font — instant load \*/
}

/\* All text has phosphor glow: text-shadow 0 0 6px currentColor \*/
/\* Progress bars built from ASCII: ████████░░ \*/
/\* No border-radius anywhere — terminals have sharp corners \*/
/\* Dividers are single - or = characters, not CSS borders \*/
```

\---

## Jam Rule Compliance Checklist

|Rule|Status|Implementation|
|-|-|-|
|≥ 90% AI-written|✅|Bolt → Cursor → Antigravity — all AI|
|New game (post Apr 1)|✅|Starting from scratch|
|Web, free, no login|✅|Vercel free, no auth|
|No loading screens|✅|PeerJS from CDN, procedural geometry, instant|
|Multiplayer preferred|✅|**The entire game is multiplayer**|
|Own domain preferred|✅|You handle domain → Vercel DNS|
|Participant widget|⏰|Add before submission: `<script async src="https://jam.pieter.com/2026/widget.js">`|
|Deadline: May 1 13:37 UTC|✅|27 days available|

\---

## What Makes This Place Top 3

1. **Multiplayer IS the mechanic** — not a tacked-on feature. Judges who play it together won't forget it.\[web:69]
2. **Zero prior art in jam history** — no Vibe Jam entry has used signal delay as a game mechanic.
3. **Emotionally resonant** — the post-game timeline replay (seeing how close/far messages were) creates a shareable "holy shit" moment.
4. **Technically impressive without being overengineered** — WebRTC P2P + 10-second setTimeout queue is elegant.
5. **Two roles = two types of players** — analytical types choose Mission Control, action types choose Astronaut. Broad appeal.
6. **GIF-able moment** — screengrab of Mission Control watching life support at 3% while the "vent atmosphere" message is still 6 seconds from arriving.

\---

*Last Signal GDD v1.0 — Vibe Jam 2026
Deadline: May 1, 2026 @ 13:37 UTC
Stack: 100% Free — Bolt + Cursor + Antigravity + Codex + Vercel + PeerJS*

