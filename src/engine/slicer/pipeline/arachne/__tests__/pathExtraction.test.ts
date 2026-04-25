import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import type { BeadGraph, BeadTrapezoid } from '../beadStrategy';
import { extractBeadPaths } from '../pathExtraction';

const v = (x: number, y: number) => new THREE.Vector2(x, y);

function closedRectangleBeadGraph(): BeadGraph {
  const sourceA = [v(0, 0), v(5, 0), v(5, 5), v(0, 5), v(0, 0)];
  const sourceB = [v(0.8, 0.8), v(4.2, 0.8), v(4.2, 4.2), v(0.8, 4.2), v(0.8, 0.8)];
  const centerline = [v(0.4, 0.4), v(4.6, 0.4), v(4.6, 4.6), v(0.4, 4.6), v(0.4, 0.4)];
  const trapezoid: BeadTrapezoid = {
    trapezoidId: 0,
    sourceEdgeIds: [0, 1],
    centerline,
    samples: sourceA.map((point, index) => ({
      center: centerline[index],
      sourceA: point,
      sourceB: sourceB[index],
      width: point.distanceTo(sourceB[index]),
    })),
    beadCount: 2,
    width: 0.8,
    minWidth: 0.8,
    maxWidth: 0.8,
    beads: [
      {
        index: 0,
        depth: 0,
        width: 0.4,
        location: 0.2,
        sampleWidths: [0.4, 0.4, 0.4, 0.4, 0.4],
        sampleLocations: [0.2, 0.2, 0.2, 0.2, 0.2],
      },
      {
        index: 1,
        depth: 1,
        width: 0.4,
        location: 0.6,
        sampleWidths: [0.4, 0.4, 0.4, 0.4, 0.4],
        sampleLocations: [0.6, 0.6, 0.6, 0.6, 0.6],
      },
    ],
  };

  return {
    trapezoids: [trapezoid],
    sourceEdges: [
      { id: 0, contourIndex: 0, edgeIndex: 0, isHole: false, a: v(0, 0), b: v(5, 0) },
      { id: 1, contourIndex: 0, edgeIndex: 1, isHole: false, a: v(0.8, 0.8), b: v(4.2, 0.8) },
    ],
    polygon: { outerContour: sourceA.slice(0, -1) },
    lineWidth: 0.4,
    minWidth: 0.2,
    maxWidth: 0.8,
  };
}

function branchBeadGraph(): BeadGraph {
  const junction = v(0, 0);
  const endpoints = [v(3, 0), v(-2, 2), v(-2, -2)];
  const trapezoids: BeadTrapezoid[] = endpoints.map((end, index) => ({
    trapezoidId: index,
    sourceEdgeIds: [0, 1],
    centerline: [junction, end],
    samples: [
      { center: junction, sourceA: v(0, -0.2), sourceB: v(0, 0.2), width: 0.4 },
      { center: end, sourceA: end.clone().add(v(0, -0.2)), sourceB: end.clone().add(v(0, 0.2)), width: 0.4 },
    ],
    beadCount: 1,
    width: 0.4,
    minWidth: 0.4,
    maxWidth: 0.4,
    beads: [{
      index: 0,
      depth: 0,
      width: 0.4,
      location: 0.2,
      sampleWidths: [0.4, 0.4],
      sampleLocations: [0.2, 0.2],
    }],
  }));

  return {
    trapezoids,
    sourceEdges: [
      { id: 0, contourIndex: 0, edgeIndex: 0, isHole: false, a: v(0, -0.2), b: v(0, 0.2) },
      { id: 1, contourIndex: 0, edgeIndex: 1, isHole: false, a: v(3, -0.2), b: v(3, 0.2) },
    ],
    polygon: { outerContour: [] },
    lineWidth: 0.4,
    minWidth: 0.2,
    maxWidth: 0.8,
  };
}

describe('extractBeadPaths', () => {
  it('extracts two closed variable-width paths from a 5 mm rectangle with two beads', () => {
    const paths = extractBeadPaths(closedRectangleBeadGraph()).sort((a, b) => a.depth - b.depth);

    expect(paths).toHaveLength(2);
    expect(paths[0].depth).toBe(0);
    expect(paths[1].depth).toBe(1);
    for (const path of paths) {
      expect(path.isClosed).toBe(true);
      expect(path.source).toBe('outer');
      expect(path.points).toHaveLength(4);
      expect(path.widths).toHaveLength(path.points.length);
      expect(path.widths.every((width) => Math.abs(width - 0.4) < 1e-6)).toBe(true);
    }
  });

  it('preserves per-vertex width variation for tapered beads', () => {
    const graph = closedRectangleBeadGraph();
    graph.trapezoids[0].beads[0].sampleWidths = [0.3, 0.4, 0.5, 0.4, 0.3];
    const paths = extractBeadPaths(graph);
    const outer = paths.find((path) => path.depth === 0);

    expect(outer).toBeTruthy();
    expect(outer!.widths).toEqual([
      expect.closeTo(0.3, 6),
      expect.closeTo(0.4, 6),
      expect.closeTo(0.5, 6),
      expect.closeTo(0.4, 6),
    ]);
  });

  it('marks single sub-nominal beads as gap fill', () => {
    const graph = closedRectangleBeadGraph();
    graph.trapezoids[0].beadCount = 1;
    graph.trapezoids[0].width = 0.55;
    graph.trapezoids[0].beads = [graph.trapezoids[0].beads[0]];
    const paths = extractBeadPaths(graph);

    expect(paths).toHaveLength(1);
    expect(paths[0].source).toBe('gapfill');
  });

  it('preserves medial-axis branch arms as open paths instead of joining through a junction', () => {
    const paths = extractBeadPaths(branchBeadGraph());

    expect(paths).toHaveLength(3);
    expect(paths.every((path) => !path.isClosed)).toBe(true);
    expect(paths.every((path) => path.points.length === 2)).toBe(true);
  });
});
