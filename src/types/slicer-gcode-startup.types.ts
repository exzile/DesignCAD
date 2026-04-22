import type {
  MaterialProfile,
  PrinterProfile,
  PrintProfile,
} from './slicer';
import type { SlicerGCodeFlavor, StartEndMachineState } from './slicer-gcode.types';

export interface StartupOptions {
  gcode: string[];
  printer: PrinterProfile;
  material: MaterialProfile;
  print: PrintProfile;
  relativeExtrusion: boolean;
  flavor: SlicerGCodeFlavor;
  startEndState: StartEndMachineState;
}
