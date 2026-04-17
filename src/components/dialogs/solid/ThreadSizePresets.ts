/**
 * Thread size lookup tables for ISO Metric, ANSI Unified, and NPT standards.
 * Used by ThreadDialog for auto-populating diameter, pitch, and class fields.
 *
 * Sources: ISO 68-1, ASME B1.1, ASME B1.20.1
 */

export type ThreadStandard = 'iso-metric' | 'ansi-unified' | 'npt';

export interface ThreadSizeEntry {
  /** Display label / designation (e.g. "M6x1.0", "1/4-20", "1/2 NPT") */
  designation: string;
  /** Nominal outer diameter in mm */
  diameter: number;
  /** Thread pitch in mm (for ANSI/NPT this is converted from TPI) */
  pitch: number;
  /** Default tolerance class (e.g. "6H" for internal ISO, "2A"/"2B" for ANSI) */
  defaultClass: string;
}

// ── ISO Metric (mm) ──────────────────────────────────────────────────────────
// Coarse pitch series — ISO 261 standard nominal diameters
const ISO_SIZES: ThreadSizeEntry[] = [
  { designation: 'M1.6x0.35', diameter: 1.6,  pitch: 0.35,  defaultClass: '6H' },
  { designation: 'M2x0.4',    diameter: 2.0,  pitch: 0.4,   defaultClass: '6H' },
  { designation: 'M2.5x0.45', diameter: 2.5,  pitch: 0.45,  defaultClass: '6H' },
  { designation: 'M3x0.5',    diameter: 3.0,  pitch: 0.5,   defaultClass: '6H' },
  { designation: 'M4x0.7',    diameter: 4.0,  pitch: 0.7,   defaultClass: '6H' },
  { designation: 'M5x0.8',    diameter: 5.0,  pitch: 0.8,   defaultClass: '6H' },
  { designation: 'M6x1.0',    diameter: 6.0,  pitch: 1.0,   defaultClass: '6H' },
  { designation: 'M8x1.25',   diameter: 8.0,  pitch: 1.25,  defaultClass: '6H' },
  { designation: 'M10x1.5',   diameter: 10.0, pitch: 1.5,   defaultClass: '6H' },
  { designation: 'M12x1.75',  diameter: 12.0, pitch: 1.75,  defaultClass: '6H' },
  { designation: 'M14x2.0',   diameter: 14.0, pitch: 2.0,   defaultClass: '6H' },
  { designation: 'M16x2.0',   diameter: 16.0, pitch: 2.0,   defaultClass: '6H' },
  { designation: 'M18x2.5',   diameter: 18.0, pitch: 2.5,   defaultClass: '6H' },
  { designation: 'M20x2.5',   diameter: 20.0, pitch: 2.5,   defaultClass: '6H' },
  { designation: 'M24x3.0',   diameter: 24.0, pitch: 3.0,   defaultClass: '6H' },
  { designation: 'M30x3.5',   diameter: 30.0, pitch: 3.5,   defaultClass: '6H' },
  { designation: 'M36x4.0',   diameter: 36.0, pitch: 4.0,   defaultClass: '6H' },
  { designation: 'M42x4.5',   diameter: 42.0, pitch: 4.5,   defaultClass: '6H' },
  { designation: 'M48x5.0',   diameter: 48.0, pitch: 5.0,   defaultClass: '6H' },
];

// ── ANSI Unified (UN/UNC coarse series, pitch converted from TPI to mm) ──────
// pitch_mm = 25.4 / TPI
const ANSI_SIZES: ThreadSizeEntry[] = [
  { designation: '#4-40',  diameter: 2.845, pitch: 25.4 / 40,  defaultClass: '2B' },
  { designation: '#6-32',  diameter: 3.505, pitch: 25.4 / 32,  defaultClass: '2B' },
  { designation: '#8-32',  diameter: 4.166, pitch: 25.4 / 32,  defaultClass: '2B' },
  { designation: '#10-24', diameter: 4.826, pitch: 25.4 / 24,  defaultClass: '2B' },
  { designation: '1/4-20', diameter: 6.350, pitch: 25.4 / 20,  defaultClass: '2B' },
  { designation: '5/16-18',diameter: 7.938, pitch: 25.4 / 18,  defaultClass: '2B' },
  { designation: '3/8-16', diameter: 9.525, pitch: 25.4 / 16,  defaultClass: '2B' },
  { designation: '7/16-14',diameter: 11.113,pitch: 25.4 / 14,  defaultClass: '2B' },
  { designation: '1/2-13', diameter: 12.700,pitch: 25.4 / 13,  defaultClass: '2B' },
  { designation: '9/16-12',diameter: 14.288,pitch: 25.4 / 12,  defaultClass: '2B' },
  { designation: '5/8-11', diameter: 15.875,pitch: 25.4 / 11,  defaultClass: '2B' },
  { designation: '3/4-10', diameter: 19.050,pitch: 25.4 / 10,  defaultClass: '2B' },
  { designation: '7/8-9',  diameter: 22.225,pitch: 25.4 / 9,   defaultClass: '2B' },
  { designation: '1-8',    diameter: 25.400,pitch: 25.4 / 8,   defaultClass: '2B' },
  { designation: '1-1/4-7',diameter: 31.750,pitch: 25.4 / 7,   defaultClass: '2B' },
];

// ── NPT (National Pipe Taper — pitch converted from TPI to mm) ───────────────
// Tapered threads; diameter here is nominal pipe size OD
const NPT_SIZES: ThreadSizeEntry[] = [
  { designation: '1/16 NPT', diameter: 7.895,  pitch: 25.4 / 27,  defaultClass: 'NPT' },
  { designation: '1/8 NPT',  diameter: 10.287, pitch: 25.4 / 27,  defaultClass: 'NPT' },
  { designation: '1/4 NPT',  diameter: 13.716, pitch: 25.4 / 18,  defaultClass: 'NPT' },
  { designation: '3/8 NPT',  diameter: 17.145, pitch: 25.4 / 18,  defaultClass: 'NPT' },
  { designation: '1/2 NPT',  diameter: 21.336, pitch: 25.4 / 14,  defaultClass: 'NPT' },
  { designation: '3/4 NPT',  diameter: 26.670, pitch: 25.4 / 14,  defaultClass: 'NPT' },
  { designation: '1 NPT',    diameter: 33.401, pitch: 25.4 / 11.5, defaultClass: 'NPT' },
  { designation: '1-1/4 NPT',diameter: 42.164, pitch: 25.4 / 11.5, defaultClass: 'NPT' },
  { designation: '1-1/2 NPT',diameter: 48.260, pitch: 25.4 / 11.5, defaultClass: 'NPT' },
  { designation: '2 NPT',    diameter: 60.325, pitch: 25.4 / 11.5, defaultClass: 'NPT' },
];

export const THREAD_SIZES: Record<ThreadStandard, ThreadSizeEntry[]> = {
  'iso-metric': ISO_SIZES,
  'ansi-unified': ANSI_SIZES,
  'npt': NPT_SIZES,
};

/** Look up a thread size entry by standard + designation. Returns null if not found. */
export function findThreadSize(standard: ThreadStandard, designation: string): ThreadSizeEntry | null {
  return THREAD_SIZES[standard].find((e) => e.designation === designation) ?? null;
}
