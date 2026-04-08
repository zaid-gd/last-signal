import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

export function ExteriorHull() {
  const { scene } = useThree();
  
  // Minimalist external geometry: large flat hull, some pipe/rails
  const hullMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#08080c', 
    metalness: 0.9, 
    roughness: 0.3 
  }), []);

  const railMat = useMemo(() => new THREE.MeshStandardMaterial({ 
    color: '#ffaa00', 
    metalness: 0.5, 
    roughness: 0.8 
  }), []);

  const stars = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Create a massive sphere of stars around the player
      const r = 200 + Math.random() * 300;
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  const starMat = useMemo(() => new THREE.PointsMaterial({
    color: '#ffffff',
    size: 0.8,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  }), []);

  // Update background color to deep void for EVA
  useFrame(() => {
    scene.background = new THREE.Color('#000000');
    // We intentionally ignore fog in the vacuum of space, or set it very far
    if (scene.fog && scene.fog instanceof THREE.Fog) {
      scene.fog.near = 100;
      scene.fog.far = 1000;
      scene.fog.color.set('#000000');
    }
  });

  return (
    <group>
      {/* Massive hull floor simulating walking on the outside */}
      <mesh position={[0, -0.2, -15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <primitive object={hullMat} attach="material" />
      </mesh>

      {/* Primary handrail guiding the linear path to the antenna */}
      <mesh position={[1.5, 1.0, -15]} receiveShadow castShadow>
        <cylinderGeometry args={[0.05, 0.05, 30, 8]} />
        <primitive object={railMat} attach="material" />
      </mesh>

      {/* Decorative vertical struts for the handrail */}
      {Array.from({ length: 11 }).map((_, i) => (
        <mesh key={i} position={[1.5, 0.4, -0 - i * 3]} receiveShadow castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
          <primitive object={railMat} attach="material" />
        </mesh>
      ))}

      {/* Antenna base indicator at the end of the path */}
      <mesh position={[1.5, 1.0, -32]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.8, 1.2, 2, 16]} />
        <meshStandardMaterial color="#111" metalness={0.9} roughness={0.5} />
      </mesh>

      {/* Celestial Background (Stars) */}
      <points geometry={stars} material={starMat} />

      {/* Distant Sun / Celestial Light Source */}
      <directionalLight position={[100, 50, -50]} intensity={2.0} color="#ffeedd" castShadow />
      <ambientLight intensity={0.05} color="#112233" />
    </group>
  );
}
