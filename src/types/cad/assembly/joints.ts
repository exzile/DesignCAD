import * as THREE from 'three';

export type JointType = 'rigid' | 'revolute' | 'slider' | 'cylindrical' | 'pin-slot' | 'planar' | 'ball';

export interface Joint {
  id: string;
  name: string;
  type: JointType;
  componentId1: string;
  componentId2: string;
  origin: THREE.Vector3;
  axis?: THREE.Vector3;
  rotationLimits?: { min: number; max: number };
  translationLimits?: { min: number; max: number };
  rotationValue: number;
  translationValue: number;
  locked: boolean;
  asBuilt?: boolean;
}

export interface JointOriginRecord {
  id: string;
  name: string;
  componentId: string | null;
  position: [number, number, number];
  normal: [number, number, number];
}

export interface JointTrack {
  jointId: string;
  startValue: number;
  endValue: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}
