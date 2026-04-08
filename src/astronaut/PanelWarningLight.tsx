import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PanelWarningLightProps {
  position: [number, number, number];
  /** Ref to the comms-delayed health value for this panel's system */
  delayedHealthRef: React.MutableRefObject<number>;
}

/**
 * A localized point light that pulses independently per panel.
 *
 * Health thresholds (read from the comms-delayed ref):
 *  ≥ 60 → off
 *  30–60 → slow amber pulse (1.5 Hz, peak 8)
 *  < 30  → fast red strobe  (4 Hz,   peak 18)
 *
 * All mutations through refs in useFrame — no React state, no re-renders.
 */
export function PanelWarningLight({ position, delayedHealthRef }: PanelWarningLightProps) {
  const lightRef  = useRef<THREE.PointLight>(null);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const light = lightRef.current;
    if (!light) return;

    const health = delayedHealthRef.current;

    if (health >= 60) {
      light.intensity = THREE.MathUtils.lerp(light.intensity, 0, delta * 4);
      return;
    }

    let targetHz:      number;
    let peakIntensity: number;
    let colorHex:      string;

    if (health < 30) {
      targetHz      = 4.0;
      peakIntensity = 18;
      colorHex      = '#ff1100';
    } else {
      targetHz      = 1.5;
      peakIntensity = 8;
      colorHex      = '#ff8800';
    }

    const wave = Math.sin(state.clock.elapsedTime * targetHz * Math.PI * 2) * 0.5 + 0.5;
    const lerpSpeed = health < 30 ? 12 : 6;
    light.intensity = THREE.MathUtils.lerp(light.intensity, wave * peakIntensity, delta * lerpSpeed);

    tempColor.set(colorHex);
    light.color.lerp(tempColor, delta * 8);
  });

  return (
    <pointLight
      ref={lightRef}
      position={position}
      intensity={0}
      distance={3.5}
      decay={2}
      castShadow={false}
    />
  );
}
