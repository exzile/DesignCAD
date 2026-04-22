import type {
  MaterialProfile,
  PrinterProfile,
  PrintProfile,
} from './slicer';

export interface LayerControlFlags {
  regularFanHeightFired: boolean;
  buildVolumeFanHeightFired: boolean;
}

export interface LayerControlOptions {
  gcode: string[];
  layerIndex: number;
  totalLayers: number;
  layerZ: number;
  previousLayerTime: number;
  printer: PrinterProfile;
  material: MaterialProfile;
  print: PrintProfile;
  flags: LayerControlFlags;
}
