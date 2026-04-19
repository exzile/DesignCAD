import { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import type { Sketch } from '../../../types/cad';
import { PROFILE_MATERIAL, PROFILE_HOVER_MATERIAL, PROFILE_SELECTED_MATERIAL } from './materials';

/**
 * Renders a single sketch profile as a translucent fill mesh.
 *
 * Click and hover are handled by ExtrudeTool via native DOM event listeners
 * (R3F's <primitive> onClick is unreliable for dynamically-created meshes).
 * This component is purely visual — it renders the mesh, animates opacity
 * based on state, and sets userData.profileKey for the DOM raycaster to find.
 */
export default function SketchProfile({
  sketch, profileIndex, state,
}: {
  sketch: Sketch;
  profileIndex?: number;
  state: 'idle' | 'hover' | 'selected';
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

  useFrame(({ clock, invalidate }) => {
    const m = meshRef.current?.material;
    if (!(m instanceof THREE.MeshBasicMaterial)) return;
    if (state === 'hover') {
      const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 6);
      m.opacity = 0.24 + pulse * 0.22;
      invalidate(); // keep pulsing in frameloop="demand" mode
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
    />
  );
}
