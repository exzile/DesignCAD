import type * as THREE from 'three';

import type { VoronoiGraph } from './voronoi';
import type { TrapezoidGraph } from './trapezoidation';
import type { BeadGraph } from './beadStrategy';
import type { VariableWidthPath } from './types';

/**
 * Renderable line/point data extracted from the Arachne pipeline's
 * intermediate stages, ready for a debug overlay in the slice preview.
 *
 * Why a separate module: the algorithm modules (`voronoi.ts`, etc.) deal
 * in their own internal structures (`VoronoiGraph`, `TrapezoidGraph`,
 * `BeadGraph`). The viewport doesn't want to know about those — it just
 * wants line segments to draw with colours. This file is the adapter.
 *
 * To wire this into the preview:
 *   1. Have the arachne entry point (or the pipeline step that calls it)
 *      stash the per-layer `VoronoiGraph` on the layer record.
 *   2. In the viewport, call one of the `*ToDebugLines` helpers below to
 *      convert it to a `VoronoiDebugLines` payload.
 *   3. Render each `kind`-tagged sub-array as `THREE.LineSegments` with
 *      the colour shown in the comment next to each kind.
 *
 * The output is intentionally pure data — no THREE meshes, no R3F
 * components — so this module stays unit-testable and free of the
 * disposal/r3f-hooks rules in CLAUDE.md.
 */
export interface VoronoiDebugLines {
  /** Source polygon outer edges (model boundary). Suggested: white #ffffff. */
  sourceOuter: number[];
  /** Source polygon hole edges. Suggested: red #ff5050. */
  sourceHoles: number[];
  /** Voronoi graph edges (skeleton centerlines). Suggested: cyan #50e0ff. */
  voronoiEdges: number[];
  /** Voronoi vertex positions, flattened pairs of (x, y). Suggested:
   *  yellow #ffd040 squares, sized by `vertexRadii[i]`. */
  voronoiVertices: number[];
  /** Parallel to `voronoiVertices` (one entry per vertex), the empty-
   *  circle radius — useful for sizing the debug glyph. */
  vertexRadii: number[];
}

/** Push a pair of THREE.Vector2 endpoints onto a flat number[]. */
function pushSegment(out: number[], a: THREE.Vector2, b: THREE.Vector2): void {
  out.push(a.x, a.y, b.x, b.y);
}

export function voronoiToDebugLines(graph: VoronoiGraph): VoronoiDebugLines {
  const sourceOuter: number[] = [];
  const sourceHoles: number[] = [];
  for (const edge of graph.sourceEdges) {
    pushSegment(edge.isHole ? sourceHoles : sourceOuter, edge.a, edge.b);
  }

  const voronoiEdges: number[] = [];
  for (const edge of graph.edges) {
    for (let i = 0; i < edge.points.length - 1; i++) {
      pushSegment(voronoiEdges, edge.points[i], edge.points[i + 1]);
    }
  }

  const voronoiVertices: number[] = [];
  const vertexRadii: number[] = [];
  for (const vertex of graph.vertices) {
    voronoiVertices.push(vertex.point.x, vertex.point.y);
    vertexRadii.push(vertex.radius);
  }

  return { sourceOuter, sourceHoles, voronoiEdges, voronoiVertices, vertexRadii };
}

/**
 * Lower-level debug payload for the trapezoidation stage — useful when
 * the Voronoi looks fine but skeletal trapezoids are dropping triangles.
 * Returns the centerline of each trapezoid as a polyline.
 */
export function trapezoidsToDebugLines(graph: TrapezoidGraph): number[] {
  const out: number[] = [];
  for (const trap of graph.trapezoids) {
    for (let i = 0; i < trap.centerline.length - 1; i++) {
      pushSegment(out, trap.centerline[i], trap.centerline[i + 1]);
    }
  }
  return out;
}

/**
 * Bead-distribution debug payload — bead count + width along the
 * trapezoid centerline. Useful for verifying a thin-neck region got
 * 1 bead vs 2 vs 3.
 */
export function beadsToDebugSummary(graph: BeadGraph): Array<{
  trapezoidId: number;
  beadCount: number;
  widths: number[];
}> {
  return graph.trapezoids.map((trap) => ({
    trapezoidId: trap.trapezoidId,
    beadCount: trap.beadCount,
    widths: trap.beads.map((bead) => bead.width),
  }));
}

/** Final-stage variable-width paths as colour-keyed line segments,
 *  matching the existing wall-outer / wall-inner / gap-fill convention. */
export function pathsToDebugLines(paths: VariableWidthPath[]): {
  outer: number[];
  inner: number[];
  gapfill: number[];
} {
  const outer: number[] = [];
  const inner: number[] = [];
  const gapfill: number[] = [];
  for (const path of paths) {
    const target = path.source === 'outer' ? (path.depth === 0 ? outer : inner)
      : path.source === 'gapfill' ? gapfill
      : (path.depth === 0 ? outer : inner);
    for (let i = 0; i < path.points.length - 1; i++) {
      pushSegment(target, path.points[i], path.points[i + 1]);
    }
    if (path.isClosed && path.points.length > 1) {
      pushSegment(target, path.points[path.points.length - 1], path.points[0]);
    }
  }
  return { outer, inner, gapfill };
}
