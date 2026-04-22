export type SlicerGCodeFlavor = 'marlin' | 'reprap' | 'duet' | 'klipper';

export interface StartEndMachineState {
  currentX: number;
  currentY: number;
  currentZ: number;
  currentE: number;
  isRetracted: boolean;
  extrudedSinceRetract: number;
  templateUsesAbsolutePositioning: boolean;
  templateUsesAbsoluteExtrusion: boolean;
}

export interface StartGCodeDedupeOptions {
  preheatTemp: number;
  nozzleFirstLayerTemp: number;
  bedFirstLayerTemp: number;
  relativeExtrusion: boolean;
  hasHeatedBed: boolean;
  waitForNozzle: boolean;
  waitForBuildPlate: boolean;
}

export interface EndGCodeDedupeOptions {
  slicerTurnsFanOff: boolean;
  slicerSetsFinalNozzleTemp: boolean;
}
