import type * as THREE from 'three';

export interface ViewCubeProps {
  /** Quaternion from the main camera, updated every frame */
  mainCameraQuaternion: THREE.Quaternion;
  /** Called when the user clicks a face/edge/corner to request a new orientation */
  onOrient: (targetQuaternion: THREE.Quaternion) => void;
  /** Go to home view */
  onHome?: () => void;
  /** Zoom to fit all objects */
  onZoomFit?: () => void;
}
