import * as THREE from 'three';

export interface FacePickResult {
  mesh: THREE.Mesh;
  faceIndex: number;
  boundary: THREE.Vector3[];
  normal: THREE.Vector3;
  centroid: THREE.Vector3;
}

export interface UseFacePickerOptions {
  enabled: boolean;
  onHover?: (result: FacePickResult | null) => void;
  onClick?: (result: FacePickResult) => void;
  filter?: (mesh: THREE.Mesh) => boolean;
}
