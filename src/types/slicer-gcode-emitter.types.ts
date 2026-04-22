import type {
  MaterialProfile,
  PrinterProfile,
  PrintProfile,
} from './slicer';
import type { SlicerGCodeFlavor } from './slicer-gcode.types';

export interface GCodeEmitterOptions {
  gcode: string[];
  printer: PrinterProfile;
  material: MaterialProfile;
  print: PrintProfile;
  flavor: SlicerGCodeFlavor;
  relativeExtrusion: boolean;
}

export interface ExtrusionMoveResult {
  time: number;
  extrusion: number;
  speed: number;
  distance: number;
}
