/**
 * Standard hole size lookup tables for ISO metric, ANSI inch (UNC/UNF), and NPT pipe.
 * Diameters in mm. Pitch in mm (ISO) or TPI converted as needed.
 */

import type { HoleStandard, HoleSizeEntry } from '../../../types/hole-presets.types';
export type { HoleStandard, HoleSizeEntry } from '../../../types/hole-presets.types';

// ── ISO Metric (M-series, coarse thread) ─────────────────────────────────────
export const ISO_SIZES: HoleSizeEntry[] = [
  { label: 'M1.6',   tapDiameter: 1.25,  clearanceDiameter: 1.7,  pitch: 0.35, recommendedDepth: 2.4 },
  { label: 'M2',     tapDiameter: 1.6,   clearanceDiameter: 2.2,  pitch: 0.4,  recommendedDepth: 3.0 },
  { label: 'M2.5',   tapDiameter: 2.05,  clearanceDiameter: 2.7,  pitch: 0.45, recommendedDepth: 3.75 },
  { label: 'M3',     tapDiameter: 2.5,   clearanceDiameter: 3.2,  pitch: 0.5,  recommendedDepth: 4.5 },
  { label: 'M4',     tapDiameter: 3.3,   clearanceDiameter: 4.3,  pitch: 0.7,  recommendedDepth: 6.0 },
  { label: 'M5',     tapDiameter: 4.2,   clearanceDiameter: 5.3,  pitch: 0.8,  recommendedDepth: 7.5 },
  { label: 'M6',     tapDiameter: 5.0,   clearanceDiameter: 6.4,  pitch: 1.0,  recommendedDepth: 9.0 },
  { label: 'M8',     tapDiameter: 6.8,   clearanceDiameter: 8.4,  pitch: 1.25, recommendedDepth: 12.0 },
  { label: 'M10',    tapDiameter: 8.5,   clearanceDiameter: 10.5, pitch: 1.5,  recommendedDepth: 15.0 },
  { label: 'M12',    tapDiameter: 10.2,  clearanceDiameter: 13.0, pitch: 1.75, recommendedDepth: 18.0 },
  { label: 'M14',    tapDiameter: 12.0,  clearanceDiameter: 15.0, pitch: 2.0,  recommendedDepth: 21.0 },
  { label: 'M16',    tapDiameter: 14.0,  clearanceDiameter: 17.0, pitch: 2.0,  recommendedDepth: 24.0 },
  { label: 'M20',    tapDiameter: 17.5,  clearanceDiameter: 21.0, pitch: 2.5,  recommendedDepth: 30.0 },
  { label: 'M24',    tapDiameter: 21.0,  clearanceDiameter: 25.0, pitch: 3.0,  recommendedDepth: 36.0 },
  { label: 'M30',    tapDiameter: 26.5,  clearanceDiameter: 31.0, pitch: 3.5,  recommendedDepth: 45.0 },
];

// ── ANSI Inch – UNC (coarse) ──────────────────────────────────────────────────
// Tap diameters are the standard tap drill sizes converted to mm.
export const ANSI_SIZES: HoleSizeEntry[] = [
  { label: '#4-40',    tapDiameter: 2.845, clearanceDiameter: 3.175, pitch: 0.635, recommendedDepth: 4.3 },
  { label: '#6-32',    tapDiameter: 3.454, clearanceDiameter: 3.969, pitch: 0.794, recommendedDepth: 5.2 },
  { label: '#8-32',    tapDiameter: 4.166, clearanceDiameter: 4.763, pitch: 0.794, recommendedDepth: 6.3 },
  { label: '#10-24',   tapDiameter: 4.801, clearanceDiameter: 5.556, pitch: 1.058, recommendedDepth: 7.2 },
  { label: '#10-32',   tapDiameter: 5.004, clearanceDiameter: 5.556, pitch: 0.794, recommendedDepth: 7.5 },
  { label: '1/4"-20',  tapDiameter: 5.105, clearanceDiameter: 6.731, pitch: 1.27,  recommendedDepth: 7.7 },
  { label: '5/16"-18', tapDiameter: 6.502, clearanceDiameter: 8.334, pitch: 1.411, recommendedDepth: 9.8 },
  { label: '3/8"-16',  tapDiameter: 8.001, clearanceDiameter: 10.0,  pitch: 1.587, recommendedDepth: 12.0 },
  { label: '1/2"-13',  tapDiameter: 10.73, clearanceDiameter: 13.1,  pitch: 1.953, recommendedDepth: 16.1 },
  { label: '5/8"-11',  tapDiameter: 13.49, clearanceDiameter: 16.27, pitch: 2.309, recommendedDepth: 20.2 },
  { label: '3/4"-10',  tapDiameter: 16.51, clearanceDiameter: 19.45, pitch: 2.54,  recommendedDepth: 24.8 },
  { label: '1"-8',     tapDiameter: 22.23, clearanceDiameter: 26.2,  pitch: 3.175, recommendedDepth: 33.3 },
];

// ── NPT Pipe Thread ───────────────────────────────────────────────────────────
// Tap diameters are standard NPT tap drill sizes in mm.
export const NPT_SIZES: HoleSizeEntry[] = [
  { label: '1/16 NPT',   tapDiameter: 6.223,  clearanceDiameter: 7.144,  pitch: 1.411, recommendedDepth: 9.3 },
  { label: '1/8 NPT',    tapDiameter: 8.839,  clearanceDiameter: 9.906,  pitch: 1.411, recommendedDepth: 13.3 },
  { label: '1/4 NPT',    tapDiameter: 11.455, clearanceDiameter: 13.097, pitch: 1.814, recommendedDepth: 17.2 },
  { label: '3/8 NPT',    tapDiameter: 14.986, clearanceDiameter: 16.662, pitch: 1.814, recommendedDepth: 22.5 },
  { label: '1/2 NPT',    tapDiameter: 18.368, clearanceDiameter: 20.574, pitch: 2.209, recommendedDepth: 27.6 },
  { label: '3/4 NPT',    tapDiameter: 23.495, clearanceDiameter: 25.908, pitch: 2.209, recommendedDepth: 35.2 },
  { label: '1" NPT',     tapDiameter: 29.591, clearanceDiameter: 32.131, pitch: 2.769, recommendedDepth: 44.4 },
  { label: '1-1/4 NPT',  tapDiameter: 38.608, clearanceDiameter: 41.529, pitch: 2.769, recommendedDepth: 57.9 },
  { label: '1-1/2 NPT',  tapDiameter: 44.068, clearanceDiameter: 47.244, pitch: 2.769, recommendedDepth: 66.1 },
  { label: '2" NPT',     tapDiameter: 56.261, clearanceDiameter: 59.944, pitch: 2.769, recommendedDepth: 84.4 },
];

export const STANDARD_SIZES: Record<HoleStandard, HoleSizeEntry[]> = {
  ISO: ISO_SIZES,
  ANSI: ANSI_SIZES,
  NPT: NPT_SIZES,
  custom: [],
};
