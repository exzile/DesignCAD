/**
 * useVertexPicker — reusable vertex-picking hook for R3F components.
 *
 * Raycasts against pickable meshes to get a face hit, then returns the
 * vertex of that triangle that is closest to the hit point in world space,
 * provided it falls within maxDistance screen-space pixels.
 *
 * Same patterns as useFacePicker / useEdgePicker:
 *  - Module-level scratch vectors
 *  - optionsRef for stale-closure safety
 *  - hoverRef for no-op guards
 */

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Module-level scratch — no per-event allocation
// ---------------------------------------------------------------------------
const _mouse = new THREE.Vector2();
const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _vC = new THREE.Vector3();
// Scratch for screen-space projection checks
const _ndc = new THREE.Vector3();

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface VertexPickResult {
  mesh: THREE.Mesh;
  vertexIndex: number;
  /** World-space position of the picked vertex. */
  position: THREE.Vector3;
}

export interface UseVertexPickerOptions {
  /** When false the hook detaches all listeners and clears hover state. */
  enabled: boolean;
  /** Called each pointer-move. null means "no vertex close enough". */
  onHover?: (result: VertexPickResult | null) => void;
  /** Called on left-click when a vertex is within range. */
  onClick?: (result: VertexPickResult) => void;
  /**
   * Maximum screen-space distance in pixels to accept a vertex hit.
   * Defaults to 10.
   */
  maxDistance?: number;
  /**
   * Optional mesh filter. Return true to include the mesh in raycasting.
   * If omitted, all meshes with userData.pickable === true are included.
   */
  filter?: (mesh: THREE.Mesh) => boolean;
}

// ---------------------------------------------------------------------------
// Internal: pick nearest vertex from a face hit
// ---------------------------------------------------------------------------

/**
 * Projects a world-space point to screen (pixel) coordinates.
 * Returns [screenX, screenY].
 */
function worldToScreen(
  worldPos: THREE.Vector3,
  camera: THREE.Camera,
  domElement: HTMLElement,
): [number, number] {
  _ndc.copy(worldPos).project(camera);
  const w = domElement.clientWidth;
  const h = domElement.clientHeight;
  const sx = (_ndc.x * 0.5 + 0.5) * w;
  const sy = (-_ndc.y * 0.5 + 0.5) * h;
  return [sx, sy];
}

function pickNearestVertex(
  mesh: THREE.Mesh,
  faceIndex: number,
  _hitPoint: THREE.Vector3,
  mouseScreenX: number,
  mouseScreenY: number,
  maxDistancePx: number,
  camera: THREE.Camera,
  domElement: HTMLElement,
): VertexPickResult | null {
  const geom = mesh.geometry;
  const posAttr = geom.attributes.position as THREE.BufferAttribute | undefined;
  if (!posAttr) return null;

  mesh.updateWorldMatrix(true, false);
  const m = mesh.matrixWorld;

  const idxAttr = geom.index;
  const getIndices = (fi: number): [number, number, number] => {
    if (idxAttr) {
      return [
        idxAttr.getX(fi * 3),
        idxAttr.getX(fi * 3 + 1),
        idxAttr.getX(fi * 3 + 2),
      ];
    }
    return [fi * 3, fi * 3 + 1, fi * 3 + 2];
  };

  const [i0, i1, i2] = getIndices(faceIndex);

  _vA.fromBufferAttribute(posAttr, i0).applyMatrix4(m);
  _vB.fromBufferAttribute(posAttr, i1).applyMatrix4(m);
  _vC.fromBufferAttribute(posAttr, i2).applyMatrix4(m);

  const candidates: [THREE.Vector3, number][] = [
    [_vA, i0],
    [_vB, i1],
    [_vC, i2],
  ];

  const maxSq = maxDistancePx * maxDistancePx;
  let bestSq = Infinity;
  let bestCandidate: [THREE.Vector3, number] | null = null;

  for (const [worldVert, vi] of candidates) {
    const [sx, sy] = worldToScreen(worldVert, camera, domElement);
    const dx = sx - mouseScreenX;
    const dy = sy - mouseScreenY;
    const dSq = dx * dx + dy * dy;
    if (dSq < maxSq && dSq < bestSq) {
      bestSq = dSq;
      bestCandidate = [worldVert, vi];
    }
  }

  if (!bestCandidate) return null;

  const [worldVert, vi] = bestCandidate;

  return {
    mesh,
    vertexIndex: vi,
    // Clone — the scratch vector will be reused on the next event
    position: worldVert.clone(),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useVertexPicker(options: UseVertexPickerOptions): void {
  const { gl, camera, raycaster, scene } = useThree();

  const optionsRef = useRef(options);
  // eslint-disable-next-line react-hooks/refs
  optionsRef.current = options;

  const hoverRef = useRef<VertexPickResult | null>(null);

  // Track raw screen-space mouse position for proximity checks
  const mouseScreenRef = useRef<[number, number]>([0, 0]);

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
      // Store pixel coords for screen-space proximity test
      mouseScreenRef.current = [event.clientX - r.left, event.clientY - r.top];
    };

    const handlePointerMove = (event: PointerEvent) => {
      updateMouse(event);
      raycaster.setFromCamera(_mouse, camera);
      const hits = raycaster.intersectObjects(collectPickable(), false);

      if (hits.length > 0 && hits[0].faceIndex !== undefined && hits[0].point) {
        const hit = hits[0];
        const maxPx = optionsRef.current.maxDistance ?? 10;
        const [msx, msy] = mouseScreenRef.current;
        const result = pickNearestVertex(
          hit.object as THREE.Mesh,
          hit.faceIndex!,
          hit.point,
          msx,
          msy,
          maxPx,
          camera,
          gl.domElement,
        );
        if (result) {
          hoverRef.current = result;
          optionsRef.current.onHover?.(result);
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
      if (hit.faceIndex === undefined || !hit.point) return;
      const maxPx = optionsRef.current.maxDistance ?? 10;
      const [msx, msy] = mouseScreenRef.current;
      const result = pickNearestVertex(
        hit.object as THREE.Mesh,
        hit.faceIndex!,
        hit.point,
        msx,
        msy,
        maxPx,
        camera,
        gl.domElement,
      );
      if (result) {
        optionsRef.current.onClick?.(result);
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
   
  }, [gl, camera, raycaster, scene, options.enabled]);
}
