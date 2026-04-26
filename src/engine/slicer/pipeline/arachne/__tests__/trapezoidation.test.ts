import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { buildSkeletalTrapezoidation } from '../trapezoidation';
import { buildEdgeVoronoi } from '../voronoi';
import { annulus, breakthroughHole, thinNeck } from './fixtures';

const v = (x: number, y: number) => new THREE.Vector2(x, y);

describe('buildSkeletalTrapezoidation', () => {
  it('assigns the local thickness as width for a uniform 2 mm rectangle', () => {
    const outer = [v(0, 0), v(10, 0), v(10, 2), v(0, 2)];
    const voronoi = buildEdgeVoronoi(outer, []);
    const graph = buildSkeletalTrapezoidation(voronoi, { outerContour: outer });

    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.trapezoids.length).toBeGreaterThan(0);
    for (const trapezoid of graph.trapezoids) {
      expect(trapezoid.width).toBeCloseTo(2, 6);
      expect(trapezoid.minWidth).toBeCloseTo(2, 6);
      expect(trapezoid.maxWidth).toBeCloseTo(2, 6);
      expect(trapezoid.samples.every((sample) => sample.sourceA.distanceTo(sample.sourceB) > 0)).toBe(true);
    }
  });

  it('builds trapezoids over Voronoi edges and preserves source-edge pairs', () => {
    const outer = [v(0, 0), v(10, 0), v(7, 4), v(3, 4)];
    const voronoi = buildEdgeVoronoi(outer, []);
    const graph = buildSkeletalTrapezoidation(voronoi, outer);

    expect(voronoi.vertices).toHaveLength(2);
    expect(graph.trapezoids).toHaveLength(1);
    // Centerlines are subdivided so bead path extraction has interior
    // samples that carry the bead offset while endpoints snap to Voronoi
    // vertices for clean junction-to-junction merging.
    expect(graph.trapezoids[0].centerline.length).toBeGreaterThanOrEqual(2);
    expect(graph.trapezoids[0].sourceEdgeIds).toEqual([0, 2]);
    expect(graph.trapezoids[0].width).toBeCloseTo(4, 6);
    // First and last centerline points should still be the original
    // Voronoi-vertex endpoints (subdivision only inserts in between).
    const cl = graph.trapezoids[0].centerline;
    expect(cl[0].distanceTo(voronoi.vertices[0].point)).toBeLessThan(1e-6);
    expect(cl[cl.length - 1].distanceTo(voronoi.vertices[1].point)).toBeLessThan(1e-6);
  });

  it('captures varying local widths in a thin-neck polygon', () => {
    const voronoi = buildEdgeVoronoi(thinNeck.outer, thinNeck.holes);
    const graph = buildSkeletalTrapezoidation(voronoi, {
      outerContour: thinNeck.outer,
      holeContours: thinNeck.holes,
    });
    const widths = graph.trapezoids.flatMap((trapezoid) => [trapezoid.minWidth, trapezoid.maxWidth]);

    expect(graph.trapezoids.length).toBeGreaterThan(1);
    expect(Math.min(...widths)).toBeLessThan(1);
    expect(Math.max(...widths)).toBeGreaterThan(4);
  });

  it('handles annulus (outer + hole) — every trapezoid has finite width', () => {
    const voronoi = buildEdgeVoronoi(annulus.outer, annulus.holes);
    const graph = buildSkeletalTrapezoidation(voronoi, {
      outerContour: annulus.outer,
      holeContours: annulus.holes,
    });
    expect(graph.trapezoids.length).toBeGreaterThan(0);
    for (const trapezoid of graph.trapezoids) {
      expect(Number.isFinite(trapezoid.width)).toBe(true);
      expect(trapezoid.width).toBeGreaterThan(0);
      // The annulus has a uniform 6 mm gap between hole and outer, so most
      // trapezoid widths should be near that.
      expect(trapezoid.width).toBeLessThanOrEqual(annulus.minThickness * 1.5);
    }
  });

  it('breakthroughHole — does not throw and produces sane widths', () => {
    // The motivating fixture for Arachne: a hole that touches the model
    // boundary. Trapezoidation should still complete; later stages
    // (bead distribution) will decide that the broken-through region
    // needs no walls.
    const voronoi = buildEdgeVoronoi(breakthroughHole.outer, breakthroughHole.holes);
    const graph = buildSkeletalTrapezoidation(voronoi, {
      outerContour: breakthroughHole.outer,
      holeContours: breakthroughHole.holes,
    });
    for (const trapezoid of graph.trapezoids) {
      expect(Number.isFinite(trapezoid.width)).toBe(true);
      expect(trapezoid.minWidth).toBeGreaterThanOrEqual(0);
    }
  });
});
