import * as THREE from 'three';
import type { SnapType } from './core';

export interface ImportedModel {
  id: string;
  name: string;
  fileName: string;
  mesh: THREE.Group;
}

export interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface SnapPoint {
  point: THREE.Vector3;
  type: SnapType;
}

export interface InterferenceResult {
  bodyAName: string;
  bodyBName: string;
  hasInterference: boolean;
  intersectionCurveCount: number;
}

export interface Parameter {
  id: string;
  name: string;
  expression: string;
  value: number;
  description?: string;
  group?: string;
}
