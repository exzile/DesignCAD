import type * as THREE from 'three';
import type { MultiPolygon as PCMultiPolygon, Ring as PCRing } from 'polygon-clipping';
import type { Contour } from './slicer-pipeline.types';

export interface LayerTopologyOptions {
  contours: Contour[];
  optimizeWallOrder: boolean;
  currentX: number;
  currentY: number;
  previousLayerMaterial: PCMultiPolygon;
  isFirstLayer: boolean;
  pointInContour: (point: THREE.Vector2, contour: THREE.Vector2[]) => boolean;
  pointInRing: (x: number, y: number, ring: PCRing) => boolean;
}

export interface LayerTopology {
  workContours: Contour[];
  holesByOuterContour: Map<Contour, THREE.Vector2[][]>;
  currentLayerMaterial: PCMultiPolygon;
  hasBridgeRegions: boolean;
  isInBridgeRegion: (x: number, y: number) => boolean;
}
