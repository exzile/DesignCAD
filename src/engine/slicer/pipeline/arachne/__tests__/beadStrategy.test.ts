import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { distributeBeads } from '../beadStrategy';
import type { TrapezoidGraph } from '../trapezoidation';
import { buildSkeletalTrapezoidation } from '../trapezoidation';
import { buildEdgeVoronoi } from '../voronoi';
import { thinNeck } from './fixtures';

function graphWithWidth(width: number): TrapezoidGraph {
  const center = new THREE.Vector2(width / 2, 0);
  return {
    sourceEdges: [
      { id: 0, contourIndex: 0, edgeIndex: 0, isHole: false, a: new THREE.Vector2(0, -1), b: new THREE.Vector2(0, 1) },
      { id: 1, contourIndex: 0, edgeIndex: 1, isHole: false, a: new THREE.Vector2(width, -1), b: new THREE.Vector2(width, 1) },
    ],
    nodes: [{ id: 0, point: center, width }],
    trapezoids: [{
      id: 0,
      voronoiVertexIds: [0],
      sourceEdgeIds: [0, 1],
      centerline: [center],
      samples: [{
        center,
        sourceA: new THREE.Vector2(0, 0),
        sourceB: new THREE.Vector2(width, 0),
        width,
      }],
      width,
      minWidth: width,
      maxWidth: width,
    }],
    polygon: { outerContour: [] },
  };
}

describe('distributeBeads', () => {
  it('places one bead in a 0.6 mm region with a 0.4 mm nominal line width', () => {
    const graph = distributeBeads(graphWithWidth(0.6), 0.4, 0.2, 0.8);
    const trapezoid = graph.trapezoids[0];

    expect(trapezoid.beadCount).toBe(1);
    expect(trapezoid.beads).toHaveLength(1);
    expect(trapezoid.beads[0].width).toBeCloseTo(0.6, 6);
    expect(trapezoid.beads[0].location).toBeCloseTo(0.3, 6);
  });

  it('places two equal beads in a 0.9 mm region with a 0.4 mm nominal line width', () => {
    const graph = distributeBeads(graphWithWidth(0.9), 0.4, 0.2, 0.8);
    const trapezoid = graph.trapezoids[0];

    expect(trapezoid.beadCount).toBe(2);
    expect(trapezoid.beads.map((bead) => bead.width)).toEqual([
      expect.closeTo(0.45, 6),
      expect.closeTo(0.45, 6),
    ]);
    expect(trapezoid.beads.map((bead) => bead.location)).toEqual([
      expect.closeTo(0.225, 6),
      expect.closeTo(0.675, 6),
    ]);
  });

  it('uses three or more beads and keeps widths summing to the trapezoid thickness', () => {
    const graph = distributeBeads(graphWithWidth(1.4), 0.4, 0.2, 0.8);
    const trapezoid = graph.trapezoids[0];
    const totalWidth = trapezoid.beads.reduce((sum, bead) => sum + bead.width, 0);

    expect(trapezoid.beadCount).toBeGreaterThanOrEqual(3);
    expect(totalWidth).toBeCloseTo(1.4, 6);
  });

  it('carries variable sample widths from thin-neck trapezoids', () => {
    const voronoi = buildEdgeVoronoi(thinNeck.outer, thinNeck.holes);
    const trapezoids = buildSkeletalTrapezoidation(voronoi, {
      outerContour: thinNeck.outer,
      holeContours: thinNeck.holes,
    });
    const graph = distributeBeads(trapezoids, 0.4, 0.2, 0.8);

    expect(graph.trapezoids.some((trapezoid) => trapezoid.beadCount === 1 && trapezoid.width < 1)).toBe(true);
    expect(graph.trapezoids.some((trapezoid) => trapezoid.beadCount >= 3 && trapezoid.width > 1)).toBe(true);
  });
});
