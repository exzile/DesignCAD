export interface SlicerSettings {
  layerHeight: number;
  firstLayerHeight: number;
  nozzleDiameter: number;
  filamentDiameter: number;
  extrusionMultiplier: number;
  nozzleTemp: number;
  bedTemp: number;
  printSpeed: number;
  firstLayerSpeed: number;
  travelSpeed: number;
  infillDensity: number;
  infillPattern: 'lines' | 'grid' | 'triangles' | 'gyroid';
  wallCount: number;
  topLayers: number;
  bottomLayers: number;
  supportEnabled: boolean;
  supportAngle: number;
  supportDensity: number;
  bedSizeX: number;
  bedSizeY: number;
  bedSizeZ: number;
  retractionDistance: number;
  retractionSpeed: number;
  skirtLines: number;
  brimWidth: number;
  fanSpeed: number;
  fanStartLayer: number;
}

export interface PrintEstimate {
  layerCount: number;
  filamentLengthMm: number;
  filamentWeightG: number;
  estimatedTimeMinutes: number;
  dimensions: { x: number; y: number; z: number };
}
