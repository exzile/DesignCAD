import * as THREE from 'three';

export interface EdgePickResult {
  mesh: THREE.Mesh;
  faceIndex: number;
  edgeVertexA: THREE.Vector3;
  edgeVertexB: THREE.Vector3;
  edgeVertexIndexA: number;
  edgeVertexIndexB: number;
  midpoint: THREE.Vector3;
  direction: THREE.Vector3;
}

export interface UseEdgePickerOptions {
  enabled: boolean;
  onHover?: (result: EdgePickResult | null) => void;
  onClick?: (result: EdgePickResult) => void;
  filter?: (mesh: THREE.Mesh) => boolean;
}
