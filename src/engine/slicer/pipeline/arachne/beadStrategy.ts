import type { TrapezoidGraph, SkeletalTrapezoid, TrapezoidSample } from './trapezoidation';

const EPS = 1e-7;

export interface Bead {
  index: number;
  depth: number;
  /** Representative width at this trapezoid's average thickness. */
  width: number;
  /** Distance from the first source edge, matching Cura's toolpath location. */
  location: number;
  /** Per-sample bead width along the trapezoid centerline. */
  sampleWidths: number[];
  /** Per-sample source-edge-relative locations along the trapezoid. */
  sampleLocations: number[];
}

export interface BeadTrapezoid {
  trapezoidId: number;
  sourceEdgeIds: [number, number];
  centerline: SkeletalTrapezoid['centerline'];
  samples: TrapezoidSample[];
  beadCount: number;
  width: number;
  minWidth: number;
  maxWidth: number;
  beads: Bead[];
}

export interface BeadGraph {
  trapezoids: BeadTrapezoid[];
  sourceEdges: TrapezoidGraph['sourceEdges'];
  polygon: TrapezoidGraph['polygon'];
  lineWidth: number;
  minWidth: number;
  maxWidth: number;
}

function sanitizeWidth(width: number): number {
  return Number.isFinite(width) && width > EPS ? width : 0;
}

function chooseBeadCount(thickness: number, lineWidth: number, minWidth: number, maxWidth: number): number {
  if (thickness <= EPS || lineWidth <= EPS) return 0;

  let count: number;
  if (thickness < lineWidth * 1.5) {
    count = 1;
  } else if (thickness < lineWidth * 2.5) {
    count = 2;
  } else {
    count = Math.max(3, Math.round(thickness / lineWidth));
  }

  if (maxWidth > EPS && thickness / count > maxWidth) {
    count = Math.max(count, Math.ceil(thickness / maxWidth));
  }
  if (minWidth > EPS && thickness / count < minWidth) {
    count = Math.max(1, Math.min(count, Math.floor(thickness / minWidth)));
  }

  return count;
}

function computeEqualBeading(thickness: number, count: number): Array<{ width: number; location: number }> {
  if (count <= 0) return [];

  const width = thickness / count;
  return Array.from({ length: count }, (_, index) => ({
    width,
    location: width * (index + 0.5),
  }));
}

function computeDistributedBeading(
  thickness: number,
  count: number,
  lineWidth: number,
  minWidth: number,
  maxWidth: number,
): Array<{ width: number; location: number }> {
  if (count <= 2) return computeEqualBeading(thickness, count);

  // Triangular weighting around the middle bead. Single-pass build avoids
  // the previous three intermediate arrays (`weights.map(...).map(...)`)
  // — `distributeBeads` runs once per sample per trapezoid, so this is hot.
  const middle = (count - 1) / 2;
  const radius = Math.max(1, count - 1);
  const radiusSq = radius * radius;
  const weights = new Float64Array(count);
  let totalWeight = 0;
  for (let i = 0; i < count; i++) {
    const deviation = i - middle;
    const w = Math.max(0, 1 - (deviation * deviation) / radiusSq);
    weights[i] = w;
    totalWeight += w;
  }
  if (totalWeight <= EPS) return computeEqualBeading(thickness, count);

  const leftover = thickness - count * lineWidth;
  const result: Array<{ width: number; location: number }> = new Array(count);
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    const width = lineWidth + leftover * (weights[i] / totalWeight);
    if ((minWidth > EPS && width < minWidth - EPS) || (maxWidth > EPS && width > maxWidth + EPS)) {
      return computeEqualBeading(thickness, count);
    }
    result[i] = { width, location: cursor + width / 2 };
    cursor += width;
  }
  return result;
}

function computeBeading(thickness: number, lineWidth: number, minWidth: number, maxWidth: number): Array<{ width: number; location: number }> {
  const count = chooseBeadCount(thickness, lineWidth, minWidth, maxWidth);
  return computeDistributedBeading(thickness, count, lineWidth, minWidth, maxWidth);
}

function smoothSampleWidths(
  sampleWidths: number[][],
  sampleLocations: number[][],
  samples: TrapezoidSample[],
  minWidth: number,
  maxWidth: number,
): void {
  const beadCount = sampleWidths.length;
  const sampleCount = samples.length;
  if (beadCount === 0 || sampleCount === 0) return;

  if (beadCount === 1) {
    for (let s = 0; s < sampleCount; s++) {
      const width = sanitizeWidth(samples[s].width);
      sampleWidths[0][s] = width;
      sampleLocations[0][s] = width / 2;
    }
    return;
  }

  if (sampleCount >= 3) {
    const smoothed = sampleWidths.map((widths) => widths.slice());
    for (let b = 0; b < beadCount; b++) {
      for (let s = 0; s < sampleCount; s++) {
        const prev = sampleWidths[b][Math.max(0, s - 1)];
        const curr = sampleWidths[b][s];
        const next = sampleWidths[b][Math.min(sampleCount - 1, s + 1)];
        smoothed[b][s] = prev * 0.25 + curr * 0.5 + next * 0.25;
      }
    }
    for (let b = 0; b < beadCount; b++) sampleWidths[b] = smoothed[b];
  }

  for (let s = 0; s < sampleCount; s++) {
    const targetWidth = sanitizeWidth(samples[s].width);
    const rawTotal = sampleWidths.reduce((sum, widths) => sum + sanitizeWidth(widths[s]), 0);
    const scale = rawTotal > EPS ? targetWidth / rawTotal : 1;
    let cursor = 0;
    for (let b = 0; b < beadCount; b++) {
      let width = sanitizeWidth(sampleWidths[b][s]) * scale;
      if (minWidth > EPS && width < minWidth * 0.5) width = minWidth * 0.5;
      if (maxWidth > EPS && width > maxWidth) width = maxWidth;
      sampleWidths[b][s] = width;
      sampleLocations[b][s] = cursor + width / 2;
      cursor += width;
    }
  }
}

function buildBeadTrapezoid(
  trapezoid: SkeletalTrapezoid,
  lineWidth: number,
  minWidth: number,
  maxWidth: number,
): BeadTrapezoid {
  const representativeWidth = sanitizeWidth(trapezoid.width);
  const representativeBeading = computeBeading(representativeWidth, lineWidth, minWidth, maxWidth);
  const beadCount = representativeBeading.length;

  // Build per-bead sample arrays in a single pass. The previous shape
  // (`representativeBeading.map(...sampleBeadings.map(...))`) was O(N×M)
  // allocations — one fresh array per bead per dimension. Here we
  // pre-allocate M×2 arrays and fill them sample-by-sample.
  const sampleCount = trapezoid.samples.length;
  const sampleWidths: number[][] = Array.from({ length: beadCount }, () => new Array(sampleCount).fill(0));
  const sampleLocations: number[][] = Array.from({ length: beadCount }, () => new Array(sampleCount).fill(0));
  for (let s = 0; s < sampleCount; s++) {
    const sampleWidth = sanitizeWidth(trapezoid.samples[s].width);
    let beading = computeDistributedBeading(sampleWidth, beadCount, lineWidth, minWidth, maxWidth);
    if (beading.length !== beadCount) beading = computeEqualBeading(sampleWidth, beadCount);
    for (let b = 0; b < beadCount; b++) {
      const slot = beading[b];
      if (slot) {
        sampleWidths[b][s] = slot.width;
        sampleLocations[b][s] = slot.location;
      }
    }
  }
  smoothSampleWidths(sampleWidths, sampleLocations, trapezoid.samples, minWidth, maxWidth);

  const beads: Bead[] = new Array(beadCount);
  for (let b = 0; b < beadCount; b++) {
    const bead = representativeBeading[b];
    beads[b] = {
      index: b,
      depth: b,
      width: bead.width,
      location: bead.location,
      sampleWidths: sampleWidths[b],
      sampleLocations: sampleLocations[b],
    };
  }

  return {
    trapezoidId: trapezoid.id,
    sourceEdgeIds: trapezoid.sourceEdgeIds,
    centerline: trapezoid.centerline,
    samples: trapezoid.samples,
    beadCount,
    width: representativeWidth,
    minWidth: trapezoid.minWidth,
    maxWidth: trapezoid.maxWidth,
    beads,
  };
}

/**
 * Distribute variable-width Arachne beads across skeletal trapezoids.
 *
 * This follows the simplified Cura distributed strategy used in the task:
 * one bead below 1.5x nominal line width, two below 2.5x, and three or more
 * above that. Widths always sum to the local trapezoid thickness.
 */
export function distributeBeads(
  trapezoidGraph: TrapezoidGraph,
  lineWidth: number,
  minWidth = lineWidth * 0.5,
  maxWidth = lineWidth * 2,
): BeadGraph {
  return {
    trapezoids: trapezoidGraph.trapezoids
      .map((trapezoid) => buildBeadTrapezoid(trapezoid, lineWidth, minWidth, maxWidth))
      .filter((trapezoid) => trapezoid.beadCount > 0),
    sourceEdges: trapezoidGraph.sourceEdges,
    polygon: trapezoidGraph.polygon,
    lineWidth,
    minWidth,
    maxWidth,
  };
}
