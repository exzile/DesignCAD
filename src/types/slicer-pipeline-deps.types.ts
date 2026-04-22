import type * as THREE from 'three';
import type { MultiPolygon as PCMultiPolygon } from 'polygon-clipping';
import type { BBox2, InfillRegion } from './slicer-pipeline.types';

export interface AdhesionDeps {
  simplifyClosedContour: (points: THREE.Vector2[], tolerance: number) => THREE.Vector2[];
  offsetContour: (contour: THREE.Vector2[], offset: number) => THREE.Vector2[];
  generateScanLines: (
    contour: THREE.Vector2[],
    density: number,
    lineWidth: number,
    angle: number,
    phaseOffset?: number,
    holes?: THREE.Vector2[][],
  ) => { from: THREE.Vector2; to: THREE.Vector2 }[];
  sortInfillLines: (lines: { from: THREE.Vector2; to: THREE.Vector2 }[]) => { from: THREE.Vector2; to: THREE.Vector2 }[];
}

export interface InfillDeps {
  contourBBox: (contour: THREE.Vector2[]) => BBox2;
  pointInContour: (point: THREE.Vector2, contour: THREE.Vector2[]) => boolean;
  lineContourIntersections: (p1: THREE.Vector2, p2: THREE.Vector2, contour: THREE.Vector2[]) => number[];
  offsetContour: (contour: THREE.Vector2[], offset: number) => THREE.Vector2[];
}

export interface PerimeterDeps {
  offsetContour: (contour: THREE.Vector2[], offset: number) => THREE.Vector2[];
  signedArea: (points: THREE.Vector2[]) => number;
  multiPolygonToRegions: (mp: PCMultiPolygon) => InfillRegion[];
}

export interface SupportDeps {
  pointInContour: (pt: THREE.Vector2, contour: THREE.Vector2[]) => boolean;
  pointsBBox: (points: THREE.Vector2[]) => BBox2;
  generateScanLines: (
    contour: THREE.Vector2[],
    density: number,
    lineWidth: number,
    angle: number,
    phaseOffset?: number,
    holes?: THREE.Vector2[][],
  ) => { from: THREE.Vector2; to: THREE.Vector2 }[];
}
