export interface TextSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface TextFormatOptions {
  /** Italic shear factor applied to segment X (0 = upright, ~0.25 = standard italic) */
  italic?: boolean;
  /** Bold — stored as metadata; visual stroke-width expansion is not implemented for polyline */
  bold?: boolean;
}
