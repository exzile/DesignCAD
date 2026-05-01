import type * as THREE from 'three';
import type { MultiPolygon as PCMultiPolygon, Ring as PCRing } from 'polygon-clipping';
import type { Contour } from './slicer-pipeline.types';

export interface LayerTopologyOptions {
  contours: Contour[];
  optimizeWallOrder: boolean;
  currentX: number;
  currentY: number;
  previousLayerMaterial: PCMultiPolygon;
  /**
   * Material polygon of the layer immediately above this one (if any).
   * Used to compute the "top-skin region" — the part of the current layer
   * that has empty space above it. When undefined (e.g. last layer or
   * lookahead failed) the topology omits a top-skin region.
   */
  nextLayerMaterial?: PCMultiPolygon;
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
  /**
   * 2D regions of this layer where the next layer up has nothing —
   * i.e. visible top surfaces. `emitContourInfill` treats these as solid
   * skin even when the layer isn't a globally-flagged "top" layer. Empty
   * for the last layer (no lookahead) and for layers whose next-layer
   * material fully covers this layer (no top surface here).
   */
  topSkinRegion: PCMultiPolygon;
  hasTopSkinRegion: boolean;
}
