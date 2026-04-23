import type { FastenerSpec } from '../types/fastener.types';
export type { FastenerType, FastenerStandard, FastenerSpec } from '../types/fastener.types';

export const FASTENER_LIBRARY: FastenerSpec[] = [
  // Metric hex bolts
  { type: 'hex-bolt', standard: 'metric', size: 'M3', diameter: 3, headDiameter: 5.5, headHeight: 2, pitch: 0.5, lengths: [8,10,12,16,20,25,30] },
  { type: 'hex-bolt', standard: 'metric', size: 'M4', diameter: 4, headDiameter: 7, headHeight: 2.8, pitch: 0.7, lengths: [8,10,12,16,20,25,30,40] },
  { type: 'hex-bolt', standard: 'metric', size: 'M5', diameter: 5, headDiameter: 8, headHeight: 3.5, pitch: 0.8, lengths: [10,12,16,20,25,30,40,50] },
  { type: 'hex-bolt', standard: 'metric', size: 'M6', diameter: 6, headDiameter: 10, headHeight: 4, pitch: 1.0, lengths: [10,12,16,20,25,30,40,50,60] },
  { type: 'hex-bolt', standard: 'metric', size: 'M8', diameter: 8, headDiameter: 13, headHeight: 5.5, pitch: 1.25, lengths: [16,20,25,30,40,50,60,80] },
  { type: 'hex-bolt', standard: 'metric', size: 'M10', diameter: 10, headDiameter: 16, headHeight: 6.4, pitch: 1.5, lengths: [20,25,30,40,50,60,80,100] },
  { type: 'hex-bolt', standard: 'metric', size: 'M12', diameter: 12, headDiameter: 18, headHeight: 7.5, pitch: 1.75, lengths: [25,30,40,50,60,80,100,120] },
  { type: 'hex-bolt', standard: 'metric', size: 'M16', diameter: 16, headDiameter: 24, headHeight: 10, pitch: 2.0, lengths: [30,40,50,60,80,100,120,160] },
  // Socket head cap screws
  { type: 'socket-cap', standard: 'metric', size: 'M3', diameter: 3, headDiameter: 5.5, headHeight: 3, pitch: 0.5, lengths: [6,8,10,12,16,20,25] },
  { type: 'socket-cap', standard: 'metric', size: 'M4', diameter: 4, headDiameter: 7, headHeight: 4, pitch: 0.7, lengths: [6,8,10,12,16,20,25,30] },
  { type: 'socket-cap', standard: 'metric', size: 'M5', diameter: 5, headDiameter: 8.5, headHeight: 5, pitch: 0.8, lengths: [8,10,12,16,20,25,30,40] },
  { type: 'socket-cap', standard: 'metric', size: 'M6', diameter: 6, headDiameter: 10, headHeight: 6, pitch: 1.0, lengths: [10,12,16,20,25,30,40,50] },
  { type: 'socket-cap', standard: 'metric', size: 'M8', diameter: 8, headDiameter: 13, headHeight: 8, pitch: 1.25, lengths: [12,16,20,25,30,40,50,60] },
  { type: 'socket-cap', standard: 'metric', size: 'M10', diameter: 10, headDiameter: 16, headHeight: 10, pitch: 1.5, lengths: [16,20,25,30,40,50,60,80] },
  // Flat head screws
  { type: 'flat-head', standard: 'metric', size: 'M3', diameter: 3, headDiameter: 6, headHeight: 1.86, pitch: 0.5, lengths: [6,8,10,12,16,20] },
  { type: 'flat-head', standard: 'metric', size: 'M4', diameter: 4, headDiameter: 8, headHeight: 2.48, pitch: 0.7, lengths: [8,10,12,16,20,25] },
  { type: 'flat-head', standard: 'metric', size: 'M5', diameter: 5, headDiameter: 9.2, headHeight: 3.1, pitch: 0.8, lengths: [8,10,12,16,20,25,30] },
  { type: 'flat-head', standard: 'metric', size: 'M6', diameter: 6, headDiameter: 11, headHeight: 3.72, pitch: 1.0, lengths: [10,12,16,20,25,30,40] },
  // Button head
  { type: 'button-head', standard: 'metric', size: 'M3', diameter: 3, headDiameter: 5.7, headHeight: 1.65, pitch: 0.5, lengths: [5,6,8,10,12,16] },
  { type: 'button-head', standard: 'metric', size: 'M4', diameter: 4, headDiameter: 7.6, headHeight: 2.2, pitch: 0.7, lengths: [6,8,10,12,16,20] },
  { type: 'button-head', standard: 'metric', size: 'M5', diameter: 5, headDiameter: 9.5, headHeight: 2.75, pitch: 0.8, lengths: [8,10,12,16,20,25] },
  { type: 'button-head', standard: 'metric', size: 'M6', diameter: 6, headDiameter: 10.5, headHeight: 3.3, pitch: 1.0, lengths: [8,10,12,16,20,25,30] },
  // Hex nuts (length = height of nut)
  { type: 'hex-nut', standard: 'metric', size: 'M3', diameter: 3, headDiameter: 5.5, headHeight: 2.4, pitch: 0.5, lengths: [2.4] },
  { type: 'hex-nut', standard: 'metric', size: 'M4', diameter: 4, headDiameter: 7, headHeight: 3.2, pitch: 0.7, lengths: [3.2] },
  { type: 'hex-nut', standard: 'metric', size: 'M5', diameter: 5, headDiameter: 8, headHeight: 4, pitch: 0.8, lengths: [4] },
  { type: 'hex-nut', standard: 'metric', size: 'M6', diameter: 6, headDiameter: 10, headHeight: 5, pitch: 1.0, lengths: [5] },
  { type: 'hex-nut', standard: 'metric', size: 'M8', diameter: 8, headDiameter: 13, headHeight: 6.5, pitch: 1.25, lengths: [6.5] },
  // Washers
  { type: 'washer', standard: 'metric', size: 'M3', diameter: 3.2, headDiameter: 7, headHeight: 0.5, lengths: [0.5] },
  { type: 'washer', standard: 'metric', size: 'M4', diameter: 4.3, headDiameter: 9, headHeight: 0.8, lengths: [0.8] },
  { type: 'washer', standard: 'metric', size: 'M5', diameter: 5.3, headDiameter: 10, headHeight: 1.0, lengths: [1.0] },
  { type: 'washer', standard: 'metric', size: 'M6', diameter: 6.4, headDiameter: 12, headHeight: 1.6, lengths: [1.6] },
  { type: 'washer', standard: 'metric', size: 'M8', diameter: 8.4, headDiameter: 16, headHeight: 1.6, lengths: [1.6] },
];
