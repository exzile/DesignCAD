import * as THREE from 'three';

import { pointInContour, signedArea } from '../../geometry/contourUtils';

const EPS = 1e-7;
const MERGE_EPS = 1e-5;
const NEIGHBORHOOD_K = 20;

// PERFORMANCE NOTE
// ----------------
// The original implementation was O(N³) brute-force: enumerate every triple
// of polygon edges, solve for their bisector intersection, then run an O(N)
// `pointInMaterial` + O(N) `closestSourceEdges` per candidate — yielding
// ~O(N⁴) total. That stalled the slicer on production layers (200+ edges).
//
// This version replaces both cost centers with a uniform-grid spatial index
// over edge bounding boxes:
//   • Triple enumeration is restricted to per-edge KNN "neighborhoods" of
//     size K (default 20). Voronoi vertices are by definition equidistant
//     from 3+ edges within their empty-circle radius, so spatially distant
//     triples never produce a real vertex. Outer loop drops from O(N³) to
//     O(N · K²).
//   • `closestSourceEdges` queries the grid for edges within an expanding
//     radius until ≥3 candidates are found, then refines. Per-candidate
//     work drops from O(N) to O(K).
//
// Pure-JS, no WASM dep, ~10-100× faster than the brute-force in the typical
// N=100-500 range. For unrestricted accuracy on huge layers (N>1500) a
// proper Fortune sweep-line port (Held & Pfeifer, VRONI) or a WASM build of
// `boost::polygon::voronoi` is still the right next step.

/** Bounding box of an array of points. Used to short-circuit point-in-
 *  contour ray casts when the candidate point is obviously outside. */
interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function computeBBox(contour: THREE.Vector2[]): BBox {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of contour) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function bboxContains(bbox: BBox, p: THREE.Vector2, slack = 0): boolean {
  return p.x >= bbox.minX - slack && p.x <= bbox.maxX + slack
    && p.y >= bbox.minY - slack && p.y <= bbox.maxY + slack;
}

export interface VoronoiSourceEdge {
  id: number;
  contourIndex: number;
  edgeIndex: number;
  isHole: boolean;
  a: THREE.Vector2;
  b: THREE.Vector2;
}

export interface VoronoiVertex {
  id: number;
  point: THREE.Vector2;
  radius: number;
  sourceEdgeIds: number[];
}

export interface VoronoiEdge {
  id: number;
  from: number;
  to: number;
  sourceEdgeIds: [number, number];
  points: THREE.Vector2[];
}

export interface VoronoiGraph {
  sourceEdges: VoronoiSourceEdge[];
  vertices: VoronoiVertex[];
  edges: VoronoiEdge[];
}

interface LineSite extends VoronoiSourceEdge {
  nx: number;
  ny: number;
  c: number;
}

function cleanContour(contour: THREE.Vector2[]): THREE.Vector2[] {
  if (contour.length <= 1) return contour.map((p) => p.clone());

  const cleaned: THREE.Vector2[] = [];
  for (const point of contour) {
    const prev = cleaned[cleaned.length - 1];
    if (!prev || prev.distanceToSquared(point) > EPS * EPS) {
      cleaned.push(point.clone());
    }
  }

  if (cleaned.length > 1 && cleaned[0].distanceToSquared(cleaned[cleaned.length - 1]) <= EPS * EPS) {
    cleaned.pop();
  }

  return cleaned;
}

function normalizeOuter(contour: THREE.Vector2[]): THREE.Vector2[] {
  const cleaned = cleanContour(contour);
  return signedArea(cleaned) < 0 ? cleaned.reverse() : cleaned;
}

function normalizeHole(contour: THREE.Vector2[]): THREE.Vector2[] {
  const cleaned = cleanContour(contour);
  return signedArea(cleaned) > 0 ? cleaned.reverse() : cleaned;
}

function buildSourceEdges(outerContour: THREE.Vector2[], holeContours: THREE.Vector2[][]): LineSite[] {
  const contours = [normalizeOuter(outerContour), ...holeContours.map(normalizeHole)];
  const result: LineSite[] = [];

  for (let contourIndex = 0; contourIndex < contours.length; contourIndex++) {
    const contour = contours[contourIndex];
    if (contour.length < 2) continue;

    for (let edgeIndex = 0; edgeIndex < contour.length; edgeIndex++) {
      const a = contour[edgeIndex];
      const b = contour[(edgeIndex + 1) % contour.length];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len <= EPS) continue;

      const nx = dy / len;
      const ny = -dx / len;
      result.push({
        id: result.length,
        contourIndex,
        edgeIndex,
        isHole: contourIndex > 0,
        a,
        b,
        nx,
        ny,
        c: nx * a.x + ny * a.y,
      });
    }
  }

  return result;
}

function pointInMaterial(
  point: THREE.Vector2,
  outer: THREE.Vector2[],
  holes: THREE.Vector2[][],
  outerBBox: BBox,
  holeBBoxes: BBox[],
): boolean {
  // Bbox short-circuit: if outside the outer's bbox, we're outside material.
  if (!bboxContains(outerBBox, point, MERGE_EPS)) return false;
  if (!pointInContour(point, outer) && distanceToContour(point, outer) > MERGE_EPS) return false;
  for (let i = 0; i < holes.length; i++) {
    const hole = holes[i];
    if (hole.length < 3) continue;
    // Bbox short-circuit per hole — if outside the hole's bbox, this hole
    // can't be the reason we fail.
    if (!bboxContains(holeBBoxes[i], point, MERGE_EPS)) continue;
    if (pointInContour(point, hole) && distanceToContour(point, hole) > MERGE_EPS) {
      return false;
    }
  }
  return true;
}

function distanceToContour(point: THREE.Vector2, contour: THREE.Vector2[]): number {
  let best = Infinity;
  for (let i = 0; i < contour.length; i++) {
    best = Math.min(best, distancePointToSegment(point, contour[i], contour[(i + 1) % contour.length]));
  }
  return best;
}

function distancePointToSegment(point: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= EPS * EPS) return point.distanceTo(a);

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2));
  const x = a.x + t * dx;
  const y = a.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function solveLineBisectors(a: LineSite, b: LineSite, c: LineSite, signB: -1 | 1, signC: -1 | 1): THREE.Vector2 | null {
  const a1 = a.nx - signB * b.nx;
  const b1 = a.ny - signB * b.ny;
  const c1 = a.c - signB * b.c;

  const a2 = a.nx - signC * c.nx;
  const b2 = a.ny - signC * c.ny;
  const c2 = a.c - signC * c.c;

  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) <= EPS) return null;

  return new THREE.Vector2(
    (c1 * b2 - c2 * b1) / det,
    (a1 * c2 - a2 * c1) / det,
  );
}

function closestSourceEdges(point: THREE.Vector2, sites: LineSite[]): { radius: number; sourceEdgeIds: number[] } {
  const distances = sites.map((site) => distancePointToSegment(point, site.a, site.b));
  const radius = Math.min(...distances);
  const tolerance = Math.max(MERGE_EPS, radius * 1e-5);
  const sourceEdgeIds = distances
    .map((distance, index) => Math.abs(distance - radius) <= tolerance ? sites[index].id : -1)
    .filter((id) => id >= 0);

  return { radius, sourceEdgeIds };
}

// ============================================================================
// SPATIAL INDEX
// ============================================================================
// Uniform grid over edge bounding boxes. Built once per `buildEdgeVoronoi`
// call and reused for both KNN neighborhood construction and per-candidate
// distance queries. Cell size is the average edge length × 1.5 — small
// enough that typical queries hit only a handful of cells, large enough
// that long edges don't spam dozens of bins.

interface EdgeGrid {
  cellSize: number;
  cols: number;
  rows: number;
  originX: number;
  originY: number;
  cells: Array<number[] | undefined>;
  /** Maximum cell-distance from origin — used as the "give up and fall
   *  back to linear scan" bound for radial queries. */
  maxRadius: number;
}

function buildEdgeGrid(sites: LineSite[]): EdgeGrid {
  let totalLen = 0;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const site of sites) {
    totalLen += Math.hypot(site.b.x - site.a.x, site.b.y - site.a.y);
    if (site.a.x < minX) minX = site.a.x; if (site.a.x > maxX) maxX = site.a.x;
    if (site.b.x < minX) minX = site.b.x; if (site.b.x > maxX) maxX = site.b.x;
    if (site.a.y < minY) minY = site.a.y; if (site.a.y > maxY) maxY = site.a.y;
    if (site.b.y < minY) minY = site.b.y; if (site.b.y > maxY) maxY = site.b.y;
  }
  const avgLen = sites.length > 0 ? totalLen / sites.length : 1;
  const cellSize = Math.max(0.05, avgLen * 1.5);

  // 1-cell margin on each side so radial queries can expand without clamping.
  const marginX = cellSize, marginY = cellSize;
  const originX = minX - marginX;
  const originY = minY - marginY;
  const cols = Math.max(1, Math.ceil((maxX - minX + 2 * marginX) / cellSize));
  const rows = Math.max(1, Math.ceil((maxY - minY + 2 * marginY) / cellSize));
  const cells: Array<number[] | undefined> = new Array(cols * rows);

  for (const site of sites) {
    const eMinX = Math.min(site.a.x, site.b.x);
    const eMaxX = Math.max(site.a.x, site.b.x);
    const eMinY = Math.min(site.a.y, site.b.y);
    const eMaxY = Math.max(site.a.y, site.b.y);
    const cx0 = Math.max(0, Math.floor((eMinX - originX) / cellSize));
    const cx1 = Math.min(cols - 1, Math.floor((eMaxX - originX) / cellSize));
    const cy0 = Math.max(0, Math.floor((eMinY - originY) / cellSize));
    const cy1 = Math.min(rows - 1, Math.floor((eMaxY - originY) / cellSize));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const idx = cy * cols + cx;
        let bin = cells[idx];
        if (!bin) { bin = []; cells[idx] = bin; }
        bin.push(site.id);
      }
    }
  }

  return { cellSize, cols, rows, originX, originY, cells, maxRadius: Math.max(cols, rows) * cellSize };
}

/** Append edge ids whose home cells fall within `radius` of `point` to `out`.
 *  Edges with bbox completely outside the queried window are skipped. */
function queryEdgesNear(grid: EdgeGrid, point: THREE.Vector2, radius: number, out: Set<number>): void {
  const cx0 = Math.max(0, Math.floor((point.x - radius - grid.originX) / grid.cellSize));
  const cx1 = Math.min(grid.cols - 1, Math.floor((point.x + radius - grid.originX) / grid.cellSize));
  const cy0 = Math.max(0, Math.floor((point.y - radius - grid.originY) / grid.cellSize));
  const cy1 = Math.min(grid.rows - 1, Math.floor((point.y + radius - grid.originY) / grid.cellSize));
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const bin = grid.cells[cy * grid.cols + cx];
      if (bin) for (let i = 0; i < bin.length; i++) out.add(bin[i]);
    }
  }
}

/** For each site, return the indices of its K nearest other sites by
 *  midpoint distance. Used to restrict the triple-enumeration outer loop
 *  in `buildVertices` to spatially-local candidates. */
function buildEdgeNeighborhoods(sites: LineSite[], grid: EdgeGrid, k: number): number[][] {
  const midX = new Float64Array(sites.length);
  const midY = new Float64Array(sites.length);
  for (let i = 0; i < sites.length; i++) {
    midX[i] = (sites[i].a.x + sites[i].b.x) / 2;
    midY[i] = (sites[i].a.y + sites[i].b.y) / 2;
  }

  const out: number[][] = new Array(sites.length);
  const scratch = new Set<number>();
  const probe = new THREE.Vector2();

  for (let i = 0; i < sites.length; i++) {
    probe.set(midX[i], midY[i]);
    let radius = grid.cellSize * 2;
    scratch.clear();
    queryEdgesNear(grid, probe, radius, scratch);
    while (scratch.size < k + 1 && radius < grid.maxRadius) {
      radius *= 2;
      scratch.clear();
      queryEdgesNear(grid, probe, radius, scratch);
    }
    if (scratch.size < k + 1) {
      // Polygon smaller than K — every other edge is a neighbor.
      const all: number[] = [];
      for (let j = 0; j < sites.length; j++) if (j !== i) all.push(j);
      out[i] = all;
      continue;
    }

    // Sort candidates by squared midpoint distance, drop self, take top K.
    const candidates: Array<{ id: number; d: number }> = [];
    for (const id of scratch) {
      if (id === i) continue;
      const dx = midX[id] - midX[i];
      const dy = midY[id] - midY[i];
      candidates.push({ id, d: dx * dx + dy * dy });
    }
    candidates.sort((a, b) => a.d - b.d);
    out[i] = candidates.slice(0, k).map((c) => c.id);
  }

  return out;
}

/** Grid-aware version of `closestSourceEdges`. Expands a radial query
 *  until ≥3 candidates are found, computes the local minimum, then re-
 *  queries with `min + cellSize` to ensure no edge just past the original
 *  window is closer. Falls back to the linear scan when the grid is
 *  pathologically sparse (degenerate polygons), so we never return wrong
 *  results — only faster ones. */
function closestSourceEdgesGrid(point: THREE.Vector2, sites: LineSite[], grid: EdgeGrid, scratch: Set<number>): { radius: number; sourceEdgeIds: number[] } {
  scratch.clear();
  let queryRadius = grid.cellSize * 3;
  queryEdgesNear(grid, point, queryRadius, scratch);
  while (scratch.size < 3 && queryRadius < grid.maxRadius) {
    queryRadius *= 2;
    scratch.clear();
    queryEdgesNear(grid, point, queryRadius, scratch);
  }
  if (scratch.size < 3) return closestSourceEdges(point, sites);

  let bestRadius = Infinity;
  for (const id of scratch) {
    const s = sites[id];
    const d = distancePointToSegment(point, s.a, s.b);
    if (d < bestRadius) bestRadius = d;
  }

  // Re-query if the nearest edge is close to the query boundary — a
  // closer edge could be sitting just outside our original window.
  if (bestRadius + grid.cellSize > queryRadius) {
    scratch.clear();
    queryEdgesNear(grid, point, bestRadius + grid.cellSize, scratch);
    for (const id of scratch) {
      const s = sites[id];
      const d = distancePointToSegment(point, s.a, s.b);
      if (d < bestRadius) bestRadius = d;
    }
  }

  const tolerance = Math.max(MERGE_EPS, bestRadius * 1e-5);
  const sourceEdgeIds: number[] = [];
  for (const id of scratch) {
    const s = sites[id];
    const d = distancePointToSegment(point, s.a, s.b);
    if (Math.abs(d - bestRadius) <= tolerance) sourceEdgeIds.push(id);
  }
  return { radius: bestRadius, sourceEdgeIds };
}

/** Reusable scratch space passed through the hot point-in-material path,
 *  built once per `buildVertices` invocation. Avoids ~1M `new Set()`
 *  allocations per layer in the typical case (200K candidates ×
 *  1 outer + 2-3 holes per `pointInMaterialGrid`). */
interface PointInMaterialScratch {
  /** Visited-edge bitset for `pointInContourGrid`, indexed by site id.
   *  We use a `Uint32Array` with a generation counter rather than a
   *  `Set<number>` so reset is O(1) — bumping `generation`. */
  visited: Uint32Array;
  generation: number;
  /** Generic scratch for `queryEdgesNear` results. */
  near: Set<number>;
}

function makePointInMaterialScratch(siteCount: number): PointInMaterialScratch {
  return {
    visited: new Uint32Array(siteCount),
    generation: 0,
    near: new Set(),
  };
}

/** Grid-aware point-in-contour ray cast. Casts a +x ray from `point` and
 *  counts crossings of contour edges (filtered by `contourIndex`). Only
 *  visits grid cells along the ray rather than scanning every contour
 *  edge — drops this from O(N) to O(cellsAlongRay · cellDensity). */
function pointInContourGrid(
  point: THREE.Vector2,
  sites: LineSite[],
  grid: EdgeGrid,
  contourIndex: number,
  scratch: PointInMaterialScratch,
): boolean {
  const cy = Math.max(0, Math.min(grid.rows - 1, Math.floor((point.y - grid.originY) / grid.cellSize)));
  const cx0 = Math.max(0, Math.floor((point.x - grid.originX) / grid.cellSize));
  // Bump generation to mark all visited entries from prior calls as stale
  // — pure O(1) reset, no zeroing needed. When `generation` overflows
  // back to 0 (after 2^32 calls — never in practice) we'd need to zero
  // the array; not worth the guard.
  scratch.generation++;
  const gen = scratch.generation;
  const visited = scratch.visited;
  let crossings = 0;
  for (let cx = cx0; cx < grid.cols; cx++) {
    const bin = grid.cells[cy * grid.cols + cx];
    if (!bin) continue;
    for (let i = 0; i < bin.length; i++) {
      const id = bin[i];
      if (visited[id] === gen) continue;
      visited[id] = gen;
      const s = sites[id];
      if (s.contourIndex !== contourIndex) continue;
      const ay = s.a.y;
      const by = s.b.y;
      // Standard "upward-edge" rule — endpoints exactly on the ray
      // count consistently and avoid double-counting at shared vertices.
      if ((ay > point.y) === (by > point.y)) continue;
      const t = (point.y - ay) / (by - ay);
      const xCross = s.a.x + t * (s.b.x - s.a.x);
      if (xCross > point.x) crossings++;
    }
  }
  return (crossings & 1) === 1;
}

/** Grid-aware version of `distanceToContour` for the boundary-tolerance
 *  check inside `pointInMaterialGrid`. We don't need the exact distance —
 *  only whether the point sits within `MERGE_EPS` of any contour edge. */
function pointWithinContourTolerance(
  point: THREE.Vector2,
  sites: LineSite[],
  grid: EdgeGrid,
  contourIndex: number,
  tolerance: number,
  scratch: PointInMaterialScratch,
): boolean {
  scratch.near.clear();
  queryEdgesNear(grid, point, Math.max(tolerance, grid.cellSize), scratch.near);
  for (const id of scratch.near) {
    const s = sites[id];
    if (s.contourIndex !== contourIndex) continue;
    if (distancePointToSegment(point, s.a, s.b) <= tolerance) return true;
  }
  return false;
}

/** Grid-accelerated replacement for `pointInMaterial`. Same semantics:
 *  the point is in material iff it's inside the outer contour AND not
 *  strictly inside any hole, with `MERGE_EPS` boundary slack on both. */
function pointInMaterialGrid(
  point: THREE.Vector2,
  sites: LineSite[],
  grid: EdgeGrid,
  outerBBox: BBox,
  holeBBoxes: BBox[],
  scratch: PointInMaterialScratch,
): boolean {
  if (!bboxContains(outerBBox, point, MERGE_EPS)) return false;
  if (!pointInContourGrid(point, sites, grid, 0, scratch)) {
    if (!pointWithinContourTolerance(point, sites, grid, 0, MERGE_EPS, scratch)) return false;
  }
  for (let i = 0; i < holeBBoxes.length; i++) {
    if (!bboxContains(holeBBoxes[i], point, MERGE_EPS)) continue;
    if (pointInContourGrid(point, sites, grid, i + 1, scratch)) {
      if (!pointWithinContourTolerance(point, sites, grid, i + 1, MERGE_EPS, scratch)) return false;
    }
  }
  return true;
}

/** In-progress vertex used during build — keeps `sourceEdgeIds` as a Set
 *  so each merge is O(|new|) instead of the O(|existing| + |new|) array
 *  rebuild + sort the original implementation did. Finalised to a sorted
 *  array right before returning. */
interface VertexBuilder {
  id: number;
  point: THREE.Vector2;
  radius: number;
  sourceEdgeIds: Set<number>;
}

/** Pack two int32 cell coordinates into a single int32 hash key.
 *  Uses `Math.imul` so the multiplication stays inside the int32
 *  range — naive `*` overflows JS's safe-integer band and corrupts
 *  the hash for realistic millimetre coordinates (cellX ≈ 3e6 at x=30
 *  with `MERGE_EPS = 1e-5`, so `cellX * 73856093 ≈ 2.2e14`, well past
 *  `2⁵³`). The `| 0` clamps to int32 so `Map` keying is reliable. */
function spatialHashKey(cellX: number, cellY: number): number {
  return (Math.imul(cellX, 73856093) ^ Math.imul(cellY, 19349663)) | 0;
}

function mergeVertex(
  vertexIndex: Map<number, number[]>,
  vertices: VertexBuilder[],
  point: THREE.Vector2,
  radius: number,
  sourceEdgeIds: number[],
): void {
  // Spatial-hash dedup keyed by `MERGE_EPS`-quantised coordinates. We
  // must check a 3×3 neighborhood of cells, not just the home cell —
  // two points within `MERGE_EPS` of each other can fall on opposite
  // sides of a quantization boundary (e.g. `x=1.5e-5 ± 1e-15` rounds
  // to two adjacent cells), and we still need to merge them.
  //
  // `Map<number, number[]>` value is the list of vertex IDs sharing
  // this hash bucket — collisions are rare but possible, and the
  // earlier `Map<number, number>` lost the first vertex on collision.
  const cellX = Math.round(point.x / MERGE_EPS);
  const cellY = Math.round(point.y / MERGE_EPS);

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const bucket = vertexIndex.get(spatialHashKey(cellX + dx, cellY + dy));
      if (!bucket) continue;
      for (const candidateId of bucket) {
        const existing = vertices[candidateId];
        if (existing.point.distanceToSquared(point) <= MERGE_EPS * MERGE_EPS) {
          if (radius > existing.radius) existing.radius = radius;
          for (const id of sourceEdgeIds) existing.sourceEdgeIds.add(id);
          return;
        }
      }
    }
  }

  const builder: VertexBuilder = {
    id: vertices.length,
    point,
    radius,
    sourceEdgeIds: new Set(sourceEdgeIds),
  };
  vertices.push(builder);
  const homeKey = spatialHashKey(cellX, cellY);
  let bucket = vertexIndex.get(homeKey);
  if (!bucket) { bucket = []; vertexIndex.set(homeKey, bucket); }
  bucket.push(builder.id);
}

function finaliseVertices(builders: VertexBuilder[]): VoronoiVertex[] {
  return builders.map((b) => ({
    id: b.id,
    point: b.point,
    radius: b.radius,
    sourceEdgeIds: Array.from(b.sourceEdgeIds).sort((a, b) => a - b),
  }));
}

function buildVertices(sites: LineSite[], outer: THREE.Vector2[], holes: THREE.Vector2[][]): VoronoiVertex[] {
  if (sites.length < 3) return [];

  const builders: VertexBuilder[] = [];
  const vertexIndex = new Map<number, number[]>();
  const outerBBox = computeBBox(outer);
  const holeBBoxes = holes.map(computeBBox);
  const grid = buildEdgeGrid(sites);
  const k = Math.min(NEIGHBORHOOD_K, sites.length - 1);
  const neighborhoods = buildEdgeNeighborhoods(sites, grid, k);
  const scratch = new Set<number>();
  const pimScratch = makePointInMaterialScratch(sites.length);

  // Restrict triple enumeration to (i, j, k) where j and k are both in
  // i's KNN neighborhood AND k is in j's KNN neighborhood. This drops
  // the outer loop from O(N³) to O(N · K²). Voronoi vertices are by
  // definition equidistant from 3+ edges within their empty-circle
  // radius, so spatially distant triples never produce a real vertex —
  // pruning them is safe given a sufficiently large K.
  for (let i = 0; i < sites.length; i++) {
    const nbi = neighborhoods[i];
    const nbiSet = new Set<number>(nbi);
    for (let pj = 0; pj < nbi.length; pj++) {
      const j = nbi[pj];
      if (j <= i) continue;
      const nbj = neighborhoods[j];
      for (let pk = 0; pk < nbj.length; pk++) {
        const kk = nbj[pk];
        if (kk <= j) continue;
        if (!nbiSet.has(kk)) continue;

        for (const signJ of [-1, 1] as const) {
          for (const signK of [-1, 1] as const) {
            const point = solveLineBisectors(sites[i], sites[j], sites[kk], signJ, signK);
            if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue;
            if (!pointInMaterialGrid(point, sites, grid, outerBBox, holeBBoxes, pimScratch)) continue;

            const { radius, sourceEdgeIds } = closestSourceEdgesGrid(point, sites, grid, scratch);
            if (radius <= MERGE_EPS || sourceEdgeIds.length < 3) continue;

            mergeVertex(vertexIndex, builders, point, radius, sourceEdgeIds);
          }
        }
      }
    }
  }

  return finaliseVertices(builders);
}

function sharedSourcePair(a: VoronoiVertex, b: VoronoiVertex): [number, number] | null {
  const shared = a.sourceEdgeIds.filter((id) => b.sourceEdgeIds.includes(id));
  return shared.length >= 2 ? [shared[0], shared[1]] : null;
}

function segmentInsideMaterial(
  a: THREE.Vector2,
  b: THREE.Vector2,
  outer: THREE.Vector2[],
  holes: THREE.Vector2[][],
  outerBBox: BBox,
  holeBBoxes: BBox[],
): boolean {
  const samples = 5;
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const point = new THREE.Vector2(
      a.x + (b.x - a.x) * t,
      a.y + (b.y - a.y) * t,
    );
    if (!pointInMaterial(point, outer, holes, outerBBox, holeBBoxes)) return false;
  }
  return true;
}

function buildGraphEdges(vertices: VoronoiVertex[], outer: THREE.Vector2[], holes: THREE.Vector2[][]): VoronoiEdge[] {
  const edges: VoronoiEdge[] = [];
  const outerBBox = computeBBox(outer);
  const holeBBoxes = holes.map(computeBBox);

  // Index vertices by every UNORDERED source-edge pair they touch.
  // Two Voronoi vertices form a graph edge iff they share ≥1 source-edge
  // pair, so we only test vertex pairs that co-occur in at least one
  // bucket — drops this from O(V²) to O(V · avgDegree).
  const bucketsByPair = new Map<number, number[]>();
  const pairKey = (a: number, b: number): number => {
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    return lo * 100003 + hi;
  };
  for (let vi = 0; vi < vertices.length; vi++) {
    const ids = vertices[vi].sourceEdgeIds;
    for (let a = 0; a < ids.length; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const key = pairKey(ids[a], ids[b]);
        let bucket = bucketsByPair.get(key);
        if (!bucket) { bucket = []; bucketsByPair.set(key, bucket); }
        bucket.push(vi);
      }
    }
  }

  const seenEdge = new Set<number>();
  for (const bucket of bucketsByPair.values()) {
    if (bucket.length < 2) continue;
    for (let pi = 0; pi < bucket.length; pi++) {
      for (let pj = pi + 1; pj < bucket.length; pj++) {
        const vi = bucket[pi];
        const vj = bucket[pj];
        const lo = vi < vj ? vi : vj;
        const hi = vi < vj ? vj : vi;
        const dedupKey = lo * 100003 + hi;
        if (seenEdge.has(dedupKey)) continue;
        seenEdge.add(dedupKey);

        const sourceEdgeIds = sharedSourcePair(vertices[lo], vertices[hi]);
        if (!sourceEdgeIds) continue;
        if (!segmentInsideMaterial(vertices[lo].point, vertices[hi].point, outer, holes, outerBBox, holeBBoxes)) continue;

        edges.push({
          id: edges.length,
          from: vertices[lo].id,
          to: vertices[hi].id,
          sourceEdgeIds,
          points: [vertices[lo].point.clone(), vertices[hi].point.clone()],
        });
      }
    }
  }

  return edges;
}

/**
 * Build the finite interior Voronoi graph for polygon boundary edges.
 *
 * Cura's `SkeletalTrapezoidation::constructFromPolygons` gives Boost only
 * segment sites, then transfers the finite Voronoi cells into its Arachne
 * half-edge graph. This TypeScript slice follows that edge-site contract:
 * vertices are maximal empty-circle centers touching 3+ polygon edges, and
 * graph edges connect vertices that remain on the same two-edge bisector.
 */
export function buildEdgeVoronoi(
  outerContour: THREE.Vector2[],
  holeContours: THREE.Vector2[][] = [],
): VoronoiGraph {
  const outer = normalizeOuter(outerContour);
  const holes = holeContours.map(normalizeHole).filter((hole) => hole.length >= 3);
  const sourceEdges = buildSourceEdges(outer, holes);

  const vertices = buildVertices(sourceEdges, outer, holes);
  const edges = buildGraphEdges(vertices, outer, holes);

  return {
    sourceEdges: sourceEdges.map(({ nx: _nx, ny: _ny, c: _c, ...edge }) => edge),
    vertices,
    edges,
  };
}
