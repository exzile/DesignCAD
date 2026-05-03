/* =============================================================================
   Printer presets — one-click defaults for common community printers.
   Selecting a preset patches the active printer's machineConfig + boardType
   + serialBaudRate. All fields are optional so a preset only overrides what
   it cares about.
   ============================================================================= */

import type { PrinterBoardType } from '../../../types/duet';
import type { MachineConfig } from '../../../types/duet-prefs.types';

export interface PrinterPreset {
  id: string;
  name: string;
  vendor: string;
  boardType?: PrinterBoardType;
  serialBaudRate?: number;
  machineConfig?: Partial<MachineConfig>;
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  {
    id: 'custom',
    name: 'Custom (no changes)',
    vendor: '',
  },
  {
    id: 'ender3',
    name: 'Ender 3 / Pro',
    vendor: 'Creality',
    boardType: 'marlin',
    serialBaudRate: 115200,
    machineConfig: {
      buildVolumeX: 220, buildVolumeY: 220, buildVolumeZ: 250,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 500, maxFeedRateY: 500, maxFeedRateZ: 5,
      maxAccelX: 1500, maxAccelY: 1500, maxAccelZ: 100,
      kinematics: 'cartesian',
    },
  },
  {
    id: 'ender3-v2',
    name: 'Ender 3 V2',
    vendor: 'Creality',
    boardType: 'marlin',
    serialBaudRate: 115200,
    machineConfig: {
      buildVolumeX: 235, buildVolumeY: 235, buildVolumeZ: 250,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 500, maxFeedRateY: 500, maxFeedRateZ: 5,
      maxAccelX: 1500, maxAccelY: 1500, maxAccelZ: 100,
      kinematics: 'cartesian',
    },
  },
  {
    id: 'voron-2.4-350',
    name: 'Voron 2.4 — 350 mm',
    vendor: 'Voron Design',
    boardType: 'klipper',
    serialBaudRate: 250000,
    machineConfig: {
      buildVolumeX: 350, buildVolumeY: 350, buildVolumeZ: 350,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: true,
      maxFeedRateX: 500, maxFeedRateY: 500, maxFeedRateZ: 30,
      maxAccelX: 7000, maxAccelY: 7000, maxAccelZ: 300,
      kinematics: 'corexy',
    },
  },
  {
    id: 'prusa-mk3s',
    name: 'MK3S+',
    vendor: 'Prusa Research',
    boardType: 'marlin',
    serialBaudRate: 115200,
    machineConfig: {
      buildVolumeX: 250, buildVolumeY: 210, buildVolumeZ: 210,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 200, maxFeedRateY: 200, maxFeedRateZ: 12,
      maxAccelX: 1250, maxAccelY: 1250, maxAccelZ: 200,
      kinematics: 'cartesian',
    },
  },
  {
    id: 'prusa-mk4',
    name: 'MK4',
    vendor: 'Prusa Research',
    boardType: 'marlin',
    serialBaudRate: 115200,
    machineConfig: {
      buildVolumeX: 250, buildVolumeY: 210, buildVolumeZ: 220,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 250, maxFeedRateY: 250, maxFeedRateZ: 12,
      maxAccelX: 4000, maxAccelY: 4000, maxAccelZ: 200,
      kinematics: 'cartesian',
    },
  },
  {
    id: 'bambu-a1',
    name: 'A1',
    vendor: 'Bambu Lab',
    boardType: 'other',
    serialBaudRate: 115200,
    machineConfig: {
      buildVolumeX: 256, buildVolumeY: 256, buildVolumeZ: 256,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 500, maxFeedRateY: 500, maxFeedRateZ: 20,
      maxAccelX: 10000, maxAccelY: 10000, maxAccelZ: 500,
      kinematics: 'corexy',
    },
  },
  {
    id: 'duet3-mb6hc',
    name: 'Duet 3 MB6HC reference',
    vendor: 'Duet3D',
    boardType: 'duet',
    machineConfig: {
      buildVolumeX: 300, buildVolumeY: 300, buildVolumeZ: 300,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 600, maxFeedRateY: 600, maxFeedRateZ: 12,
      maxAccelX: 4000, maxAccelY: 4000, maxAccelZ: 200,
      kinematics: 'corexy',
    },
  },
  {
    id: 'flsun-q5',
    name: 'FLSUN Q5 Delta',
    vendor: 'FLSUN',
    boardType: 'marlin',
    serialBaudRate: 250000,
    machineConfig: {
      buildVolumeX: 200, buildVolumeY: 200, buildVolumeZ: 200,
      nozzleDiameter: 0.4, extruderCount: 1,
      hasHeatedBed: true, hasHeatedChamber: false,
      maxFeedRateX: 300, maxFeedRateY: 300, maxFeedRateZ: 300,
      maxAccelX: 3000, maxAccelY: 3000, maxAccelZ: 3000,
      kinematics: 'delta',
    },
  },
];

export const PRESET_LOOKUP = new Map(PRINTER_PRESETS.map((p) => [p.id, p]));
