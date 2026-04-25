import type * as THREE from 'three';
import polygonClipping, { type MultiPolygon as PCMultiPolygon, type Ring as PCRing } from 'polygon-clipping';
import type { PrintProfile } from '../../../../types/slicer';
import type { PerimeterDeps } from '../../../../types/slicer-pipeline-deps.types';
import type { GeneratedPerimeters, InfillRegion } from '../../../../types/slicer-pipeline.types';
import { generatePerimetersEx } from '../perimeters';
import { distributeBeads } from './beadStrategy';
import { extractBeadPaths } from './pathExtraction';
import { buildSkeletalTrapezoidation } from './trapezoidation';
import { buildEdgeVoronoi } from './voronoi';
import type { VariableWidthPath } from './types';

function toRing(pts: THREE.Vector2[]): PCRing {
  const ring: PCRing = pts.map((p) => [p.x, p.y] as [number, number]);
  if (ring.length > 0) {
    const f = ring[0];
    const l = ring[ring.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) ring.push([f[0], f[1]]);
  }
  return ring;
}

export type { VariableWidthPath } from './types';
export { buildEdgeVoronoi } from './voronoi';
export type { VoronoiEdge, VoronoiGraph, VoronoiSourceEdge, VoronoiVertex } from './voronoi';
export { buildSkeletalTrapezoidation } from './trapezoidation';
export type {
  ArachnePolygon,
  SkeletalTrapezoid,
  TrapezoidGraph,
  TrapezoidNode,
  TrapezoidSample,
} from './trapezoidation';
export { distributeBeads } from './beadStrategy';
export type { Bead, BeadGraph, BeadTrapezoid } from './beadStrategy';
export { extractBeadPaths } from './pathExtraction';
export {
  beadsToDebugSummary,
  pathsToDebugLines,
  trapezoidsToDebugLines,
  voronoiToDebugLines,
} from './voronoiDebug';
export type { VoronoiDebugLines } from './voronoiDebug';

/**
 * Top-level Arachne wall generator entry point.
 *
 * Runs the full Voronoi → trapezoidation → bead-distribution → path-
 * extraction pipeline (ARACHNE-1..4) and converts the resulting
 * `VariableWidthPath[]` into the `GeneratedPerimeters` shape the rest
 * of the slicer consumes. Falls back to the classic fixed-width-offset
 * generator only when Arachne returns no usable paths or a stage
 * throws — that path is purely a safety net, not a hot code path.
 */
/** Set to `true` (e.g. via DevTools `(globalThis as any).__arachneDebug = true`)
 *  to log per-stage timing on every region. Off by default so production
 *  slicing doesn't spam the console. */
const ARACHNE_DEBUG_GLOBAL_KEY = '__arachneDebug';

/** If a layer-region has more than this many polygon edges, skip Arachne
 *  entirely and use classic. Even with the indexed Voronoi, very dense
 *  regions blow past the per-layer time budget — a 1000-edge region is
 *  multiple seconds in the brute-force-with-grid path. Real production
 *  layers rarely hit this in the typical case (50-200 edges per region)
 *  but a curved loft surface or imported STL with high tessellation can
 *  pile up edges quickly. Tunable; raise once Fortune sweep-line lands. */
const ARACHNE_MAX_EDGES = 400;

export function generatePerimetersArachne(
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  wallCount: number,
  lineWidth: number,
  outerWallInset: number,
  printProfile: PrintProfile,
  deps: PerimeterDeps,
): GeneratedPerimeters {
  // PERF: Arachne is significantly more expensive than classic on dense
  // polygons (`O(N · K²)` triples + `O(K)` per-candidate work, vs. classic's
  // single Clipper pass per wall depth which is effectively `O(N log N)`
  // via wasm). For very dense regions we'd just be paying the Arachne cost
  // and then falling back to classic anyway when it fails. Bail early.
  const totalEdges = outerContour.length + holeContours.reduce((s, h) => s + h.length, 0);
  const debug = (globalThis as Record<string, unknown>)[ARACHNE_DEBUG_GLOBAL_KEY] === true;
  if (totalEdges > ARACHNE_MAX_EDGES) {
    if (debug) console.log(`[arachne] ${totalEdges} edges > ${ARACHNE_MAX_EDGES}, falling back to classic`);
    return generatePerimetersEx(
      outerContour, holeContours, wallCount, lineWidth, outerWallInset,
      printProfile, deps,
    );
  }

  try {
    const t0 = debug ? performance.now() : 0;
    const voronoi = buildEdgeVoronoi(outerContour, holeContours);
    const t1 = debug ? performance.now() : 0;
    const trapezoids = buildSkeletalTrapezoidation(voronoi, { outerContour, holeContours });
    const t2 = debug ? performance.now() : 0;
    const minWidth = printProfile.minWallLineWidth ?? lineWidth * 0.5;
    const maxWidth = lineWidth * 2;
    const beads = distributeBeads(trapezoids, lineWidth, minWidth, maxWidth);
    const t3 = debug ? performance.now() : 0;
    const paths = extractBeadPaths(beads).filter((path) =>
      path.points.length >= 2 && path.depth < wallCount && path.widths.length === path.points.length,
    );
    const t4 = debug ? performance.now() : 0;

    if (debug) {
      console.log(
        `[arachne] N=${totalEdges} V=${voronoi.vertices.length} ` +
        `T=${trapezoids.trapezoids.length} P=${paths.length} | ` +
        `voronoi=${(t1 - t0).toFixed(1)}ms trap=${(t2 - t1).toFixed(1)}ms ` +
        `bead=${(t3 - t2).toFixed(1)}ms path=${(t4 - t3).toFixed(1)}ms`,
      );
    }

    if (paths.length === 0) {
      if (debug) console.log('[arachne] no paths produced, falling back to classic');
      return generatePerimetersEx(
        outerContour, holeContours, wallCount, lineWidth, outerWallInset,
        printProfile, deps,
      );
    }

    const insetDistance = outerWallInset + wallCount * lineWidth;
    const { innermostHoles, infillRegions } = computeArachneInfillGeometry(
      outerContour, holeContours, insetDistance, deps,
    );
    return {
      ...variableWidthPathsToPerimeters(paths),
      innermostHoles,
      infillRegions,
    };
  } catch (err) {
    if (debug) console.log('[arachne] threw, falling back to classic', err);
    return generatePerimetersEx(
      outerContour, holeContours, wallCount, lineWidth, outerWallInset,
      printProfile, deps,
    );
  }
}

/**
 * Compute infill geometry directly from the input polygon at the given
 * inset depth, bypassing the classic generator's per-depth wall offset
 * cascade.
 *
 * Classic computes `infillRegions` and `innermostHoles` as a side effect
 * of generating walls — for each depth `d` from 1..wallCount it offsets,
 * differences holes, and stores the last result. Arachne walls don't
 * produce that geometry, so we'd otherwise have to invoke classic just
 * for these two outputs (~30-50% extra cost per layer).
 *
 * Equivalent to a single `(outer ⊖ insetDistance) − ⋃(hole ⊕ insetDistance)`
 * — the polygon's interior at the innermost wall depth.
 */
function computeArachneInfillGeometry(
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][],
  insetDistance: number,
  deps: PerimeterDeps,
): { innermostHoles: THREE.Vector2[][]; infillRegions: InfillRegion[] } {
  const insetOuter = deps.offsetContour(outerContour, -insetDistance);
  if (insetOuter.length < 3) {
    return { innermostHoles: [], infillRegions: [] };
  }

  const innermostHoles = holeContours
    .map((hole) => deps.offsetContour(hole, insetDistance))
    .filter((hole) => hole.length >= 3);

  // Polygon-clipping difference handles the breakthrough case (a hole
  // expansion that overlaps the outer boundary) — falling back to the
  // simple "outer with holes" representation when no clipping is needed
  // would mis-represent breakthroughs.
  const outerMP: PCMultiPolygon = [[toRing(insetOuter)]];
  if (innermostHoles.length === 0) {
    return { innermostHoles: [], infillRegions: deps.multiPolygonToRegions(outerMP) };
  }

  try {
    const holesMP: PCMultiPolygon = innermostHoles.map((hole) => [toRing(hole)]);
    const diff = polygonClipping.difference(outerMP, ...holesMP);
    return { innermostHoles, infillRegions: deps.multiPolygonToRegions(diff) };
  } catch {
    // Degenerate input — fall back to the simple representation. Worst
    // case the slicer fills slightly into a breakthrough region; better
    // than throwing.
    return {
      innermostHoles,
      infillRegions: [{ contour: insetOuter, holes: innermostHoles }],
    };
  }
}

/**
 * Convert a list of variable-width Arachne paths into the existing
 * `GeneratedPerimeters` shape so the rest of the slicer can consume them.
 *
 * Per-vertex line widths are preserved in `lineWidths[i]` as a `number[]`
 * so the emit step can compute extrusion from each segment's local width.
 * Open medial-axis paths are also preserved in `wallClosed[i]`; this keeps
 * branch and breakthrough paths from being incorrectly closed as loops.
 */
export function variableWidthPathsToPerimeters(
  paths: VariableWidthPath[],
): GeneratedPerimeters {
  const walls: THREE.Vector2[][] = [];
  const lineWidths: number[][] = [];
  const wallClosed: boolean[] = [];
  const wallDepths: number[] = [];
  let outerCount = 0;

  // Sort outer-contour walls before hole walls (matches existing convention
  // in `perimeters.ts` where `walls = [...outerLoops, ...holeLoops]`).
  const sorted = [...paths].sort((a, b) => {
    const aOuter = a.source === 'outer' ? 0 : 1;
    const bOuter = b.source === 'outer' ? 0 : 1;
    return aOuter - bOuter;
  });

  for (const path of sorted) {
    if (path.points.length < 2) continue;
    walls.push(path.points);
    lineWidths.push(path.widths);
    wallClosed.push(path.isClosed);
    wallDepths.push(path.depth);
    if (path.source === 'outer') outerCount++;
  }

  return {
    walls,
    lineWidths,
    wallClosed,
    wallDepths,
    outerCount,
    innermostHoles: [],
    infillRegions: [],
  };
}
