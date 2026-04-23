import type { SliceMove } from './slicer';

export interface MoveTimeline {
  cumulative: Float32Array;
  moves: Array<{ move: SliceMove; z: number }>;
  layerIndices: Int32Array;
  moveWithinLayer: Int32Array;
  total: number;
}

export interface BuildMoveTimelineOptions {
  filamentDiameter: number;
  travelSpeed: number;
  initialLayerTravelSpeed?: number;
  retractionDistance?: number;
  retractionSpeed?: number;
  retractionRetractSpeed?: number;
  retractionPrimeSpeed?: number;
  retractionMinTravel?: number;
  minimumExtrusionDistanceWindow?: number;
  maxCombDistanceNoRetract?: number;
  travelAvoidDistance?: number;
  insideTravelAvoidDistance?: number;
  avoidPrintedParts?: boolean;
  avoidSupports?: boolean;
  zHopWhenRetracted?: boolean;
  zHopHeight?: number;
  zHopSpeed?: number;
}
