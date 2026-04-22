import * as THREE from 'three';

export interface LinearPatternParams {
  featureIds: string[];
  direction: THREE.Vector3;
  count: number;
  spacing: number;
  secondDirection?: THREE.Vector3;
  secondCount?: number;
  secondSpacing?: number;
}

export interface CircularPatternParams {
  featureIds: string[];
  axis: THREE.Vector3;
  axisOrigin: THREE.Vector3;
  count: number;
  totalAngle: number;
  symmetric: boolean;
}

export interface MirrorParams {
  featureIds: string[];
  mirrorPlane: string;
}
