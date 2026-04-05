import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/useGameStore';

const CORRIDOR = { width: 4, height: 3, length: 20 } as const;
const WALL_COLOR = '#1a1f2e';
const FLOOR_COLOR = '#0f1218';
const CEILING_COLOR = '#0d1018';
const PANEL_RECESS_COLOR = '#0d1525';
const BEAM_COLOR = '#151c2a';

const PANEL_POSITIONS = [
  { key: 'hull' as const, position: [-2, 1.2, -3], rotation: [0, Math.PI / 2, 0] },
  { key: 'lifeSupport' as const, position: [2, 1.2, -7], rotation: [0, -Math.PI / 2, 0] },
  { key: 'power' as const, position: [-2, 1.2, -11], rotation: [0, Math.PI / 2, 0] },
  { key: 'navigation' as const, position: [2, 1.2, -15], rotation: [0, -Math.PI / 2, 0] },
  { key: 'comms' as const, position: [-2, 1.2, -19], rotation: [0, Math.PI / 2, 0] },
];

type SystemKey = (typeof PANEL_POSITIONS)[number]['key'];

function healthToStatusColor(health: number): string {
  if (health >= 60) return '#00ff44';
  if (health >= 30) return '#ffb000';
  return '#ff2222';
}

function Corridor() {
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WALL_COLOR,
        metalness: 0.3,
        roughness: 0.8,
        emissive: '#000000',
      }),
    []
  );

  const ceilingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CEILING_COLOR,
        metalness: 0.1,
        roughness: 0.9,
        emissive: '#000000',
      }),
    []
  );

  const floorMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: FLOOR_COLOR,
        metalness: 0.1,
        roughness: 0.9,
        emissive: '#000000',
      }),
    []
  );

  const recessMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: PANEL_RECESS_COLOR,
        metalness: 0.2,
        roughness: 0.85,
        emissive: '#000000',
      }),
    []
  );

  const beamMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: BEAM_COLOR,
        metalness: 0.3,
        roughness: 0.75,
        emissive: '#000000',
      }),
    []
  );

  const gridMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#1a2030',
        emissive: '#001122',
        emissiveIntensity: 0.15,
        metalness: 0.1,
        roughness: 0.95,
      }),
    []
  );

  const hw = CORRIDOR.width / 2;
  const t = 0.1;

  // Recessed panel positions every 4 units along corridor
  const recessZ = [-8, -4, 0, 4, 8];
  // Ceiling beam positions every 4 units
  const beamZ = [-8, -4, 0, 4, 8];
  // Floor grid lines every 1 unit
  const gridZ = Array.from({ length: 21 }, (_, i) => -10 + i);

  return (
    <group>
      {/* Main floor */}
      <mesh position={[0, -t / 2, 0]} material={floorMat}>
        <boxGeometry args={[CORRIDOR.width, t, CORRIDOR.length]} />
      </mesh>

      {/* Floor grid lines */}
      {gridZ.map((z) => (
        <mesh key={`grid-${z}`} position={[0, 0.01, z]} material={gridMat}>
          <boxGeometry args={[CORRIDOR.width, 0.02, 0.03]} />
        </mesh>
      ))}

      {/* Main ceiling */}
      <mesh position={[0, CORRIDOR.height + t / 2, 0]} material={ceilingMat}>
        <boxGeometry args={[CORRIDOR.width, t, CORRIDOR.length]} />
      </mesh>

      {/* Ceiling beams */}
      {beamZ.map((z) => (
        <mesh key={`beam-${z}`} position={[0, CORRIDOR.height - 0.075, z]} material={beamMat}>
          <boxGeometry args={[CORRIDOR.width + 0.2, 0.15, 0.2]} />
        </mesh>
      ))}

      {/* Left wall */}
      <mesh position={[-hw - t / 2, CORRIDOR.height / 2, 0]} material={wallMat}>
        <boxGeometry args={[t, CORRIDOR.height, CORRIDOR.length]} />
      </mesh>

      {/* Right wall */}
      <mesh position={[hw + t / 2, CORRIDOR.height / 2, 0]} material={wallMat}>
        <boxGeometry args={[t, CORRIDOR.height, CORRIDOR.length]} />
      </mesh>

      {/* Recessed wall panels - left */}
      {recessZ.map((z) => (
        <mesh key={`recess-left-${z}`} position={[-hw + 0.05, CORRIDOR.height / 2, z]} material={recessMat}>
          <boxGeometry args={[0.1, 2.5, 0.8]} />
        </mesh>
      ))}

      {/* Recessed wall panels - right */}
      {recessZ.map((z) => (
        <mesh key={`recess-right-${z}`} position={[hw - 0.05, CORRIDOR.height / 2, z]} material={recessMat}>
          <boxGeometry args={[0.1, 2.5, 0.8]} />
        </mesh>
      ))}
    </group>
  );
}

function SystemPanel({
  config,
  onClick,
}: {
  config: { key: SystemKey; position: number[]; rotation: number[] };
  onClick: () => void;
}) {
  const { key: sysKey, position, rotation } = config;
  const statusRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const health = useGameStore.getState().systemHealth[sysKey];
    const c = healthToStatusColor(health);
    const col = new THREE.Color(c);
    if (statusRef.current) {
      statusRef.current.color.copy(col);
      statusRef.current.emissive.copy(col);
      statusRef.current.emissiveIntensity = health < 50 ? 1.2 : 0.6;
    }
  });

  const [px, py, pz] = position;
  const [rx, ry, rz] = rotation;

  return (
    <group position={[px, py, pz]} rotation={[rx, ry, rz]}>
      {/* Clickable panel face */}
      <mesh onClick={onClick}>
        <boxGeometry args={[1.8, 1.4, 0.08]} />
        <meshStandardMaterial color="#0d1520" metalness={0.2} roughness={0.85} emissive="#000000" />
      </mesh>

      {/* Screen/label area */}
      <mesh position={[0, 0.3, 0.05]}>
        <boxGeometry args={[1.2, 0.4, 0.02]} />
        <meshStandardMaterial color="#001133" metalness={0.1} roughness={0.9} emissive="#000000" />
      </mesh>

      {/* 4 indicator buttons - 2x2 grid */}
      {[
        [-0.4, -0.2],
        [0.4, -0.2],
        [-0.4, -0.5],
        [0.4, -0.5],
      ].map(([bx, by], i) => (
        <mesh key={i} position={[bx, by, 0.05]}>
          <boxGeometry args={[0.15, 0.15, 0.05]} />
          <meshStandardMaterial color="#1a2535" metalness={0.2} roughness={0.8} emissive="#000000" />
        </mesh>
      ))}

      {/* Status light above panel */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          ref={statusRef}
          color="#00ff44"
          emissive="#00ff44"
          emissiveIntensity={0.6}
          metalness={0.1}
          roughness={0.3}
        />
      </mesh>
    </group>
  );
}

function ShipLights() {
  const emergency1 = useRef<THREE.PointLight>(null);
  const emergency2 = useRef<THREE.PointLight>(null);
  const clock = useRef(0);

  useFrame((state) => {
    clock.current = state.clock.elapsedTime;
    const { systemHealth } = useGameStore.getState();

    // Emergency lights pulse when hull < 50 or power < 50
    const emergencyActive = systemHealth.hull < 50 || systemHealth.power < 50;
    const pulseIntensity = emergencyActive ? Math.sin(clock.current * 3) * 0.5 + 0.8 : 0;

    if (emergency1.current) emergency1.current.intensity = pulseIntensity;
    if (emergency2.current) emergency2.current.intensity = pulseIntensity;
  });

  return (
    <>
      <ambientLight color="#112233" intensity={0.3} />

      {/* Four ceiling point lights */}
      <pointLight position={[0, 2.5, -2]} color="#334477" intensity={0.8} distance={6} decay={2} />
      <pointLight position={[0, 2.5, -7]} color="#334477" intensity={0.8} distance={6} decay={2} />
      <pointLight position={[0, 2.5, -12]} color="#334477" intensity={0.8} distance={6} decay={2} />
      <pointLight position={[0, 2.5, -17]} color="#334477" intensity={0.8} distance={6} decay={2} />

      {/* Emergency lights - initially off, pulse when critical */}
      <pointLight ref={emergency1} position={[-1.5, 2, -5]} color="#ff2222" intensity={0} distance={8} decay={1.5} />
      <pointLight ref={emergency2} position={[1.5, 2, -14]} color="#ff2222" intensity={0} distance={8} decay={1.5} />
    </>
  );
}

function InteractionHint() {
  const [hint, setHint] = useState<SystemKey | null>(null);
  const { activeMiniGame } = useGameStore();
  const camera = useThree((state) => state.camera);
  const interactionDistance = 1.5;

  useFrame(() => {
    const cameraPos = camera.position;

    let closestPanel: typeof PANEL_POSITIONS[0] | null = null;
    let closestDistance = Infinity;

    for (const panel of PANEL_POSITIONS) {
      const [px, _, pz] = panel.position;
      const distance = Math.sqrt(
        Math.pow(cameraPos.x - px, 2) +
        Math.pow(cameraPos.z - pz, 2)
      );

      if (distance < interactionDistance && distance < closestDistance) {
        closestDistance = distance;
        closestPanel = panel;
      }
    }

    if (closestPanel && !activeMiniGame) {
      setHint(closestPanel.key);
    } else {
      setHint(null);
    }
  });

  if (!hint) return null;

  const hintText = `Press E to open ${hint.toUpperCase()} panel`;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff41',
        padding: '8px 16px',
        borderRadius: '4px',
        border: '1px solid #00ff41',
        fontSize: '14px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {hintText}
    </div>
  );
}

function CameraRig({ lookEnabled }: { lookEnabled: boolean }) {
  const group = useRef<THREE.Group>(null);
  const yaw = useRef(0);
  const dragging = useRef(false);
  const lookEnabledRef = useRef(lookEnabled);
  lookEnabledRef.current = lookEnabled;
  const { gl } = useThree();

  // Camera starts at [0, 1.6, 0] looking toward z=-1
  const position = useRef({ x: 0, z: 0 });
  const velocity = useRef({ x: 0, z: 0 });
  const keys = useRef({ w: false, a: false, s: false, d: false, e: false });
  const lastInteractionTime = useRef(0);

  const moveSpeed = 0.04;
  const friction = 0.85;
  const interactionDistance = 1.5;
  const interactionCooldown = 1000;

  useEffect(() => {
    if (!lookEnabled && document.pointerLockElement === gl.domElement) {
      document.exitPointerLock();
    }
  }, [lookEnabled, gl]);

  useEffect(() => {
    const el = gl.domElement;

    const onMouseDown = () => {
      if (!lookEnabledRef.current) return;
      dragging.current = true;
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!lookEnabledRef.current) return;
      const locked = document.pointerLockElement === el;
      if (locked || dragging.current) {
        yaw.current -= e.movementX * 0.00075;
      }
    };
    const onClick = () => {
      if (!lookEnabledRef.current) return;
      el.requestPointerLock();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!lookEnabledRef.current) return;
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = true;
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (!lookEnabledRef.current) return;
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof typeof keys.current] = false;
        e.preventDefault();
      }
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMove);
    el.addEventListener('click', onClick);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMove);
      el.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gl]);

  useFrame(() => {
    // Gate movement when mini-game is active
    const { activeMiniGame } = useGameStore.getState();
    if (activeMiniGame) return;

    // Get camera forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    // Rotate these vectors based on camera yaw
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw.current);

    // Calculate movement based on input
    let moveX = 0;
    let moveZ = 0;

    if (keys.current.w) {
      moveX += forward.x * moveSpeed;
      moveZ += forward.z * moveSpeed;
    }
    if (keys.current.s) {
      moveX -= forward.x * moveSpeed;
      moveZ -= forward.z * moveSpeed;
    }
    if (keys.current.a) {
      moveX -= right.x * moveSpeed;
      moveZ -= right.z * moveSpeed;
    }
    if (keys.current.d) {
      moveX += right.x * moveSpeed;
      moveZ += right.z * moveSpeed;
    }

    // Apply movement to velocity with lerp smoothing
    velocity.current.x += (moveX - velocity.current.x) * 0.1;
    velocity.current.z += (moveZ - velocity.current.z) * 0.1;

    // Apply friction
    velocity.current.x *= friction;
    velocity.current.z *= friction;

    // Update position
    position.current.x += velocity.current.x;
    position.current.z += velocity.current.z;

    // Constrain to corridor bounds - allow full corridor movement
    const maxX = 1.8;
    const minZ = -19; // Back of corridor (near comms panel)
    const maxZ = -1;  // Front of corridor (near start)
    position.current.x = Math.max(-maxX, Math.min(maxX, position.current.x));
    position.current.z = Math.max(minZ, Math.min(maxZ, position.current.z));

    // Check for panel interactions with 'E' key
    const currentTime = Date.now();
    if (keys.current.e && currentTime - lastInteractionTime.current > interactionCooldown) {
      const { setActiveMiniGame } = useGameStore.getState();

      // Check if near any panel
      for (const panel of PANEL_POSITIONS) {
        const [px, _, pz] = panel.position;
        const distance = Math.sqrt(
          Math.pow(position.current.x - px, 2) + Math.pow(position.current.z - pz, 2)
        );

        if (distance < interactionDistance) {
          setActiveMiniGame(panel.key);
          lastInteractionTime.current = currentTime;
          break;
        }
      }
    }

    if (group.current) {
      group.current.rotation.y = yaw.current;
      group.current.position.x = position.current.x;
      // Fixed height at 1.6, z position moves but camera looks toward z=-1
      group.current.position.y = 1.6;
      group.current.position.z = position.current.z;
    }
  });

  return (
    <group ref={group} position={[0, 1.6, 0]} rotation={[0, 0, 0]}>
      <PerspectiveCamera makeDefault fov={58} near={0.08} far={120} />
    </group>
  );
}

function ShipScene({ lookEnabled }: { lookEnabled: boolean }) {
  const { setActiveMiniGame } = useGameStore();

  return (
    <>
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#05070c', 8, 25]} />
      <ShipLights />
      <Corridor />
      {PANEL_POSITIONS.map((cfg) => (
        <SystemPanel key={cfg.key} config={cfg} onClick={() => setActiveMiniGame(cfg.key)} />
      ))}
      <CameraRig lookEnabled={lookEnabled} />
      <InteractionHint />
    </>
  );
}

export default function ShipCanvas({
  className,
  style,
  lookEnabled = true,
}: {
  className?: string;
  style?: React.CSSProperties;
  /** When false (e.g. chat input focused), mouse look and pointer lock are disabled */
  lookEnabled?: boolean;
}) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', touchAction: 'none', ...style }}>
      <Canvas gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <ShipScene lookEnabled={lookEnabled} />
      </Canvas>
    </div>
  );
}
