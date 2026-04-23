export type FastenerType = 'hex-bolt' | 'socket-cap' | 'flat-head' | 'button-head' | 'hex-nut' | 'washer';
export type FastenerStandard = 'metric' | 'imperial';

export interface FastenerSpec {
  type: FastenerType;
  standard: FastenerStandard;
  size: string;
  diameter: number;
  headDiameter: number;
  headHeight: number;
  pitch?: number;
  lengths: number[];
}
