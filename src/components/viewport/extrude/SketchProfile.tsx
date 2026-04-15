import { useMemo, useEffect, useRef } from 'react';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import type { Sketch } from '../../../types/cad';
import { PROFILE_MATERIAL, PROFILE_HOVER_MATERIAL, PROFILE_SELECTED_MATERIAL } from './materials';

export default function SketchProfile({
  sketch, profileIndex, state, onSelect, onHover, onUnhover,
}: {
  sketch: Sketch;
  profileIndex?: number;
  state: 'idle' | 'hover' | 'selected';
  onSelect: (event: ThreeEvent<MouseEvent>) => void;
  onHover: () => void;
  onUnhover: () => void;
}) {
  const material =
    state === 'selected' ? PROFILE_SELECTED_MATERIAL :
    state === 'hover'    ? PROFILE_HOVER_MATERIAL    :
                           PROFILE_MATERIAL;

  const animatedMaterial = useMemo(() => material.clone(), [material]);
  const meshRef = useRef<THREE.Mesh | null>(null);

  const mesh = useMemo(() => {
    const created = GeometryEngine.createSketchProfileMesh(sketch, animatedMaterial, profileIndex);
    if (created) {
      created.userData.pickable = true;
      created.userData.sketchId = sketch.id;
      created.userData.profileIndex = profileIndex;
      created.userData.profileKey = profileIndex === undefined ? sketch.id : `${sketch.id}::${profileIndex}`;
    }
    return created;
  }, [sketch, animatedMaterial, profileIndex]);

  useFrame((clock) => {
    const m = meshRef.current?.material;
    if (!(m instanceof THREE.MeshBasicMaterial)) return;
    if (state === 'hover') {
      const pulse = 0.5 + 0.5 * Math.sin(clock.clock.elapsedTime * 6);
      m.opacity = 0.24 + pulse * 0.22;
    } else if (state === 'selected') {
      m.opacity = 0.48;
    } else {
      m.opacity = 0.18;
    }
  });

  useEffect(() => {
    return () => {
      mesh?.geometry.dispose();
      animatedMaterial.dispose();
    };
  }, [mesh, animatedMaterial]);

  if (!mesh) return null;

  return (
    <primitive
      ref={meshRef}
      object={mesh}
      renderOrder={1000}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onSelect(e); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); onHover(); }}
      onPointerOut={() => onUnhover()}
    />
  );
}
