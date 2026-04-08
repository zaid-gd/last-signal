import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, PointerLockControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Pixelation, ColorDepth, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useEffect, useMemo, useRef, useState } from 'react';
import React from 'react';
import { useGameStore } from '../stores/useGameStore';
import {
  clearActiveShipCameraControls,
  setActiveShipCameraControls,
  type PointerLockControlsHandle,
} from './shipCameraControl';
import { PANEL_CONFIGS, panelLightPosition, type PanelConfig } from './panelConfig';
import { PanelWarningLight } from './PanelWarningLight';
import { SmokeSystem } from './SmokeSystem';
import { ExteriorHull } from './ExteriorHull';

// Procedural HDRI environment for realistic reflections
function ProceduralEnvironment() {
  const { gl, scene } = useThree();
  
  useEffect(() => {
    const pmremGenerator = new THREE.PMREMGenerator(gl);
    pmremGenerator.compileEquirectangularShader();
    
    // Create gradient sky with stars
    const envCanvas = document.createElement('canvas');
    envCanvas.width = 2048;
    envCanvas.height = 1024;
    const ctx = envCanvas.getContext('2d');
    if (!ctx) return;
    
    // Dark space gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, envCanvas.height);
    gradient.addColorStop(0, '#020408');
    gradient.addColorStop(0.3, '#0a0e18');
    gradient.addColorStop(0.6, '#050810');
    gradient.addColorStop(1, '#020306');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, envCanvas.width, envCanvas.height);
    
    // Add subtle nebula glow
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * envCanvas.width;
      const y = Math.random() * envCanvas.height * 0.6;
      const radius = 100 + Math.random() * 200;
      const nebulaGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const hue = Math.random() * 60 + 200;
      nebulaGrad.addColorStop(0, `hsla(${hue}, 50%, 30%, 0.15)`);
      nebulaGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = nebulaGrad;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    
    // Stars
    for (let i = 0; i < 800; i++) {
      const x = Math.random() * envCanvas.width;
      const y = Math.random() * envCanvas.height * 0.7;
      const size = Math.random() * 1.5 + 0.5;
      const brightness = Math.random() * 0.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fill();
    }
    
    // Dim galaxy band
    ctx.save();
    ctx.globalAlpha = 0.1;
    const galaxyGrad = ctx.createLinearGradient(0, envCanvas.height * 0.3, 0, envCanvas.height * 0.6);
    galaxyGrad.addColorStop(0, 'transparent');
    galaxyGrad.addColorStop(0.5, 'rgba(100, 80, 150, 0.3)');
    galaxyGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = galaxyGrad;
    ctx.fillRect(0, envCanvas.height * 0.3, envCanvas.width, envCanvas.height * 0.3);
    ctx.restore();
    
    const envTexture = new THREE.CanvasTexture(envCanvas);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    
    const envMap = pmremGenerator.fromEquirectangular(envTexture).texture;
    scene.environment = envMap;
    
    envTexture.dispose();
    pmremGenerator.dispose();
    
    return () => {
      scene.environment = null;
      envMap.dispose();
    };
  }, [gl, scene]);
  
  return null;
}

const CORRIDOR = { width: 3.5, height: 2.8, length: 24 } as const;
const WALL_COLOR = '#0a0d14';
const FLOOR_COLOR = '#05070a';
const METAL_COLOR = '#1a1d23';

type SystemKey = (typeof PANEL_CONFIGS)[number]['key'];

// Procedural texture for the "voxel/grid" look
function useVoxelTexture(color: string, gridColor: string, size = 128, gridWidth = 4) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = gridWidth;
    ctx.strokeRect(0, 0, size, size);

    for (let i = 0; i < 50; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, size / 16, size / 16);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }, [color, gridColor, size, gridWidth]);
}

function healthToStatusColor(health: number): string {
  if (health >= 60) return '#00ff66';
  if (health >= 30) return '#ffaa00';
  return '#ff0033';
}

function Corridor() {
  const floorTex = useVoxelTexture(FLOOR_COLOR, '#0c1018', 64, 2);
  const wallTex = useVoxelTexture(WALL_COLOR, '#141a26', 64, 2);
  const ceilingTex = useVoxelTexture('#020408', '#080c14', 64, 2);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#fff', 
    map: wallTex,
    metalness: 0.6, 
    roughness: 0.4,
    envMapIntensity: 0.5
  }), [wallTex]);
  
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#fff', 
    map: floorTex,
    metalness: 0.7, 
    roughness: 0.5,
    envMapIntensity: 0.8
  }), [floorTex]);

  const ceilingMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#fff', 
    map: ceilingTex,
    metalness: 0.4, 
    roughness: 0.6
  }), [ceilingTex]);

  const ribMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: METAL_COLOR, 
    metalness: 0.9, 
    roughness: 0.2
  }), []);

  const ribs = useMemo(() => {
    const arr = [];
    for (let z = -CORRIDOR.length + 2; z <= 0; z += 4) arr.push(z);
    return arr;
  }, []);

  return (
    <group>
      {/* Floor */}
      <mesh position={[0, 0, -CORRIDOR.length / 2]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[CORRIDOR.width, CORRIDOR.length]} />
      </mesh>
      
      {/* Ceiling */}
      <mesh position={[0, CORRIDOR.height, -CORRIDOR.length / 2]} rotation={[Math.PI / 2, 0, 0]} material={ceilingMat}>
        <planeGeometry args={[CORRIDOR.width, CORRIDOR.length]} />
      </mesh>

      {/* Walls */}
      <mesh position={[-CORRIDOR.width / 2, CORRIDOR.height / 2, -CORRIDOR.length / 2]} rotation={[0, Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[CORRIDOR.length, CORRIDOR.height]} />
      </mesh>
      <mesh position={[CORRIDOR.width / 2, CORRIDOR.height / 2, -CORRIDOR.length / 2]} rotation={[0, -Math.PI / 2, 0]} material={wallMat} receiveShadow>
        <planeGeometry args={[CORRIDOR.length, CORRIDOR.height]} />
      </mesh>

      {ribs.map((z, i) => (
        <group key={`rib-${i}`} position={[0, CORRIDOR.height / 2, z]}>
          <mesh position={[-CORRIDOR.width / 2 + 0.05, 0, 0]} material={ribMat} castShadow receiveShadow>
            <boxGeometry args={[0.2, CORRIDOR.height, 0.3]} />
          </mesh>
          <mesh position={[CORRIDOR.width / 2 - 0.05, 0, 0]} material={ribMat} castShadow receiveShadow>
            <boxGeometry args={[0.2, CORRIDOR.height, 0.3]} />
          </mesh>
          <mesh position={[0, CORRIDOR.height / 2 - 0.05, 0]} material={ribMat} castShadow receiveShadow>
            <boxGeometry args={[CORRIDOR.width, 0.2, 0.3]} />
          </mesh>
        </group>
      ))}

      {/* Pipes */}
      <mesh position={[-CORRIDOR.width / 2 + 0.15, 0.4, -CORRIDOR.length / 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, CORRIDOR.length, 8]} />
        <meshStandardMaterial color="#2a2e38" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0.5, CORRIDOR.height - 0.15, -CORRIDOR.length / 2]} castShadow>
        <boxGeometry args={[0.4, 0.1, CORRIDOR.length]} />
        <meshStandardMaterial color="#1a1d23" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Back Wall */}
      <group position={[0, CORRIDOR.height / 2, -CORRIDOR.length + 0.1]}>
        <mesh material={ribMat} castShadow receiveShadow>
          <boxGeometry args={[CORRIDOR.width, CORRIDOR.height, 0.2]} />
        </mesh>
        <mesh position={[0, 0, 0.11]} material={wallMat}>
          <boxGeometry args={[CORRIDOR.width - 0.2, CORRIDOR.height - 0.2, 0.05]} />
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
      statusRef.current.emissiveIntensity = health < 40 ? 10.0 : 4.0;
    }
  });

  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[1.2, 1, 0.1]} />
        <meshStandardMaterial color="#2a2d34" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.1, 0.06]}>
        <boxGeometry args={[0.9, 0.5, 0.02]} />
        <meshStandardMaterial color="#020408" emissive="#004488" emissiveIntensity={2} />
      </mesh>
      <group position={[0, -0.3, 0.06]}>
        {[[-0.3, 0], [0, 0], [0.3, 0]].map((p, i) => (
          <mesh key={i} position={[p[0], p[1], 0]}>
            <boxGeometry args={[0.15, 0.15, 0.02]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.4} />
          </mesh>
        ))}
      </group>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial ref={statusRef} metalness={0.1} roughness={0.2} />
      </mesh>
    </group>
  );
}

const SEVERITY_CONFIG = {
  nominal: {
    ambientColor: '#0a1520',
    ambientIntensity: 0.8,
    spotColor: '#b8d4e8',
    spotIntensity: 60,
    fogColor: '#020306',
    fogNear: 4,
    fogFar: 30,
    bloomIntensity: 0.8,
  },
  warning: {
    ambientColor: '#1a150a',
    ambientIntensity: 0.6,
    spotColor: '#ffaa00',
    spotIntensity: 50,
    fogColor: '#080604',
    fogNear: 2,
    fogFar: 20,
    bloomIntensity: 1.2,
  },
  critical: {
    ambientColor: '#1a0505',
    ambientIntensity: 0.4,
    spotColor: '#ff0000',
    spotIntensity: 40,
    fogColor: '#0a0404',
    fogNear: 1,
    fogFar: 15,
    bloomIntensity: 2.0,
  },
  endgame: {
    ambientColor: '#050000',
    ambientIntensity: 0.2,
    spotColor: '#ff0000',
    spotIntensity: 30,
    fogColor: '#050000',
    fogNear: 0.5,
    fogFar: 10,
    bloomIntensity: 3.0,
  }
};

function ShipLights() {
  const emergencyRefs = useRef<(THREE.PointLight | null)[]>([]);
  const { scene } = useThree();

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const spot1Ref = useRef<THREE.SpotLight>(null);
  const spot2Ref = useRef<THREE.SpotLight>(null);
  const spot3Ref = useRef<THREE.SpotLight>(null);
  const spot4Ref = useRef<THREE.SpotLight>(null);

  const emergencyPositions = useMemo<[number, number, number][]>(() => [
    [-1.7, 2.3, -2], [1.7, 2.3, -5],
    [-1.7, 2.3, -8], [1.7, 2.3, -11],
    [-1.7, 2.3, -14], [1.7, 2.3, -17],
    [-1.7, 2.3, -20], [1.7, 2.3, -23]
  ], []);

  const tempColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (spot1Ref.current) { spot1Ref.current.target.position.set(0, 0, -2); scene.add(spot1Ref.current.target); }
    if (spot2Ref.current) { spot2Ref.current.target.position.set(0, 0, -7); scene.add(spot2Ref.current.target); }
    if (spot3Ref.current) { spot3Ref.current.target.position.set(0, 0, -13); scene.add(spot3Ref.current.target); }
    if (spot4Ref.current) { spot4Ref.current.target.position.set(0, 0, -18); scene.add(spot4Ref.current.target); }
  }, [scene]);

  useFrame((state, delta) => {
    const severity = useGameStore.getState().environmentSeverity;
    const config = SEVERITY_CONFIG[severity];
    const lerpFactor = delta * 2;

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(ambientRef.current.intensity, config.ambientIntensity, lerpFactor);
      tempColor.set(config.ambientColor);
      ambientRef.current.color.lerp(tempColor, lerpFactor);
    }

    [spot1Ref, spot2Ref, spot3Ref, spot4Ref].forEach(ref => {
      if (ref.current) {
        ref.current.intensity = THREE.MathUtils.lerp(ref.current.intensity, config.spotIntensity, lerpFactor);
        tempColor.set(config.spotColor);
        ref.current.color.lerp(tempColor, lerpFactor);
        
        if (severity === 'endgame') {
          ref.current.intensity *= (0.8 + Math.random() * 0.4);
        }
      }
    });

    if (scene.fog && scene.fog instanceof THREE.Fog) {
      tempColor.set(config.fogColor);
      scene.fog.color.lerp(tempColor, lerpFactor);
      scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, config.fogNear, lerpFactor);
      scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, config.fogFar, lerpFactor);
    }

    scene.background = (scene.background as THREE.Color || new THREE.Color()).lerp(tempColor, lerpFactor);

    const isEmergency = severity === 'critical' || severity === 'endgame' || severity === 'warning';
    
    if (isEmergency) {
      const pulseSpeed = severity === 'endgame' ? 8 : (severity === 'critical' ? 4 : 2);
      const pulseIntensity = severity === 'endgame' ? 20 : (severity === 'critical' ? 15 : 10);
      const pulse = (Math.sin(state.clock.elapsedTime * pulseSpeed) * 0.5 + 0.5) * pulseIntensity;
      
      emergencyRefs.current.forEach(ref => {
        if (ref) {
          ref.intensity = THREE.MathUtils.lerp(ref.intensity, pulse, lerpFactor * 2);
          ref.color.set(severity === 'warning' ? '#ffaa00' : '#ff1100');
        }
      });
    } else {
      emergencyRefs.current.forEach(ref => {
        if (ref) {
          ref.intensity = THREE.MathUtils.lerp(ref.intensity, 0, lerpFactor);
        }
      });
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} color="#0a1520" intensity={0.8} />

      <spotLight ref={spot1Ref} position={[0, 2.75, -2]} color="#b8d4e8" intensity={60} angle={0.4} penumbra={0.7} distance={12} decay={2} castShadow />
      <spotLight ref={spot2Ref} position={[0, 2.75, -7]} color="#a0c0dd" intensity={55} angle={0.4} penumbra={0.7} distance={12} decay={2} castShadow />
      <spotLight ref={spot3Ref} position={[0, 2.75, -13]} color="#a0c0dd" intensity={55} angle={0.4} penumbra={0.7} distance={12} decay={2} castShadow />
      <spotLight ref={spot4Ref} position={[0, 2.75, -18]} color="#8ab0cc" intensity={50} angle={0.4} penumbra={0.7} distance={12} decay={2} castShadow />

      {/* Fill lights */}
      <pointLight position={[0, 1.4, -4]}  color="#112233" intensity={2} distance={8} decay={2} />
      <pointLight position={[0, 1.4, -10]} color="#112233" intensity={2} distance={8} decay={2} />
      <pointLight position={[0, 1.4, -16]} color="#112233" intensity={2} distance={8} decay={2} />

      {/* Global corridor emergency lights (severity-driven) */}
      {emergencyPositions.map((pos, i) => (
        <pointLight
          key={i}
          ref={el => emergencyRefs.current[i] = el}
          position={pos}
          color="#ff4422"
          intensity={0}
          distance={6}
          decay={2}
        />
      ))}
    </>
  );
}

// ── Delayed health refs ────────────────────────────────────────────────────────
// One mutable ref per panel system key, updated every frame from the ring buffer.
// Passed to PanelWarningLight and SmokeSystem so they never read React state.
const SAMPLE_MS = 250;
const MAX_SNAPS = 120; // covers up to 30 s of comms delay

interface HealthSnapshot { ts: number; health: Record<SystemKey, number> }

/**
 * Maintains per-system comms-delayed health refs.
 * Updates a ring buffer every SAMPLE_MS and writes the delayed value
 * into each ref every frame so child components read zero-cost refs.
 */
function DelayedHealthDriver({
  healthRefs,
}: {
  healthRefs: Record<SystemKey, React.MutableRefObject<number>>;
}) {
  const buffer = useRef<HealthSnapshot[]>([]);
  const lastSample = useRef(0);

  useFrame(() => {
    const now = Date.now();

    // Sample at SAMPLE_MS cadence
    if (now - lastSample.current >= SAMPLE_MS) {
      lastSample.current = now;
      const state = useGameStore.getState();
      buffer.current.push({
        ts: now,
        health: { ...state.systemHealth } as Record<SystemKey, number>,
      });
      if (buffer.current.length > MAX_SNAPS) buffer.current.shift();
    }

    // Write delayed value into each ref every frame
    const state     = useGameStore.getState();
    const delayMs   = state.commsDelaySeconds * 1000;
    const targetTs  = Date.now() - delayMs;

    // Binary-search closest snapshot (buffer is chronologically sorted)
    const buf = buffer.current;
    if (buf.length === 0) return;

    let lo = 0, hi = buf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (buf[mid].ts < targetTs) lo = mid + 1;
      else hi = mid;
    }
    // Pick closest of lo-1 and lo
    const snap = (lo > 0 && Math.abs(buf[lo - 1].ts - targetTs) < Math.abs(buf[lo].ts - targetTs))
      ? buf[lo - 1]
      : buf[lo];

    for (const key of Object.keys(healthRefs) as SystemKey[]) {
      healthRefs[key].current = snap.health[key];
    }
  });

  return null;
}

function CameraRig({ lookEnabled }: { lookEnabled: boolean }) {
  const { camera } = useThree();
  const activeMiniGame = useGameStore((s) => s.activeMiniGame);
  const setNearestSystem = useGameStore((s) => s.setNearestSystem);
  const evaState = useGameStore((s) => s.evaState);
  const setEvaState = useGameStore((s) => s.setEvaState);
  const pointerLockControlsRef = useRef<PointerLockControlsHandle | null>(null);
  const moveState = useRef({ forward: false, backward: false, left: false, right: false, e: false });
  const velocity = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3(0, 1.6, -1));
  const direction = useRef(new THREE.Vector3());
  const front = useRef(new THREE.Vector3());
  const side = useRef(new THREE.Vector3());
  const nearestRef = useRef<SystemKey | null>(null);
  const lastE = useRef(0);
  
  const isEva = evaState === 'exterior';

  useEffect(() => {
    if (isEva) {
      camera.fov = 100;
    } else {
      camera.fov = 75;
    }
    camera.updateProjectionMatrix();
  }, [isEva, camera]);

  const panelTargets = useMemo(() => {
    if (isEva) {
      return [{ key: 'comms' as SystemKey, target: new THREE.Vector3(1.5, 1.6, -32) }];
    }
    return PANEL_CONFIGS.map(panel => ({
      key: panel.key,
      target: new THREE.Vector3(panel.position[0], 1.6, panel.position[2]),
    }));
  }, [isEva]);

  // Handle cross-transition teleportation
  useEffect(() => {
    if (evaState === 'exterior') {
      // Teleport to the start of the massive EVA handrail
      position.current.set(1.5, 1.6, -15);
      velocity.current.set(0, 0, 0);
    } else if (evaState === 'interior') {
      // Teleport near the comms panel
      position.current.set(-0.8, 1.6, -20);
      velocity.current.set(0, 0, 0);
    }
  }, [evaState]);

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
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useFrame((_, delta) => {
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

    if (!lookEnabled || activeMiniGame || evaState === 'transitioning_in' || evaState === 'transitioning_out') {
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

    if (isEva) {
      // Strictly constrain EVA path
      position.current.x = THREE.MathUtils.clamp(position.current.x, 1.2, 1.8);
      position.current.z = THREE.MathUtils.clamp(position.current.z, -33, -14);
    } else {
      // Normal corridor constraints
      position.current.x = THREE.MathUtils.clamp(position.current.x, -CORRIDOR.width / 2 + 0.6, CORRIDOR.width / 2 - 0.6);
      position.current.z = THREE.MathUtils.clamp(position.current.z, -CORRIDOR.length + 1.5, -0.5);
    }

    camera.position.copy(position.current);

    if (moveState.current.e && Date.now() - lastE.current > 500) {
      const { activeMiniGame, lastMiniGameClose, setActiveMiniGame, evaState, setEvaState } = useGameStore.getState();
      if (!activeMiniGame && Date.now() - lastMiniGameClose > 500) {
        panelTargets.forEach(p => {
          const dist = position.current.distanceTo(p.target);
          if (dist < 1.5) {
            lastE.current = Date.now();
            
            // Intercept standard comms interaction to trigger the EVA sequence instead!
            if (p.key === 'comms' && evaState === 'interior') {
              setEvaState('transitioning_out');
            } else if (p.key === 'comms' && evaState === 'exterior') {
              setActiveMiniGame(p.key);
            } else {
              setActiveMiniGame(p.key);
            }
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
        enabled={lookEnabled && !activeMiniGame && evaState !== 'transitioning_in' && evaState !== 'transitioning_out'}
      />
    </>
  );
}

// Stable offset vector — never recreated, avoids ChromaticAberration mount crash
const _chromaticOffset = new THREE.Vector2(0.0008, 0.0008);

function EnvironmentPostProcessing() {
  // Lerp lives in a plain ref — written every frame, never triggers re-renders
  const bloomRef   = useRef(SEVERITY_CONFIG[useGameStore.getState().environmentSeverity].bloomIntensity);
  const [bloomIntensity, setBloomIntensity] = useState(bloomRef.current);
  const enableRetroFilter = useGameStore(s => s.enableRetroFilter);

  // Read target severity every frame via getState() (no subscription needed)
  useFrame((_, delta) => {
    const target = SEVERITY_CONFIG[useGameStore.getState().environmentSeverity].bloomIntensity;
    bloomRef.current = THREE.MathUtils.lerp(bloomRef.current, target, delta * 2);
    // NOTE: do NOT call setState here — setState inside useFrame corrupts the
    // EffectComposer internal children array, causing the `.length` crash.
  });

  // Push the ref value into React state at a safe 100 ms cadence (outside the render loop)
  useEffect(() => {
    const id = setInterval(() => {
      setBloomIntensity(bloomRef.current);
    }, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <EffectComposer multisampling={enableRetroFilter ? 0 : 8} disableNormalPass>
      {enableRetroFilter && (
        <>
          <Pixelation granularity={4} />
          <ColorDepth bits={16} />
          <Noise opacity={0.06} />
        </>
      )}
      <Bloom
        luminanceThreshold={0.2}
        luminanceSmoothing={0.9}
        intensity={bloomIntensity}
        radius={0.8}
      />
      <Vignette offset={0.3} darkness={0.7} />
      <ChromaticAberration offset={_chromaticOffset} />
    </EffectComposer>
  );
}

// ── Scene root: wires up delayed health refs and renders per-panel effects ────
function SceneContent({ lookEnabled }: { lookEnabled: boolean }) {
  // One ref per system key — written by DelayedHealthDriver, read by light/smoke
  const healthRefs = useMemo<Record<SystemKey, React.MutableRefObject<number>>>(() => ({
    hull:        { current: 100 },
    lifeSupport: { current: 100 },
    power:       { current: 100 },
    navigation:  { current: 100 },
    comms:       { current: 100 },
  }), []);

  const evaState = useGameStore((s) => s.evaState);
  const isEva = evaState !== 'interior';

  return (
    <>
      <color attach="background" args={['#020306']} />
      {!isEva && <fog attach="fog" args={['#020306', 4, 30]} />}

      {isEva ? (
        <ExteriorHull />
      ) : (
        <>
          <ProceduralEnvironment />
          <ShipLights />
          <Corridor />

          {/* System panels + per-panel localized effects */}
          {PANEL_CONFIGS.map((cfg) => (
            <group key={cfg.key}>
              <SystemPanel config={cfg} />
              <PanelWarningLight
                position={panelLightPosition(cfg)}
                delayedHealthRef={healthRefs[cfg.key]}
              />
              <SmokeSystem
                systemKey={cfg.key}
                panelPosition={cfg.position}
                delayedHealthRef={healthRefs[cfg.key]}
              />
            </group>
          ))}
        </>
      )}

      {/* Writes comms-delayed health values into the refs each frame */}
      <DelayedHealthDriver healthRefs={healthRefs} />

      <CameraRig lookEnabled={lookEnabled} />
      <EnvironmentPostProcessing />
    </>
  );
}

export default function ShipCanvas({ style, lookEnabled = true }: { style?: React.CSSProperties; lookEnabled?: boolean }) {
  return (
    <div style={{ ...style, width: '100%', height: '100%' }}>
      <Canvas
        shadows
        gl={{
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.2
        }}
      >
        <SceneContent lookEnabled={lookEnabled} />
      </Canvas>
    </div>
  );
}
