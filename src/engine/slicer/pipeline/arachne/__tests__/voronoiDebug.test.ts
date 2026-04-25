import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { distributeBeads } from '../beadStrategy';
import { extractBeadPaths } from '../pathExtraction';
import { buildSkeletalTrapezoidation } from '../trapezoidation';
import { buildEdgeVoronoi } from '../voronoi';
import {
  beadsToDebugSummary,
  pathsToDebugLines,
  trapezoidsToDebugLines,
  voronoiToDebugLines,
} from '../voronoiDebug';

const v = (x: number, y: number) => new THREE.Vector2(x, y);

describe('voronoiDebug helpers', () => {
  it('serialises a voronoi graph into flat line-segment arrays for rendering', () => {
    const outer = [v(0, 0), v(10, 0), v(10, 10), v(0, 10)];
    const graph = buildEdgeVoronoi(outer, []);
    const debug = voronoiToDebugLines(graph);

    // Every source edge contributes 4 numbers (ax, ay, bx, by).
    expect(debug.sourceOuter).toHaveLength(graph.sourceEdges.filter((e) => !e.isHole).length * 4);
    expect(debug.sourceHoles).toHaveLength(0);
    expect(debug.voronoiVertices).toHaveLength(graph.vertices.length * 2);
    expect(debug.vertexRadii).toHaveLength(graph.vertices.length);
    expect(debug.vertexRadii.every((r) => r >= 0 && Number.isFinite(r))).toBe(true);
  });

  it('separates outer-source from hole-source edges in the debug payload', () => {
    const outer = [v(0, 0), v(20, 0), v(20, 20), v(0, 20)];
    const holes = [[v(8, 8), v(8, 12), v(12, 12), v(12, 8)]];
    const debug = voronoiToDebugLines(buildEdgeVoronoi(outer, holes));

    expect(debug.sourceOuter.length).toBeGreaterThan(0);
    expect(debug.sourceHoles.length).toBeGreaterThan(0);
  });

  it('emits trapezoid centerlines and bead summaries for downstream stages', () => {
    const outer = [v(0, 0), v(10, 0), v(10, 5), v(0, 5)];
    const voronoi = buildEdgeVoronoi(outer, []);
    const trapezoids = buildSkeletalTrapezoidation(voronoi, { outerContour: outer });
    const beads = distributeBeads(trapezoids, 0.4, 0.2, 0.8);

    expect(trapezoidsToDebugLines(trapezoids).length % 4).toBe(0); // ax,ay,bx,by tuples
    const summary = beadsToDebugSummary(beads);
    expect(summary.length).toBe(beads.trapezoids.length);
    for (const entry of summary) {
      expect(entry.widths.length).toBe(entry.beadCount);
    }

    const paths = extractBeadPaths(beads);
    const lines = pathsToDebugLines(paths);
    // Every numeric array length is a multiple of 4 (segment endpoints).
    expect(lines.outer.length % 4).toBe(0);
    expect(lines.inner.length % 4).toBe(0);
    expect(lines.gapfill.length % 4).toBe(0);
  });
});
