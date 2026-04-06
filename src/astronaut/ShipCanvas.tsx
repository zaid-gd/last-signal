import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, PointerLockControls } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import React from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/useGameStore';
import {
  clearActiveShipCameraControls,
  setActiveShipCameraControls,
  type PointerLockControlsHandle,
} from './shipCameraControl';

const CORRIDOR = { width: 3.5, height: 2.8, length: 24 } as const;
const WALL_COLOR = '#0a0c10';
const FLOOR_COLOR = '#050608';
const METAL_COLOR = '#15181c';

type Vector3Tuple = [number, number, number];

interface PanelConfig {
  key: 'hull' | 'lifeSupport' | 'power' | 'navigation' | 'comms';
  position: Vector3Tuple;
  rotation: Vector3Tuple;
}

const PANEL_POSITIONS: PanelConfig[] = [
  { key: 'hull' as const, position: [-1.7, 1.3, -4], rotation: [0, Math.PI / 2, 0] },
  { key: 'lifeSupport' as const, position: [1.7, 1.3, -8], rotation: [0, -Math.PI / 2, 0] },
  { key: 'power' as const, position: [-1.7, 1.3, -12], rotation: [0, Math.PI / 2, 0] },
  { key: 'navigation' as const, position: [1.7, 1.3, -16], rotation: [0, -Math.PI / 2, 0] },
  { key: 'comms' as const, position: [-1.7, 1.3, -20], rotation: [0, Math.PI / 2, 0] },
];

type SystemKey = (typeof PANEL_POSITIONS)[number]['key'];

function healthToStatusColor(health: number): string {
  if (health >= 60) return '#00ff44';
  if (health >= 30) return '#ffb000';
  return '#ff2222';
}

function Corridor() {
  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ color: WALL_COLOR, metalness: 0.25, roughness: 0.88 }), []);
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ color: FLOOR_COLOR, metalness: 0.25, roughness: 0.88 }), []);
  const ribMat = useMemo(() => new THREE.MeshStandardMaterial({ color: METAL_COLOR, metalness: 0.25, roughness: 0.88 }), []);
  const pipeMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#202530', metalness: 0.25, roughness: 0.88 }), []);

  const ribs = useMemo(() => {
    const arr = [];
    for (let z = -CORRIDOR.length + 2; z <= 0; z += 4) arr.push(z);
    return arr;
  }, []);

  const gridLines = useMemo(() => {
    const arr = [];
    for (let z = -CORRIDOR.length; z <= 0; z += 1.5) arr.push(z);
    return arr;
  }, []);

  return (
    <group>
      <mesh position={[0, 0, -CORRIDOR.length / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[CORRIDOR.width, CORRIDOR.length]} />
      </mesh>
      {gridLines.map((z, i) => (
        <mesh key={`grid-${i}`} position={[0, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CORRIDOR.width, 0.05]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
      <mesh position={[0, CORRIDOR.height, -CORRIDOR.length / 2]} rotation={[Math.PI / 2, 0, 0]} material={floorMat}>
        <planeGeometry args={[CORRIDOR.width, CORRIDOR.length]} />
      </mesh>
      <mesh position={[-CORRIDOR.width / 2, CORRIDOR.height / 2, -CORRIDOR.length / 2]} rotation={[0, Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[CORRIDOR.length, CORRIDOR.height]} />
      </mesh>
      <mesh position={[CORRIDOR.width / 2, CORRIDOR.height / 2, -CORRIDOR.length / 2]} rotation={[0, -Math.PI / 2, 0]} material={wallMat}>
        <planeGeometry args={[CORRIDOR.length, CORRIDOR.height]} />
      </mesh>
      {ribs.map((z, i) => (
        <group key={`rib-${i}`} position={[0, CORRIDOR.height / 2, z]}>
          <mesh position={[-CORRIDOR.width / 2 + 0.05, 0, 0]} material={ribMat}>
            <boxGeometry args={[0.2, CORRIDOR.height, 0.3]} />
          </mesh>
          <mesh position={[CORRIDOR.width / 2 - 0.05, 0, 0]} material={ribMat}>
            <boxGeometry args={[0.2, CORRIDOR.height, 0.3]} />
          </mesh>
          <mesh position={[0, CORRIDOR.height / 2 - 0.05, 0]} material={ribMat}>
            <boxGeometry args={[CORRIDOR.width, 0.2, 0.3]} />
          </mesh>
        </group>
      ))}
      <mesh position={[-CORRIDOR.width / 2 + 0.15, 0.4, -CORRIDOR.length / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.08, CORRIDOR.length, 8]} />
        <meshStandardMaterial color="#202530" metalness={0.25} roughness={0.88} />
      </mesh>
      <mesh position={[0.5, CORRIDOR.height - 0.15, -CORRIDOR.length / 2]} material={pipeMat}>
        <boxGeometry args={[0.4, 0.1, CORRIDOR.length]} />
      </mesh>
      <group position={[CORRIDOR.width / 2 - 0.01, 1.6, -10]}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#000" emissive="#050810" />
        </mesh>
      </group>
      <group position={[CORRIDOR.width / 2 - 0.01, 1.6, -18]}>
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#000" emissive="#050810" />
        </mesh>
      </group>
      <group position={[0, CORRIDOR.height / 2, -CORRIDOR.length + 0.1]}>
        <mesh material={ribMat}>
          <boxGeometry args={[2, 2.4, 0.2]} />
        </mesh>
        <mesh position={[0, 0, 0.11]} material={wallMat}>
          <boxGeometry args={[1.8, 2.2, 0.05]} />
        </mesh>
      </group>
    </group>
  );
}

function SystemPanel({ config }: { config: PanelConfig }) {
  const { key: sysKey, position, rotation } = config;
  const statusRef = useRef<THREE.MeshStandardMaterial>(null);
  const statusColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const health = useGameStore.getState().systemHealth[sysKey];
    statusColor.set(healthToStatusColor(health));
    if (statusRef.current) {
      statusRef.current.color.copy(statusColor);
      statusRef.current.emissive.copy(statusColor);
      statusRef.current.emissiveIntensity = health < 50 ? 1.5 : 0.8;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[1.2, 1, 0.1]} />
        <meshStandardMaterial color="#1a1c20" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.1, 0.06]}>
        <boxGeometry args={[0.9, 0.5, 0.02]} />
        <meshStandardMaterial color="#050810" emissive="#001122" emissiveIntensity={0.5} />
      </mesh>
      <group position={[0, -0.3, 0.06]}>
        {[[-0.3, 0], [0, 0], [0.3, 0]].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], 0]}>
            <boxGeometry args={[0.15, 0.15, 0.02]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial ref={statusRef} metalness={0.1} roughness={0.2} />
      </mesh>
    </group>
  );
}

function ShipLights() {
  const emergencyRefs = useRef<(THREE.PointLight | null)[]>([]);
  const { scene } = useThree();

  const spot1Ref = useRef<THREE.SpotLight>(null);
  const spot2Ref = useRef<THREE.SpotLight>(null);
  const spot3Ref = useRef<THREE.SpotLight>(null);
  const spot4Ref = useRef<THREE.SpotLight>(null);

  const emergencyPositions = useMemo<Vector3Tuple[]>(() => [
    [-1.7, 2.3, -2], [1.7, 2.3, -5],
    [-1.7, 2.3, -8], [1.7, 2.3, -11],
    [-1.7, 2.3, -14], [1.7, 2.3, -17],
    [-1.7, 2.3, -20], [1.7, 2.3, -23]
  ], []);

  useEffect(() => {
    if (spot1Ref.current) { spot1Ref.current.target.position.set(0, 0, -2); scene.add(spot1Ref.current.target); }
    if (spot2Ref.current) { spot2Ref.current.target.position.set(0, 0, -7); scene.add(spot2Ref.current.target); }
    if (spot3Ref.current) { spot3Ref.current.target.position.set(0, 0, -13); scene.add(spot3Ref.current.target); }
    if (spot4Ref.current) { spot4Ref.current.target.position.set(0, 0, -18); scene.add(spot4Ref.current.target); }
  }, [scene]);

  useFrame((state) => {
    const { systemHealth } = useGameStore.getState();
    const danger = systemHealth.hull < 50 || systemHealth.power < 50 || systemHealth.lifeSupport < 40;

    if (danger) {
      const pulse = (Math.sin(state.clock.elapsedTime * 4) * 0.5 + 0.5) * 5.0;
      emergencyRefs.current.forEach(ref => {
        if (ref) ref.intensity = pulse;
      });
    } else {
      emergencyRefs.current.forEach(ref => {
        if (ref) ref.intensity = 0;
      });
    }
  });

  return (
    <>
      {/* Ambient — increased for better visibility */}
      <ambientLight color="#0a1520" intensity={0.45} />

      {/* Four ceiling strip lights — cool blue-white, tight cones, increased intensity */}
      <spotLight ref={spot1Ref} position={[0, 2.85, -2]} color="#b8d4e8" intensity={18} angle={0.3} penumbra={0.6} distance={8} decay={1.5} castShadow={false} />
      <spotLight ref={spot2Ref} position={[0, 2.85, -7]} color="#a0c0dd" intensity={16} angle={0.3} penumbra={0.6} distance={8} decay={1.5} />
      <spotLight ref={spot3Ref} position={[0, 2.85, -13]} color="#a0c0dd" intensity={16} angle={0.3} penumbra={0.6} distance={8} decay={1.5} />
      <spotLight ref={spot4Ref} position={[0, 2.85, -18]} color="#8ab0cc" intensity={14} angle={0.3} penumbra={0.7} distance={8} decay={1.5} />

      {/* Emergency lights — RED, managed by refs in useFrame */}
      {emergencyPositions.map((pos, i) => (
        <pointLight
          key={i}
          ref={el => emergencyRefs.current[i] = el}
          position={pos}
          color="#ff1500"
          intensity={0}
          distance={10}
          decay={1.5}
        />
      ))}

      {/* Subtle warm panel glow — one per system panel position, increased slightly */}
      <pointLight position={[-1.6, 1.3, -3]}  color="#002244" intensity={0.8} distance={3} decay={2} />
      <pointLight position={[ 1.6, 1.3, -7]}  color="#002244" intensity={0.8} distance={3} decay={2} />
      <pointLight position={[-1.6, 1.3, -11]} color="#002244" intensity={0.8} distance={3} decay={2} />
      <pointLight position={[ 1.6, 1.3, -15]} color="#002244" intensity={0.8} distance={3} decay={2} />
      <pointLight position={[-1.6, 1.3, -19]} color="#002244" intensity={0.8} distance={3} decay={2} />
    </>
  );
}

function CameraRig({ lookEnabled }: { lookEnabled: boolean }) {
  const { camera } = useThree();
  const activeMiniGame = useGameStore((s) => s.activeMiniGame);
  const setNearestSystem = useGameStore((s) => s.setNearestSystem);
  const pointerLockControlsRef = useRef<PointerLockControlsHandle | null>(null);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false, e: false });
  const velocity = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 1.6, -1));
  const direction = useRef(new THREE.Vector3());
  const front = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());
  const nearestRef = useRef<SystemKey | null>(null);
  const lastE = useRef(0);
  const panelTargets = useMemo(
    () => PANEL_POSITIONS.map(panel => ({
      key: panel.key,
      target: new THREE.Vector3(panel.position[0], 1.6, panel.position[2]),
    })),
    []
  );

  useEffect(() => {
    return () => {
      clearActiveShipCameraControls(pointerLockControlsRef.current);
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') moveState.current.forward = true;
      if (k === 's') moveState.current.backward = true;
      if (k === 'a') moveState.current.left = true;
      if (k === 'd') moveState.current.right = true;
      if (k === 'e') moveState.current.e = true;
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w') moveState.current.forward = false;
      if (k === 's') moveState.current.backward = false;
      if (k === 'a') moveState.current.left = false;
      if (k === 'd') moveState.current.right = false;
      if (k === 'e') moveState.current.e = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup',   up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup',   up); };
  }, []);

  useFrame((_, delta) => {
    // Calculate nearest system for HUD
    let close: SystemKey | null = null;
    let minDist = 1.8;
    panelTargets.forEach(p => {
      const dist = position.current.distanceTo(p.target);
      if (dist < minDist) {
        minDist = dist;
        close = p.key;
      }
    });
    if (nearestRef.current !== close) {
      nearestRef.current = close;
      setNearestSystem(close);
    }

    if (!lookEnabled || activeMiniGame) {
      velocity.current.set(0, 0, 0);
      return;
    }
    const speed = 40;
    const friction = 10;
    direction.current.set(0, 0, 0);
    front.current.set(0, 0, -1).applyQuaternion(camera.quaternion);
    side.current.set(1, 0, 0).applyQuaternion(camera.quaternion);
    front.current.y = 0; side.current.y = 0; front.current.normalize(); side.current.normalize();
    if (moveState.current.forward) direction.current.add(front.current);
    if (moveState.current.backward) direction.current.sub(front.current);
    if (moveState.current.left) direction.current.sub(side.current);
    if (moveState.current.right) direction.current.add(side.current);
    direction.current.normalize();
    velocity.current.addScaledVector(direction.current, speed * delta);
    velocity.current.addScaledVector(velocity.current, -friction * delta);
    position.current.addScaledVector(velocity.current, delta);
    position.current.x = THREE.MathUtils.clamp(position.current.x, -CORRIDOR.width / 2 + 0.6, CORRIDOR.width / 2 - 0.6);
    position.current.z = THREE.MathUtils.clamp(position.current.z, -CORRIDOR.length + 1.5, -0.5);
    camera.position.copy(position.current);
    if (moveState.current.e && Date.now() - lastE.current > 500) {
      const { activeMiniGame, lastMiniGameClose, setActiveMiniGame } = useGameStore.getState();
      // 500ms cooldown after close
      if (!activeMiniGame && Date.now() - lastMiniGameClose > 500) {
        panelTargets.forEach(p => {
          const dist = position.current.distanceTo(p.target);
          if (dist < 1.5) {
            lastE.current = Date.now();
            setActiveMiniGame(p.key);
          }
        });
      }
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault fov={75} position={[0, 1.6, -1]} />
      <PointerLockControls
        ref={(controls) => {
          const nextControls = controls as PointerLockControlsHandle | null;
          pointerLockControlsRef.current = nextControls;
          setActiveShipCameraControls(nextControls);
        }}
        enabled={lookEnabled && !activeMiniGame}
      />
    </>
  );
}

export default function ShipCanvas({ style, lookEnabled = true }: { style?: React.CSSProperties; lookEnabled?: boolean }) {
  return (
    <div style={{ ...style, width: '100%', height: '100%' }}>
      <Canvas shadows gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <color attach="background" args={['#020204']} />
        <fog attach="fog" args={['#020204', 5, 20]} />
        <ShipLights />
        <Corridor />
        {PANEL_POSITIONS.map((cfg) => (
          <SystemPanel
            key={cfg.key}
            config={cfg}
          />
        ))}
        <CameraRig lookEnabled={lookEnabled} />
      </Canvas>
    </div>
  );
}
