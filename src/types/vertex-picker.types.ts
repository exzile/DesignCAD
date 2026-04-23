import * as THREE from 'three';

export interface VertexPickResult {
  mesh: THREE.Mesh;
  vertexIndex: number;
  position: THREE.Vector3;
}

export interface UseVertexPickerOptions {
  enabled: boolean;
  onHover?: (result: VertexPickResult | null) => void;
  onClick?: (result: VertexPickResult) => void;
  maxDistance?: number;
  filter?: (mesh: THREE.Mesh) => boolean;
}
