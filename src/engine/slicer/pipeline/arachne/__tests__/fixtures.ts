import * as THREE from 'three';

/**
 * Reference fixtures for Arachne unit tests. Each fixture is a polygon
 * defined by an outer contour + an array of hole contours (each contour
 * is a closed loop — first point != last point, the closure is implicit).
 *
 * Coordinates are in millimetres.
 *
 * Conventions:
 *   • Outer contour: counter-clockwise (CCW)
 *   • Hole contours: clockwise (CW)
 *   • Polygons are in 2D — we use THREE.Vector2 because the rest of the
 *     slicer uses it; the Z slice plane is handled by the caller.
 */

export interface Fixture {
  name: string;
  outer: THREE.Vector2[];
  holes: THREE.Vector2[][];
  /** Human description of what this fixture exercises. */
  describe: string;
  /** Smallest local "thickness" anywhere in the polygon (used to verify
   *  trapezoidation widths are reasonable). */
  minThickness: number;
}

const v = (x: number, y: number) => new THREE.Vector2(x, y);

/** A simple 10 × 10 mm square, no holes. The Arachne pipeline should
 *  produce one outer wall + one inner wall, both clean closed loops. */
export const rectangle10x10: Fixture = {
  name: 'rectangle10x10',
  outer: [v(0, 0), v(10, 0), v(10, 10), v(0, 10)],
  holes: [],
  describe: '10 × 10 mm square, no holes',
  minThickness: 10,
};

/** A regular hexagon inscribed in a 10 mm diameter circle. */
export const hexagon: Fixture = (() => {
  const r = 5;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pts.push(v(Math.cos(a) * r, Math.sin(a) * r));
  }
  return {
    name: 'hexagon',
    outer: pts,
    holes: [],
    describe: 'Regular hexagon inscribed in 10 mm diameter circle',
    minThickness: r * Math.sqrt(3), // shortest cross-section
  };
})();

/** L-shape: a 10 × 10 square with a 5 × 5 corner removed. Has one
 *  concave (inward-pointing) vertex which exercises the trapezoidation
 *  algorithm's handling of non-convex polygons. */
export const lShape: Fixture = {
  name: 'lShape',
  outer: [
    v(0, 0), v(10, 0), v(10, 5), v(5, 5), v(5, 10), v(0, 10),
  ],
  holes: [],
  describe: '10 × 10 mm L-shape (inverted L) — non-convex polygon',
  minThickness: 5,
};

/** Annulus: outer 20 × 20 square with a centred 8 × 8 hole. The wall
 *  generator should emit independent rings around the outer perimeter
 *  and around the hole. */
export const annulus: Fixture = {
  name: 'annulus',
  outer: [v(0, 0), v(20, 0), v(20, 20), v(0, 20)],
  holes: [
    // Hole wound CW (opposite of outer).
    [v(6, 6), v(6, 14), v(14, 14), v(14, 6)],
  ],
  describe: '20 × 20 mm square with centred 8 × 8 hole',
  minThickness: 6, // gap between hole edge and outer edge
};

/** A polygon pinched in the middle to a 0.6 mm width. The classic offset
 *  generator at lw=0.4 mm produces a fragmented wall through the neck;
 *  Arachne should produce ONE bead in the neck (single wider wall) with
 *  smooth transitions on either side. */
export const thinNeck: Fixture = {
  name: 'thinNeck',
  outer: [
    v(0, 0), v(10, 0), v(10, 4.7), v(5.3, 4.7), v(5.3, 5.3), v(10, 5.3),
    v(10, 10), v(0, 10), v(0, 5.3), v(4.7, 5.3), v(4.7, 4.7), v(0, 4.7),
  ],
  holes: [],
  describe: 'Two 5 mm squares connected by a 0.6 mm wide neck',
  minThickness: 0.6,
};

/** A 10 × 10 mm square with a hole that touches one edge — i.e. the hole
 *  has "broken through" the model boundary. The classic generator at any
 *  non-trivial wall offset produces a notched perimeter that snakes
 *  around the breakthrough. Arachne should detect the breakthrough and
 *  TERMINATE the wall there cleanly (no notch). */
export const breakthroughHole: Fixture = {
  name: 'breakthroughHole',
  outer: [v(0, 0), v(10, 0), v(10, 10), v(0, 10)],
  holes: [
    // Hole touching the right edge of the square. CW winding.
    [v(7, 4), v(7, 6), v(10.001, 6), v(10.001, 4)],
  ],
  describe: 'Square with hole that touches one edge (breakthrough)',
  minThickness: 0,
};

/** A polygon with two near-collinear edges. Three consecutive vertices
 *  almost on a line (within 1 µm) — the previous brute-force voronoi
 *  rejected such triples in `solveLineBisectors` (det ≈ 0), but the
 *  algorithm shouldn't crash and the rest of the polygon should produce
 *  sensible vertices. */
export const nearCollinear: Fixture = {
  name: 'nearCollinear',
  outer: [v(0, 0), v(5, 0.0000001), v(10, 0), v(10, 5), v(0, 5)],
  holes: [],
  describe: '5-vertex polygon with three near-collinear vertices on the bottom edge',
  minThickness: 5,
};

/** A polygon with a very acute corner (≈ 5°). Voronoi vertices crowd
 *  toward the apex within `MERGE_EPS`; the `mergeVertex` spatial-hash
 *  must consolidate them rather than blowing up the vertex count. */
export const acuteCorner: Fixture = {
  name: 'acuteCorner',
  outer: [v(0, 0), v(20, 0.5), v(20, -0.5)],
  holes: [],
  describe: 'Very thin triangle with ~5° apex angle',
  minThickness: 0.5,
};

/** A square with one very short edge (length 1e-4, well below typical
 *  cellSize). Tests that the spatial grid degrades gracefully when an
 *  edge spans 0 cells of its own — `buildSourceEdges` already drops
 *  edges below `EPS = 1e-7`, so 1e-4 should survive but stress the
 *  grid bin-density assumption. */
export const tinyEdge: Fixture = {
  name: 'tinyEdge',
  outer: [v(0, 0), v(10, 0), v(10, 5.0001), v(10, 5), v(0, 5)],
  holes: [],
  describe: 'Square-ish polygon with a 1e-4 mm edge on the right side',
  minThickness: 5,
};

export const allFixtures: Fixture[] = [
  rectangle10x10,
  hexagon,
  lShape,
  annulus,
  thinNeck,
  breakthroughHole,
  nearCollinear,
  acuteCorner,
  tinyEdge,
];
