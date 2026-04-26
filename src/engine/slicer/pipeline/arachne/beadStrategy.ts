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

/** Cumulative centerline distances from start and from end for each
 *  sample. Used by the transition-zone calculation to know how close a
 *  given sample is to either trapezoid endpoint. */
function computeSampleDistances(centerline: ReadonlyArray<{ x: number; y: number }>): { fromStart: Float64Array; fromEnd: Float64Array; total: number } {
  const n = centerline.length;
  const fromStart = new Float64Array(n);
  const fromEnd = new Float64Array(n);
  if (n < 2) return { fromStart, fromEnd, total: 0 };
  let cum = 0;
  fromStart[0] = 0;
  for (let i = 1; i < n; i++) {
    const dx = centerline[i].x - centerline[i - 1].x;
    const dy = centerline[i].y - centerline[i - 1].y;
    cum += Math.hypot(dx, dy);
    fromStart[i] = cum;
  }
  for (let i = 0; i < n; i++) fromEnd[i] = cum - fromStart[i];
  return { fromStart, fromEnd, total: cum };
}

/** Compute the transition-zone factor for a bead at the given depth in a
 *  trapezoid sample. Returns 1.0 if the bead is fully supported, < 1.0
 *  near a junction where the adjacent trapezoid has fewer beads, and 0.0
 *  beyond the transition length from such a junction.
 *
 *  This is the single-most-important difference between full Cura/Orca
 *  Arachne and the offset-cascade output we had: instead of every bead
 *  having full width all the way to the trapezoid endpoint (producing
 *  the "parallelogram end-cap" flap visible in narrow-neck regions),
 *  beads that extend beyond what their neighbours support taper smoothly
 *  to zero width within ~3·lineWidth of the unsupported endpoint.
 */
function transitionTaperFactor(
  beadDepth: number,
  supportAtStart: number,
  supportAtEnd: number,
  distFromStart: number,
  distFromEnd: number,
  transitionLength: number,
): number {
  let factor = 1.0;
  if (beadDepth >= supportAtStart) {
    factor = Math.min(factor, distFromStart / transitionLength);
  }
  if (beadDepth >= supportAtEnd) {
    factor = Math.min(factor, distFromEnd / transitionLength);
  }
  return Math.max(0, Math.min(1, factor));
}

function buildBeadTrapezoid(
  trapezoid: SkeletalTrapezoid,
  lineWidth: number,
  minWidth: number,
  maxWidth: number,
  supportAtStart: number,
  supportAtEnd: number,
  transitionLength: number,
): BeadTrapezoid {
  const representativeWidth = sanitizeWidth(trapezoid.width);
  const representativeBeading = computeBeading(representativeWidth, lineWidth, minWidth, maxWidth);
  const beadCount = representativeBeading.length;

  const sampleCount = trapezoid.samples.length;
  const distances = computeSampleDistances(trapezoid.centerline);

  // Build per-bead sample arrays. Each sample's beading is computed from
  // the local thickness, then bead widths are tapered toward zero near
  // any centerline endpoint where the adjacent trapezoid has a smaller
  // bead count (i.e. the bead "dies" smoothly at the junction rather
  // than leaving an abrupt parallelogram end-cap). For trapezoids where
  // BOTH endpoints support the full bead count, the taper factor is 1
  // everywhere and the output matches the pre-transitions behaviour.
  const sampleWidths: number[][] = Array.from({ length: beadCount }, () => new Array(sampleCount).fill(0));
  const sampleLocations: number[][] = Array.from({ length: beadCount }, () => new Array(sampleCount).fill(0));
  for (let s = 0; s < sampleCount; s++) {
    const sampleWidth = sanitizeWidth(trapezoid.samples[s].width);
    let beading = computeDistributedBeading(sampleWidth, beadCount, lineWidth, minWidth, maxWidth);
    if (beading.length !== beadCount) beading = computeEqualBeading(sampleWidth, beadCount);
    for (let b = 0; b < beadCount; b++) {
      const slot = beading[b];
      if (slot) {
        const taper = transitionTaperFactor(b, supportAtStart, supportAtEnd, distances.fromStart[s], distances.fromEnd[s], transitionLength);
        sampleWidths[b][s] = slot.width * taper;
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
 *
 * **Transition zones** (added with full Arachne semantics): when an
 * adjacent trapezoid at one of this trapezoid's centerline endpoints has a
 * SMALLER bead count, the "extra" beads (those beyond the neighbour's
 * count) taper smoothly to zero width over `transitionLength` (≈3·lineWidth)
 * near that endpoint. Eliminates the parallelogram end-cap artifact that
 * appears in narrow-neck regions of non-convex polygons (e.g. the material
 * between adjacent mounting holes), matching the behaviour of full
 * Cura/Orca Arachne.
 */
export function distributeBeads(
  trapezoidGraph: TrapezoidGraph,
  lineWidth: number,
  minWidth = lineWidth * 0.5,
  maxWidth = lineWidth * 2,
): BeadGraph {
  const traps = trapezoidGraph.trapezoids;
  const adjacency = trapezoidGraph.adjacency;
  const transitionLength = lineWidth * 3;

  // Pass 1: compute each trapezoid's bead count from local thickness.
  // Needed up-front so each trapezoid in pass 2 can look up its
  // neighbours' counts to know which beads need to taper.
  const beadCounts = traps.map((t) => chooseBeadCount(sanitizeWidth(t.width), lineWidth, minWidth, maxWidth));

  const maxNeighborBeadCount = (vid: number, selfId: number): number => {
    const neighbors = adjacency.get(vid);
    if (!neighbors) return 0;
    let max = 0;
    for (const nid of neighbors) {
      if (nid === selfId) continue;
      const idx = traps.findIndex((t) => t.id === nid);
      if (idx === -1) continue;
      const c = beadCounts[idx];
      if (c > max) max = c;
    }
    return max;
  };

  // Pass 2: build bead trapezoids with per-endpoint support counts.
  const beadTraps: BeadTrapezoid[] = [];
  for (let i = 0; i < traps.length; i++) {
    const trap = traps[i];
    const vIds = trap.voronoiVertexIds;
    // For edge-based trapezoids, taper at each endpoint based on its
    // neighbours' bead counts. For single-vertex (corner) and boundary-
    // gap trapezoids we keep the support count == own count, which means
    // no tapering — they stand alone and shouldn't fade out.
    const ownCount = beadCounts[i];
    const supportStart = vIds.length >= 2 ? maxNeighborBeadCount(vIds[0], trap.id) : ownCount;
    const supportEnd = vIds.length >= 2 ? maxNeighborBeadCount(vIds[vIds.length - 1], trap.id) : ownCount;

    const bt = buildBeadTrapezoid(trap, lineWidth, minWidth, maxWidth, supportStart, supportEnd, transitionLength);
    if (bt.beadCount > 0) beadTraps.push(bt);
  }

  return {
    trapezoids: beadTraps,
    sourceEdges: trapezoidGraph.sourceEdges,
    polygon: trapezoidGraph.polygon,
    lineWidth,
    minWidth,
    maxWidth,
  };
}
