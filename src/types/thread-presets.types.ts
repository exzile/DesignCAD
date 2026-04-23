export type ThreadStandard = 'iso-metric' | 'ansi-unified' | 'npt';

export interface ThreadSizeEntry {
  designation: string;
  diameter: number;
  pitch: number;
  defaultClass: string;
}
