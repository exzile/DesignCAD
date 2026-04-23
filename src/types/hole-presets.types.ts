export type HoleStandard = 'ISO' | 'ANSI' | 'NPT' | 'custom';

export interface HoleSizeEntry {
  label: string;
  tapDiameter: number;
  clearanceDiameter: number;
  pitch: number;
  recommendedDepth: number;
}
