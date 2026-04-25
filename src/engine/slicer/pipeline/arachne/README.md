# Arachne — variable-width wall generator

This module is a TypeScript port of Cura's [Arachne wall generator](https://ultimaker.com/learn/arachne-engine-cura-5/),
based on Vink et al. 2022 *"Beyond Meshes — Toolpath Generation in 3D Printing
of Solid Objects"*. The goal is variable-width walls so narrow regions in a
polygon (e.g. the gap between a hole and the model boundary) get a single
fat wall instead of a snake of multiple fragmented thin walls.

The classic fixed-width-offset generator in `../perimeters.ts` stays as a
fallback (gated on `pp.useArachne`).

## Pipeline

```
polygon (outer + holes)
    │
    ▼
[1. Voronoi]              ← voronoi.ts
    voronoi diagram of polygon edges (each edge is a bisector
    between two polygon edges; each vertex is equidistant from
    3+ polygon edges)
    │
    ▼
[2. Trapezoidation]       ← trapezoidation.ts
    decompose polygon into trapezoids whose two parallel sides
    are pieces of the polygon edges and whose two slanted sides
    are voronoi edges. Each trapezoid carries a "width" (perpendicular
    distance between its parallel sides).
    │
    ▼
[3. Bead distribution]    ← beadStrategy.ts
    decide how many beads (walls) fit in each trapezoid given its
    width. Output: bead count + per-bead width per trapezoid,
    such that beads exactly fill the trapezoid.
    │
    ▼
[4. Path extraction]      ← pathExtraction.ts
    walk the bead graph, extract continuous polylines per wall depth.
    Each path: { points: Vec2[], widths: number[], depth, isClosed }
    │
    ▼
[5. Pipeline integration] ← ../perimeters.ts + emitGroupedAndContourWalls.ts
    preserve per-vertex widths and open/closed path topology through G-code emission.
```

## Reference: Cura source files to port

All paths below are relative to <https://github.com/Ultimaker/CuraEngine>.
Tag `5.6.0` is a stable reference (released 2023, mature Arachne).

| Step | Cura file | Lines (approx, tag 5.6.0) | Algorithm |
|------|-----------|---------------------------|-----------|
| 1 | `include/utils/SkeletalTrapezoidation.h` | 1-200 | data structures (`SkeletalTrapezoidationGraph`, `node_t`, `edge_t`) |
| 1 | `src/utils/SkeletalTrapezoidation.cpp` | `constructFromPolygons` | builds Voronoi via `boost::polygon::voronoi` then converts to internal graph |
| 1 | (boost) `boost/polygon/voronoi.hpp` | — | the underlying Voronoi algorithm. Pure-JS port option: <https://github.com/d3/d3-voronoi> (point Voronoi only — does NOT do edge Voronoi, which is what we need; treat each polygon edge as a "site" and use the boost-style segment Voronoi) |
| 2 | `src/utils/SkeletalTrapezoidation.cpp` | `generateToolpaths` (top of file) | trapezoid decomposition from voronoi |
| 2 | `include/utils/SkeletalTrapezoidationGraph.h` | full | trapezoid graph shape |
| 3 | `src/BeadingStrategy/DistributedBeadingStrategy.cpp` | full | the default bead-count + width allocator |
| 3 | `src/BeadingStrategy/RedistributeBeadingStrategy.cpp` | `compute` | adjusts beads to match nominal line width |
| 3 | `src/BeadingStrategy/LimitedBeadingStrategy.cpp` | `compute` | clamps to wallCount maximum |
| 4 | `src/SkeletalTrapezoidation.cpp` | `generateToolpaths` (bottom) | walks the bead graph and emits `VariableWidthPaths` |
| 4 | `include/utils/ExtrusionLine.h` | full | the variable-width path data structure |
| 5 | `src/WallToolPaths.cpp` | full | top-level glue that calls the above pipeline |

## Variable-width path data structure

```ts
export interface VariableWidthPath {
  /** Polyline points along the wall centerline. */
  points: { x: number; y: number }[];
  /** Per-vertex line width (mm). length === points.length.
   *  The wall's width tapers between consecutive vertices. */
  widths: number[];
  /** Wall depth: 0 = outermost (wall-outer of its contour), 1+ = inner. */
  depth: number;
  /** Whether the polyline closes back on itself (forms a loop). */
  isClosed: boolean;
}
```

The integration step converts this into the existing
`GeneratedPerimeters` shape:
- `walls[i]` = a single wall's `points`
- `lineWidths[i]` = per-segment widths (changed from `number` to `number[]`)
- `wallClosed[i]` = whether the path forms a closed loop
- `wallDepths[i]` = the wall's `depth`

## Coordinate system

All Arachne functions work in 2D model coordinates (mm). The slice plane Z
is irrelevant — Arachne is called per-layer with the layer's polygon, and
emits 2D paths that the layer-emit step then extrudes at the layer's Z.

## Testing

Reference fixtures live in `__tests__/fixtures.ts`. Each fixture is a known
input polygon with a documented expected outcome:

| Fixture | Description | Expected wall count at depth 0 / depth 1 |
|---------|-------------|-------------------------------------------|
| `rectangle10x10` | 10 × 10 mm square | 1 / 1 |
| `hexagon` | 6-sided regular polygon, 10 mm diameter | 1 / 1 |
| `lShape` | L-shaped polygon (10×10 minus 5×5 corner) | 1 / 1 |
| `annulus` | 10 mm outer, 4 mm hole concentric | 1 / 1 (outer) + 1 / 1 (hole) |
| `thinNeck` | rectangle pinched to 0.6 mm at the middle | varies — narrow region has 1 wider bead |
| `breakthroughHole` | 10 mm rectangle with hole touching one edge | wall stops at breakthrough, no notch |

The `breakthroughHole` is THE motivating fixture — this is the case the
classic generator handles poorly (notch-snake) and Arachne handles well
(narrow region replaced by gap-fill or single fat wall, no notch).

## Notes for implementers

- **Numerical robustness**: the Voronoi algorithm is sensitive to nearly-
  collinear edges. Use `boost::polygon`'s integer-coordinate snap (multiply
  inputs by ~1000 before the algorithm, divide outputs by ~1000) — Cura
  does this. Floating-point Voronoi has well-known degeneracies.
- **Hole orientation**: holes must be wound opposite to the outer (CCW outer
  + CW holes, per Cura's convention). Don't assume input is correctly wound.
- **Performance**: Cura caches the trapezoidation per layer. We can do the
  same — most layers have similar polygons, so a hash-keyed cache helps.
