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
const _checkedMeshes = new Set<THREE.Mesh>();

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
  // eslint-disable-next-line react-hooks/refs
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

      // Try all hits and pick the one from the mesh with the MOST vertices.
      // After CSG operations, the most-vertices mesh is the final merged body.
      // Stale/duplicate bodies with fewer verts are deprioritized.
      let bestResult: FacePickResult | null = null;
      let bestMeshVerts = 0;
      _checkedMeshes.clear();
      for (const hit of hits) {
        if (hit.faceIndex === undefined || !hit.face) continue;
        const hitMesh = hit.object as THREE.Mesh;
        if (_checkedMeshes.has(hitMesh)) continue;
        _checkedMeshes.add(hitMesh);
        const meshVerts = hitMesh.geometry?.getAttribute('position')?.count ?? 0;
        // Skip if this mesh has fewer verts than one we already found
        if (bestResult && meshVerts <= bestMeshVerts) continue;
        const result = GeometryEngine.computeCoplanarFaceBoundary(hitMesh, hit.faceIndex!);
        if (result) {
          bestMeshVerts = meshVerts;
          bestResult = {
            mesh: hitMesh,
            faceIndex: hit.faceIndex!,
            boundary: result.boundary,
            normal: result.normal,
            centroid: result.centroid,
          };
        }
      }

      if (bestResult) {
        hoverRef.current = bestResult;
        optionsRef.current.onHover?.(bestResult);
        return;
      }

      if (hoverRef.current !== null) {
        hoverRef.current = null;
        optionsRef.current.onHover?.(null);
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (event.button !== 0) return;
      // Use the currently hovered face result (already the best match)
      if (hoverRef.current) {
        optionsRef.current.onClick?.(hoverRef.current);
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
