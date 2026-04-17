import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';

/**
 * NAV-20: Switches the active camera between perspective and orthographic.
 * Preserves camera position/quaternion across the switch.
 * Mounts inside <Canvas> so useThree() is available.
 *
 * Design notes:
 * - `camera` is intentionally NOT in the useEffect dep array. When we call
 *   set({ camera: newCam }), R3F replaces the camera ref which would re-trigger
 *   the effect and create a fragile loop. Instead we snapshot the current camera
 *   via a ref that is updated synchronously in the render phase.
 * - `size` is also excluded: frustum math only needs the aspect ratio at the
 *   moment of the switch, not on every resize. OrthographicCamera resizing is
 *   handled by R3F's default resize logic after the switch.
 */
export default function CameraProjectionSwitcher() {
  const { camera, set, size } = useThree();
  const cameraProjection = useCADStore((s) => s.cameraProjection);

  // Snapshot current camera + size so the effect can read them without depending on them.
  const cameraRef = useRef(camera);
  const sizeRef = useRef(size);
  cameraRef.current = camera;
  sizeRef.current = size;

  // Track which projection was last applied so we never double-switch.
  const lastProjectionRef = useRef<string | null>(null);

  useEffect(() => {
    const cam = cameraRef.current;
    const sz = sizeRef.current;

    // Guard: already applied this projection (e.g. re-render without store change)
    if (lastProjectionRef.current === cameraProjection) return;

    // Guard: camera already matches the requested type (initial mount)
    const isOrtho = (cam as THREE.OrthographicCamera).isOrthographicCamera;
    const currentType = isOrtho ? 'orthographic' : 'perspective';
    if (currentType === cameraProjection) {
      lastProjectionRef.current = cameraProjection;
      return;
    }
    lastProjectionRef.current = cameraProjection;

    // Preserve position + orientation across the switch
    const pos = cam.position.clone();
    const quat = cam.quaternion.clone();

    if (cameraProjection === 'orthographic') {
      // Derive orthographic frustum from the perspective camera's FoV + current distance
      const perspCam = cam as THREE.PerspectiveCamera;
      const fov = perspCam.fov ?? 45;
      const distance = pos.length() || 100;
      const halfH = distance * Math.tan((fov * Math.PI / 180) / 2);
      const aspect = sz.width / sz.height;
      const newCam = new THREE.OrthographicCamera(
        -halfH * aspect, halfH * aspect, halfH, -halfH, 0.01, 100000
      );
      newCam.zoom = 1;
      newCam.position.copy(pos);
      newCam.quaternion.copy(quat);
      newCam.updateProjectionMatrix();
      set({ camera: newCam });
    } else {
      const newCam = new THREE.PerspectiveCamera(45, sz.width / sz.height, 0.01, 100000);
      newCam.position.copy(pos);
      newCam.quaternion.copy(quat);
      newCam.updateProjectionMatrix();
      set({ camera: newCam });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraProjection]); // camera/size intentionally excluded — read via refs above

  return null;
}
