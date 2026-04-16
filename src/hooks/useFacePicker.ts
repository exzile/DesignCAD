/**
 * useFacePicker — reusable face-picking hook for R3F components.
 *
 * Raycasts against meshes with userData.pickable === true, computes
 * coplanar face boundaries via GeometryEngine, and fires callbacks on
 * hover / click.
 *
 * Patterns mirrored from ExtrudeTool.tsx:
 *  - Module-level scratch vector (no per-event allocation)
 *  - optionsRef so event handlers never go stale
 *  - hoverRef so the pointer-move handler can guard no-op clears
 *  - click listener added with capture:true (matches ExtrudeTool)
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GeometryEngine } from '../engine/GeometryEngine';

// ---------------------------------------------------------------------------
// Module-level scratch — never allocated inside event handlers
// ---------------------------------------------------------------------------
const _mouse = new THREE.Vector2();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface FacePickResult {
  mesh: THREE.Mesh;
  faceIndex: number;
  boundary: THREE.Vector3[];
  normal: THREE.Vector3;
  centroid: THREE.Vector3;
}

export interface UseFacePickerOptions {
  /** When false the hook detaches all listeners and clears hover state. */
  enabled: boolean;
  /** Called each pointer-move. null means "no face under cursor". */
  onHover?: (result: FacePickResult | null) => void;
  /** Called on left-click when a face is hit. */
  onClick?: (result: FacePickResult) => void;
  /**
   * Optional mesh filter. Return true to include the mesh in raycasting.
   * If omitted, all meshes with userData.pickable === true are included.
   */
  filter?: (mesh: THREE.Mesh) => boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFacePicker(options: UseFacePickerOptions): void {
  const { gl, camera, raycaster, scene } = useThree();

  // Stable ref so event handlers always read the latest options without
  // being recreated (avoids stale-closure bugs).
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track current hover result so we can guard no-op clears.
  const hoverRef = useRef<FacePickResult | null>(null);

  useEffect(() => {
    if (!optionsRef.current.enabled) {
      if (hoverRef.current !== null) {
        hoverRef.current = null;
        optionsRef.current.onHover?.(null);
      }
      return;
    }

    const collectPickable = (): THREE.Mesh[] => {
      const out: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (!m.isMesh || !obj.userData?.pickable) return;
        if (optionsRef.current.filter && !optionsRef.current.filter(m)) return;
        out.push(m);
      });
      return out;
    };

    const updateMouse = (event: { clientX: number; clientY: number }) => {
      const r = gl.domElement.getBoundingClientRect();
      _mouse.set(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        -((event.clientY - r.top) / r.height) * 2 + 1,
      );
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateMouse(event);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(collectPickable(), false);

      if (hits.length > 0 && hits[0].faceIndex !== undefined && hits[0].face) {
        const hit = hits[0];
        const result = GeometryEngine.computeCoplanarFaceBoundary(
          hit.object as THREE.Mesh,
          hit.faceIndex!,
        );
        if (result) {
          const faceResult: FacePickResult = {
            mesh: hit.object as THREE.Mesh,
            faceIndex: hit.faceIndex!,
            boundary: result.boundary,
            normal: result.normal,
            centroid: result.centroid,
          };
          hoverRef.current = faceResult;
          optionsRef.current.onHover?.(faceResult);
          return;
        }
      }

      if (hoverRef.current !== null) {
        hoverRef.current = null;
        optionsRef.current.onHover?.(null);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      updateMouse(event);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(collectPickable(), false);
      if (hits.length === 0) return;
      const hit = hits[0];
      if (hit.faceIndex === undefined || !hit.face) return;
      const result = GeometryEngine.computeCoplanarFaceBoundary(
        hit.object as THREE.Mesh,
        hit.faceIndex!,
      );
      if (result) {
        const faceResult: FacePickResult = {
          mesh: hit.object as THREE.Mesh,
          faceIndex: hit.faceIndex!,
          boundary: result.boundary,
          normal: result.normal,
          centroid: result.centroid,
        };
        optionsRef.current.onClick?.(faceResult);
      }
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick, true);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick, true);
      if (hoverRef.current !== null) {
        hoverRef.current = null;
        optionsRef.current.onHover?.(null);
      }
    };
  // Re-run only when the canvas/camera/raycaster/scene change, or enabled toggles.
  // Callbacks are read from optionsRef so they do NOT need to be in deps.
   
  }, [gl, camera, raycaster, scene, options.enabled]);
}
