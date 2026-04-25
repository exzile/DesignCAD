import { describe, expect, it } from 'vitest';

import { distributeBeads } from '../beadStrategy';
import { extractBeadPaths } from '../pathExtraction';
import { buildSkeletalTrapezoidation } from '../trapezoidation';
import { buildEdgeVoronoi } from '../voronoi';
import {
  acuteCorner,
  annulus,
  hexagon,
  lShape,
  nearCollinear,
  rectangle10x10,
  thinNeck,
  tinyEdge,
} from './fixtures';

const fixtures = [rectangle10x10, hexagon, lShape, annulus, thinNeck];

describe('Arachne fixture coverage', () => {
  it.each(fixtures)('runs the staged Arachne modules for $name', (fixture) => {
    const voronoi = buildEdgeVoronoi(fixture.outer, fixture.holes);
    const trapezoids = buildSkeletalTrapezoidation(voronoi, {
      outerContour: fixture.outer,
      holeContours: fixture.holes,
    });
    const beads = distributeBeads(trapezoids, 0.4, 0.2, 0.8);
    const paths = extractBeadPaths(beads);

    expect(voronoi.sourceEdges.length).toBeGreaterThanOrEqual(fixture.outer.length);
    expect(trapezoids.trapezoids.length).toBeGreaterThan(0);
    expect(beads.trapezoids.length).toBeGreaterThan(0);
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path.widths).toHaveLength(path.points.length);
      expect(path.widths.every((width) => Number.isFinite(width) && width > 0)).toBe(true);
    }
  });

  // Degenerate-input smoke tests: the algorithm shouldn't crash, throw, or
  // produce non-finite widths on near-collinear edges, very acute corners,
  // or sub-cellSize edges. We don't pin specific output shapes — the goal
  // is a graceful degrade, not a particular answer.
  it.each([nearCollinear, acuteCorner, tinyEdge])('survives degenerate input "$name" without crashing', (fixture) => {
    const voronoi = buildEdgeVoronoi(fixture.outer, fixture.holes);
    expect(voronoi.sourceEdges.length).toBeGreaterThan(0);
    expect(voronoi.vertices.every((v) => Number.isFinite(v.point.x) && Number.isFinite(v.point.y))).toBe(true);
    expect(voronoi.vertices.every((v) => Number.isFinite(v.radius) && v.radius >= 0)).toBe(true);

    const trapezoids = buildSkeletalTrapezoidation(voronoi, {
      outerContour: fixture.outer,
      holeContours: fixture.holes,
    });
    const beads = distributeBeads(trapezoids, 0.4, 0.2, 0.8);
    const paths = extractBeadPaths(beads);
    for (const path of paths) {
      expect(path.widths).toHaveLength(path.points.length);
      expect(path.widths.every((w) => Number.isFinite(w) && w >= 0)).toBe(true);
    }
  });

  it('captures the thin-neck fixture as sub-nominal gap-fill material', () => {
    const voronoi = buildEdgeVoronoi(thinNeck.outer, thinNeck.holes);
    const trapezoids = buildSkeletalTrapezoidation(voronoi, {
      outerContour: thinNeck.outer,
      holeContours: thinNeck.holes,
    });
    const beads = distributeBeads(trapezoids, 0.4, 0.2, 0.8);
    const paths = extractBeadPaths(beads);

    expect(paths.some((path) => path.source === 'gapfill')).toBe(true);
  });
});
