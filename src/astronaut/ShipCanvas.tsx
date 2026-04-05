import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/useGameStore';

const CORRIDOR = { width: 4, height: 3, length: 20 } as const;
const WALL_COLOR = '#1a1f2e';
const FLOOR_COLOR = '#0f1218';
const CEILING_COLOR = '#0d1018';

const AMBIENT = { color: '#112233', intensity: 0.4 } as const;
const CEILING_LIGHT = { color: '#334477', intensity: 0.8, distance: 6 } as const;
const EMERGENCY = { color: '#ff2222', intensity: 0 } as const;

const PANEL_LAYOUT = [
  { z: -8, side: 'left' as const, key: 'hull' as const },
  { z: -4, side: 'right' as const, key: 'lifeSupport' as const },
  { z: 0, side: 'left' as const, key: 'power' as const },
  { z: 4, side: 'right' as const, key: 'navigation' as const },
  { z: 8, side: 'left' as const, key: 'comms' as const },
] as const;

type SystemKey = (typeof PANEL_LAYOUT)[number]['key'];

function healthToStatusColor(health: number): string {
  if (health >= 60) return '#22ff44';
  if (health >= 25) return '#ffaa00';
  return '#ff2222';
}

function useFloorGridTextures() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { map: null as THREE.CanvasTexture | null, emissiveMap: null as THREE.CanvasTexture | null };

    ctx.fillStyle = FLOOR_COLOR;
    ctx.fillRect(0, 0, size, size);

    const cells = 16;
    const step = size / cells;
    ctx.strokeStyle = '#1c2438';
    ctx.lineWidth = 2;
    for (let i = 0; i <= cells; i++) {
      const p = i * step;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(size, p);
      ctx.stroke();
    }

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(CORRIDOR.length / 4, CORRIDOR.width / 4);
    map.anisotropy = 8;

    const emCanvas = document.createElement('canvas');
    emCanvas.width = size;
    emCanvas.height = size;
    const emCtx = emCanvas.getContext('2d');
    if (!emCtx) return { map, emissiveMap: null as THREE.CanvasTexture | null };

    emCtx.fillStyle = '#000000';
    emCtx.fillRect(0, 0, size, size);
    emCtx.strokeStyle = '#ffffff';
    emCtx.lineWidth = 3;
    for (let i = 0; i <= cells; i++) {
      const p = i * step;
      emCtx.beginPath();
      emCtx.moveTo(p, 0);
      emCtx.lineTo(p, size);
      emCtx.stroke();
      emCtx.beginPath();
      emCtx.moveTo(0, p);
      emCtx.lineTo(size, p);
      emCtx.stroke();
    }

    const emissiveMap = new THREE.CanvasTexture(emCanvas);
    emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;
    emissiveMap.repeat.copy(map.repeat);

    return { map, emissiveMap };
  }, []);
}

function Corridor() {
  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: WALL_COLOR,
        metalness: 0.35,
        roughness: 0.55,
      }),
    []
  );

  const ceilingMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: CEILING_COLOR,
        metalness: 0.2,
        roughness: 0.75,
      }),
    []
  );

  const { map: floorMap, emissiveMap: floorEmissive } = useFloorGridTextures();

  const floorMaterials = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      metalness: 0.15,
      roughness: 0.85,
    });
    const top = new THREE.MeshStandardMaterial({
      color: FLOOR_COLOR,
      metalness: 0.15,
      roughness: 0.85,
      map: floorMap ?? undefined,
      emissive: '#111822',
      emissiveMap: floorEmissive ?? undefined,
      emissiveIntensity: floorEmissive ? 0.35 : 0,
    });
    // +X, -X, +Y (top), -Y (bottom), +Z, -Z
    return [side, side, top, side, side, side] as THREE.MeshStandardMaterial[];
  }, [floorMap, floorEmissive]);

  const hw = CORRIDOR.width / 2;
  const hh = CORRIDOR.height / 2;
  const t = 0.1;

  return (
    <group>
      <mesh position={[0, -t / 2, 0]} material={floorMaterials}>
        <boxGeometry args={[CORRIDOR.width, t, CORRIDOR.length]} />
      </mesh>

      <mesh position={[0, CORRIDOR.height + t / 2, 0]} material={ceilingMat}>
        <boxGeometry args={[CORRIDOR.width, t, CORRIDOR.length]} />
      </mesh>

      <mesh position={[-hw - t / 2, hh, 0]} material={wallMat}>
        <boxGeometry args={[t, CORRIDOR.height, CORRIDOR.length]} />
      </mesh>

      <mesh position={[hw + t / 2, hh, 0]} material={wallMat}>
        <boxGeometry args={[t, CORRIDOR.height, CORRIDOR.length]} />
      </mesh>
    </group>
  );
}

function SystemPanel({
  config,
  panelMat,
}: {
  config: { z: number; side: 'left' | 'right'; key: SystemKey };
  panelMat: THREE.MeshStandardMaterial;
}) {
  const sphereMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const { z, side, key: sysKey } = config;

  const px = side === 'left' ? -CORRIDOR.width / 2 + 0.05 : CORRIDOR.width / 2 - 0.05;
  const py = 0.5 + 0.75;

  useFrame(() => {
    const health = useGameStore.getState().systemHealth[sysKey];
    const c = healthToStatusColor(health);
    const col = new THREE.Color(c);
    if (sphereMatRef.current) {
      sphereMatRef.current.color.copy(col);
      sphereMatRef.current.emissive.copy(col);
      sphereMatRef.current.emissiveIntensity = 1.25;
    }
  });

  const rotY = side === 'left' ? Math.PI / 2 : -Math.PI / 2;

  return (
    <group position={[px, py, z]} rotation={[0, rotY, 0]}>
      <mesh material={panelMat}>
        <boxGeometry args={[0.1, 1.5, 2]} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial
          ref={sphereMatRef}
          color="#22ff44"
          emissive="#22ff44"
          emissiveIntensity={1.25}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
}

function ShipLights() {
  const e1 = useRef<THREE.PointLight>(null);
  const e2 = useRef<THREE.PointLight>(null);

  useFrame(() => {
    const values = Object.values(useGameStore.getState().systemHealth);
    const minH = Math.min(...values);
    const alert = minH < 30;
    const intensity = alert ? 0.85 : EMERGENCY.intensity;
    if (e1.current) e1.current.intensity = intensity;
    if (e2.current) e2.current.intensity = intensity;
  });

  const ceilingZ = [-6, -2, 2, 6] as const;

  return (
    <>
      <ambientLight color={AMBIENT.color} intensity={AMBIENT.intensity} />
      {ceilingZ.map((cz) => (
        <pointLight
          key={cz}
          position={[0, CORRIDOR.height - 0.05, cz]}
          color={CEILING_LIGHT.color}
          intensity={CEILING_LIGHT.intensity}
          distance={CEILING_LIGHT.distance}
          decay={2}
        />
      ))}
      <pointLight
        ref={e1}
        position={[-1.4, CORRIDOR.height - 0.15, -4]}
        color={EMERGENCY.color}
        intensity={EMERGENCY.intensity}
        distance={14}
        decay={2}
      />
      <pointLight
        ref={e2}
        position={[1.4, CORRIDOR.height - 0.15, 4]}
        color={EMERGENCY.color}
        intensity={EMERGENCY.intensity}
        distance={14}
        decay={2}
      />
    </>
  );
}

function CameraRig({ lookEnabled }: { lookEnabled: boolean }) {
  const group = useRef<THREE.Group>(null);
  /** Default camera looks down -Z; rotate so view runs toward +Z (forward along the corridor). */
  const yaw = useRef(Math.PI);
  const dragging = useRef(false);
  const lookEnabledRef = useRef(lookEnabled);
  lookEnabledRef.current = lookEnabled;
  const { gl } = useThree();

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
        yaw.current -= e.movementX * 0.002;
      }
    };
    const onClick = () => {
      if (!lookEnabledRef.current) return;
      el.requestPointerLock();
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMove);
    el.addEventListener('click', onClick);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMove);
      el.removeEventListener('click', onClick);
    };
  }, [gl]);

  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = yaw.current;
    }
  });

  return (
    <group ref={group} position={[0, 1.5, -8]}>
      <PerspectiveCamera makeDefault fov={58} near={0.08} far={120} />
    </group>
  );
}

function ShipScene({ lookEnabled }: { lookEnabled: boolean }) {
  const panelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#252b3a',
        metalness: 0.45,
        roughness: 0.45,
      }),
    []
  );

  return (
    <>
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#05070c', 12, 38]} />
      <ShipLights />
      <Corridor />
      {PANEL_LAYOUT.map((cfg) => (
        <SystemPanel key={cfg.key} config={cfg} panelMat={panelMat} />
      ))}
      <CameraRig lookEnabled={lookEnabled} />
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
