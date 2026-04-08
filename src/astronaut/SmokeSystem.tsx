import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SystemKey } from '../stores/useGameStore';

/** Total particles in the pool per panel. Keep low for performance. */
const POOL_SIZE = 48;

interface Particle {
  x: number;
  z: number;
  y: number;
  vy: number;
  alpha: number;
  life: number;
  speed: number;
  size: number;
  active: boolean;
}

function makeParticle(originX: number, originZ: number): Particle {
  return {
    x: originX + (Math.random() - 0.5) * 0.5,
    z: originZ + (Math.random() - 0.5) * 0.3,
    y: 1.4,
    vy: 0.15 + Math.random() * 0.12,
    alpha: 0,
    life: 0,
    speed: 0.3 + Math.random() * 0.15,
    size: 0.06 + Math.random() * 0.08,
    active: false,
  };
}

export interface SmokePanelProps {
  systemKey: SystemKey;
  panelPosition: [number, number, number];
  /** Ref to the delayed health value — read each frame, no React re-renders */
  delayedHealthRef: React.MutableRefObject<number>;
}

/**
 * Instanced smoke particle system for a single critical panel.
 *
 * Constraints met:
 *  - Fixed InstancedMesh pool (POOL_SIZE) — zero GC allocations per frame.
 *  - All temp vectors are instance-local refs (no shared module-level state).
 *  - up-vector hoisted outside the particle loop (no per-particle allocation).
 *  - AdditiveBlending + opacity:1 — instance color brightness = perceived alpha.
 *  - Only renders when delayedHealthRef.current < 30 (critical + comms-delayed).
 */
export function SmokeSystem({ systemKey: _systemKey, panelPosition, delayedHealthRef }: SmokePanelProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Fixed pool — allocated once on mount, reused forever
  const pool = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      arr.push(makeParticle(panelPosition[0], panelPosition[2]));
    }
    return arr;
  }, [panelPosition]);

  const spawnAcc = useRef(0);

  // ── Per-instance temp objects (fix: not shared across component instances) ─
  const _mat  = useMemo(() => new THREE.Matrix4(), []);
  const _pos  = useMemo(() => new THREE.Vector3(), []);
  const _quat = useMemo(() => new THREE.Quaternion(), []);
  const _scl  = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  // Hoisted outside the particle loop — fix: no per-particle allocation
  const _up   = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const _look = useMemo(() => new THREE.Matrix4(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  // ── Material: opacity MUST be 1 for additive brightness trick to work ─────
  const smokeMat = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(1, 1, 1), // white; instance color dims it
      transparent: true,
      opacity: 1,            // ← was 0 (bug: invisible). Instance color controls perceived alpha.
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
  }, []);

  const smokeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // Read from the comms-delayed health ref (set each frame by ShipCanvas)
    const health     = delayedHealthRef.current;
    const isCritical = health < 30;

    if (!isCritical) {
      mesh.count = 0;
      for (let i = 0; i < POOL_SIZE; i++) pool[i].active = false;
      spawnAcc.current = 0;
      return;
    }

    // ── Spawn ──────────────────────────────────────────────────────────────
    const spawnRate = THREE.MathUtils.mapLinear(health, 30, 0, 2, 8);
    spawnAcc.current += spawnRate * delta;
    while (spawnAcc.current >= 1) {
      spawnAcc.current -= 1;
      for (let i = 0; i < POOL_SIZE; i++) {
        if (!pool[i].active) {
          pool[i] = makeParticle(panelPosition[0], panelPosition[2]);
          pool[i].active = true;
          break;
        }
      }
    }

    // ── Simulate & Upload ──────────────────────────────────────────────────
    let visibleCount = 0;
    const cameraPos  = state.camera.position;

    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;

      p.life = Math.min(p.life + delta * p.speed, 1);
      p.y   += p.vy * delta;

      // Alpha curve: fade in → hold → fade out, max brightness 0.22
      if (p.life < 0.2) {
        p.alpha = (p.life / 0.2) * 0.22;
      } else if (p.life < 0.75) {
        p.alpha = 0.22;
      } else {
        p.alpha = (1 - (p.life - 0.75) / 0.25) * 0.22;
      }

      if (p.life >= 1) {
        p.active = false;
        continue;
      }

      // Billboard matrix — no per-iteration allocations
      _pos.set(p.x, p.y, p.z);
      _look.lookAt(_pos, cameraPos, _up);
      _quat.setFromRotationMatrix(_look);
      _scl.setScalar(p.size * (1 + p.life * 1.8));
      _mat.compose(_pos, _quat, _scl);

      mesh.setMatrixAt(visibleCount, _mat);

      // Instance color brightness = perceived alpha under additive blending
      tempColor.setScalar(p.alpha);
      mesh.setColorAt(visibleCount, tempColor);

      visibleCount++;
    }

    mesh.count = visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[smokeGeo, smokeMat, POOL_SIZE]}
      frustumCulled={false}
    />
  );
}
