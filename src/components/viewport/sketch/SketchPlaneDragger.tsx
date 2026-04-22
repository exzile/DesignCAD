/**
 * D58: 3D Sketch planar manipulator gizmo.
 *
 * Renders when sketch3DMode === true AND activeSketch !== null.
 * Shows a semi-transparent plane visual and three translate handles (X/Y/Z).
 * Dragging a handle moves the sketch origin along the corresponding sketch
 * axis (t1 = X-handle, t2 = Y-handle, planeNormal = Z-handle), then calls
 * redefineSketchPlane to persist the new position.
 */

import { useEffect, useRef, useMemo } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';
import { GeometryEngine } from '../../../engine/GeometryEngine';

// ── Module-level scratch objects — no per-frame allocation ───────────────────
const _ndc = new THREE.Vector2();
const _delta = new THREE.Vector3();
const _viewNormal = new THREE.Vector3();

// ── Handle constants ─────────────────────────────────────────────────────────
const HANDLE_SIZE = 0.8;
const HANDLE_OFFSET = 7;

// ── Drag state (useRef — never useState for drag) ────────────────────────────
interface DragState {
  dragging: boolean;
  axis: 'x' | 'y' | 'z' | null;
  dragPlane: THREE.Plane;
  startHit: THREE.Vector3;
  startOrigin: THREE.Vector3;
}

// ── Component ────────────────────────────────────────────────────────────────
export default function SketchPlaneDragger() {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls as { enabled: boolean } | null);

  const activeSketch = useCADStore((s) => s.activeSketch);
  const sketch3DMode = useCADStore((s) => s.sketch3DMode);
  const redefineSketchPlane = useCADStore((s) => s.redefineSketchPlane);

  const dragRef = useRef<DragState>({
    dragging: false,
    axis: null,
    dragPlane: new THREE.Plane(),
    startHit: new THREE.Vector3(),
    startOrigin: new THREE.Vector3(),
  });

  // ── Derived geometry (origin, axes, handle positions, quaternion) ────────
  const derived = useMemo(() => {
    if (!activeSketch) return null;

    const { t1, t2 } = GeometryEngine.getSketchAxes(activeSketch);
    const n = activeSketch.planeNormal.clone().normalize();
    const o = activeSketch.planeOrigin.clone();

    // Quaternion rotating the XY plane onto the sketch plane
    const m4 = new THREE.Matrix4().makeBasis(t1, t2, n);
    const planeQuat = new THREE.Quaternion().setFromRotationMatrix(m4);

    return {
      origin: o,
      normal: n,
      t1,
      t2,
      planeQuat,
      hX: o.clone().addScaledVector(t1, HANDLE_OFFSET),
      hY: o.clone().addScaledVector(t2, HANDLE_OFFSET),
      hZ: o.clone().addScaledVector(n, HANDLE_OFFSET),
    };
  }, [activeSketch]);

  // ── Pointer down: start drag on the chosen axis ──────────────────────────
  const onPointerDown = (axis: 'x' | 'y' | 'z') => (e: ThreeEvent<PointerEvent>) => {
    if (!activeSketch || !derived) return;
    e.stopPropagation();

    const drag = dragRef.current;
    const dom = gl.domElement;
    const rect = dom.getBoundingClientRect();

    // Compute NDC from the event
    _ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    // Drag plane: perpendicular to view direction, passing through handle center
    _viewNormal.setFromMatrixColumn(camera.matrixWorld, 2).normalize(); // camera +Z in world
    const handlePos = axis === 'x' ? derived.hX : axis === 'y' ? derived.hY : derived.hZ;
    drag.dragPlane.setFromNormalAndCoplanarPoint(_viewNormal, handlePos);

    // Intersect the down-ray with the drag plane to get the start hit
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(_ndc, camera);
    const hit = new THREE.Vector3();
    const intersected = raycaster.ray.intersectPlane(drag.dragPlane, hit);

    drag.dragging = true;
    drag.axis = axis;
    drag.startHit.copy(intersected ? hit : handlePos);
    drag.startOrigin.copy(activeSketch.planeOrigin);

    if (controls) controls.enabled = false;
    dom.style.cursor = 'grabbing';
  };

  // ── Global pointermove / pointerup ───────────────────────────────────────
  useEffect(() => {
    if (!activeSketch || !derived) return;

    const raycaster = new THREE.Raycaster();
    const dom = gl.domElement;
    const { t1, t2, normal } = derived;

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag.dragging || !drag.axis) return;

      const rect = dom.getBoundingClientRect();
      _ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycaster.setFromCamera(_ndc, camera);
      const hit = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(drag.dragPlane, hit)) return;

      // Project delta onto the drag axis
      _delta.subVectors(hit, drag.startHit);
      const axisVec = drag.axis === 'x' ? t1 : drag.axis === 'y' ? t2 : normal;
      const proj = _delta.dot(axisVec);

      // Build new origin
      const newOrigin = drag.startOrigin.clone().addScaledVector(axisVec, proj);
      newOrigin.x = Math.round(newOrigin.x * 100) / 100;
      newOrigin.y = Math.round(newOrigin.y * 100) / 100;
      newOrigin.z = Math.round(newOrigin.z * 100) / 100;

      redefineSketchPlane(
        activeSketch.id,
        activeSketch.plane,
        activeSketch.planeNormal,
        newOrigin,
      );
    };

    const onUp = () => {
      const drag = dragRef.current;
      if (!drag.dragging) return;
      drag.dragging = false;
      drag.axis = null;
      if (controls) controls.enabled = true;
      dom.style.cursor = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl, camera, controls, activeSketch, derived, redefineSketchPlane]);

  if (!sketch3DMode || !activeSketch || !derived) return null;

  const { origin, planeQuat, hX, hY, hZ } = derived;

  return (
    <group renderOrder={500}>
      {/* Semi-transparent plane visual */}
      <mesh position={origin} quaternion={planeQuat} renderOrder={10}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Plane border wireframe */}
      <mesh position={origin} quaternion={planeQuat} renderOrder={11}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.35}
          wireframe
          depthWrite={false}
        />
      </mesh>

      {/* X handle (red) — moves along t1 */}
      <mesh
        position={hX}
        renderOrder={520}
        onPointerDown={onPointerDown('x')}
        // eslint-disable-next-line react-hooks/immutability
        onPointerOver={() => { gl.domElement.style.cursor = 'grab'; }}
        // eslint-disable-next-line react-hooks/immutability
        onPointerOut={() => { if (!dragRef.current.dragging) gl.domElement.style.cursor = ''; }}
      >
        <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>

      {/* Y handle (green) — moves along t2 */}
      <mesh
        position={hY}
        renderOrder={520}
        onPointerDown={onPointerDown('y')}
        // eslint-disable-next-line react-hooks/immutability
        onPointerOver={() => { gl.domElement.style.cursor = 'grab'; }}
        // eslint-disable-next-line react-hooks/immutability
        onPointerOut={() => { if (!dragRef.current.dragging) gl.domElement.style.cursor = ''; }}
      >
        <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
        <meshBasicMaterial color="#22c55e" />
      </mesh>

      {/* Z handle (blue) — moves along normal */}
      <mesh
        position={hZ}
        renderOrder={520}
        onPointerDown={onPointerDown('z')}
        // eslint-disable-next-line react-hooks/immutability
        onPointerOver={() => { gl.domElement.style.cursor = 'grab'; }}
        // eslint-disable-next-line react-hooks/immutability
        onPointerOut={() => { if (!dragRef.current.dragging) gl.domElement.style.cursor = ''; }}
      >
        <boxGeometry args={[HANDLE_SIZE, HANDLE_SIZE, HANDLE_SIZE]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
    </group>
  );
}
