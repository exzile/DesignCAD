import * as THREE from 'three';

import type { VoronoiGraph, VoronoiSourceEdge, VoronoiVertex } from './voronoi';

const EPS = 1e-7;

export interface ArachnePolygon {
  outerContour: THREE.Vector2[];
  holeContours?: THREE.Vector2[][];
}

export interface TrapezoidNode {
  id: number;
  point: THREE.Vector2;
  width: number;
}

export interface TrapezoidSample {
  center: THREE.Vector2;
  sourceA: THREE.Vector2;
  sourceB: THREE.Vector2;
  width: number;
}

export interface SkeletalTrapezoid {
  id: number;
  voronoiVertexIds: number[];
  sourceEdgeIds: [number, number];
  centerline: THREE.Vector2[];
  samples: TrapezoidSample[];
  width: number;
  minWidth: number;
  maxWidth: number;
}

export interface TrapezoidGraph {
  sourceEdges: VoronoiSourceEdge[];
  nodes: TrapezoidNode[];
  trapezoids: SkeletalTrapezoid[];
  polygon: ArachnePolygon;
}

function normalizePolygon(polygon: ArachnePolygon | THREE.Vector2[]): ArachnePolygon {
  if (Array.isArray(polygon)) {
    return { outerContour: polygon, holeContours: [] };
  }
  return {
    outerContour: polygon.outerContour,
    holeContours: polygon.holeContours ?? [],
  };
}

function closestPointOnSegment(point: THREE.Vector2, a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 <= EPS * EPS) return a.clone();

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2));
  return new THREE.Vector2(a.x + dx * t, a.y + dy * t);
}

function edgeDirection(edge: VoronoiSourceEdge): THREE.Vector2 {
  const direction = new THREE.Vector2(edge.b.x - edge.a.x, edge.b.y - edge.a.y);
  return direction.lengthSq() <= EPS * EPS ? new THREE.Vector2(1, 0) : direction.normalize();
}

function areParallel(a: VoronoiSourceEdge, b: VoronoiSourceEdge): boolean {
  const da = edgeDirection(a);
  const db = edgeDirection(b);
  return Math.abs(da.x * db.y - da.y * db.x) <= 1e-4;
}

/** O(1) source-edge lookup. Built once at the top of
 *  `buildSkeletalTrapezoidation` and threaded through helpers — `edgeById`
 *  used to do a linear `find` inside hot inner loops, so trapezoidation
 *  was effectively O(N²) on dense Voronoi graphs. */
type EdgeMap = Map<number, VoronoiSourceEdge>;

function buildEdgeMap(graph: VoronoiGraph): EdgeMap {
  const map: EdgeMap = new Map();
  for (const edge of graph.sourceEdges) map.set(edge.id, edge);
  return map;
}

function edgeById(edgeMap: EdgeMap, id: number): VoronoiSourceEdge {
  const edge = edgeMap.get(id);
  if (!edge) throw new Error(`Arachne trapezoidation: missing source edge ${id}`);
  return edge;
}

function sampleWidth(point: THREE.Vector2, edgeA: VoronoiSourceEdge, edgeB: VoronoiSourceEdge): TrapezoidSample {
  const sourceA = closestPointOnSegment(point, edgeA.a, edgeA.b);
  const sourceB = closestPointOnSegment(point, edgeB.a, edgeB.b);
  return {
    center: point.clone(),
    sourceA,
    sourceB,
    width: sourceA.distanceTo(sourceB),
  };
}

function pairScore(point: THREE.Vector2, edgeMap: EdgeMap, pair: [number, number]): number {
  const edgeA = edgeById(edgeMap, pair[0]);
  const edgeB = edgeById(edgeMap, pair[1]);
  const sample = sampleWidth(point, edgeA, edgeB);
  return sample.width;
}

function sourcePairs(sourceEdgeIds: number[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let i = 0; i < sourceEdgeIds.length; i++) {
    for (let j = i + 1; j < sourceEdgeIds.length; j++) {
      pairs.push([sourceEdgeIds[i], sourceEdgeIds[j]]);
    }
  }
  return pairs;
}

function chooseSourcePair(vertex: VoronoiVertex, edgeMap: EdgeMap): [number, number] | null {
  const pairs = sourcePairs(vertex.sourceEdgeIds);
  if (pairs.length === 0) return null;

  const parallelPairs = pairs.filter(([a, b]) => areParallel(edgeById(edgeMap, a), edgeById(edgeMap, b)));
  const candidates = parallelPairs.length > 0 ? parallelPairs : pairs;
  // Score each candidate ONCE rather than twice per `reduce` step (which
  // is what `f(pair) < f(best)` did, making this O(2N) instead of O(N)).
  let bestPair = candidates[0];
  let bestScore = pairScore(vertex.point, edgeMap, bestPair);
  for (let i = 1; i < candidates.length; i++) {
    const score = pairScore(vertex.point, edgeMap, candidates[i]);
    if (score < bestScore) { bestPair = candidates[i]; bestScore = score; }
  }
  return bestPair;
}

function buildTrapezoid(
  id: number,
  edgeMap: EdgeMap,
  sourceEdgeIds: [number, number],
  vertexIds: number[],
  centerline: THREE.Vector2[],
): SkeletalTrapezoid {
  const edgeA = edgeById(edgeMap, sourceEdgeIds[0]);
  const edgeB = edgeById(edgeMap, sourceEdgeIds[1]);
  const samples = centerline.map((point) => sampleWidth(point, edgeA, edgeB));
  const widths = samples.map((sample) => sample.width);
  const minWidth = Math.min(...widths);
  const maxWidth = Math.max(...widths);

  return {
    id,
    voronoiVertexIds: vertexIds,
    sourceEdgeIds,
    centerline: centerline.map((point) => point.clone()),
    samples,
    width: widths.reduce((sum, width) => sum + width, 0) / widths.length,
    minWidth,
    maxWidth,
  };
}

function projectedRange(edge: VoronoiSourceEdge, direction: THREE.Vector2): [number, number] {
  const ta = edge.a.dot(direction);
  const tb = edge.b.dot(direction);
  return ta < tb ? [ta, tb] : [tb, ta];
}

function pointAtProjection(edge: VoronoiSourceEdge, direction: THREE.Vector2, projection: number): THREE.Vector2 {
  const startProjection = edge.a.dot(direction);
  const edgeVector = new THREE.Vector2(edge.b.x - edge.a.x, edge.b.y - edge.a.y);
  const length = edgeVector.length();
  if (length <= EPS) return edge.a.clone();

  const signedDistance = projection - startProjection;
  const t = Math.max(0, Math.min(1, signedDistance / length));
  return new THREE.Vector2(
    edge.a.x + edgeVector.x * t,
    edge.a.y + edgeVector.y * t,
  );
}

function boundaryGapCenterline(edgeA: VoronoiSourceEdge, edgeB: VoronoiSourceEdge): THREE.Vector2[] | null {
  if (!areParallel(edgeA, edgeB)) return null;

  const direction = edgeDirection(edgeA);
  const [a0, a1] = projectedRange(edgeA, direction);
  const [b0, b1] = projectedRange(edgeB, direction);
  const overlapMin = Math.max(a0, b0);
  const overlapMax = Math.min(a1, b1);
  if (overlapMax - overlapMin <= EPS) return null;

  const midProjection = (overlapMin + overlapMax) / 2;
  const sourceA = pointAtProjection(edgeA, direction, midProjection);
  const sourceB = pointAtProjection(edgeB, direction, midProjection);
  if (sourceA.distanceToSquared(sourceB) <= EPS * EPS) return null;

  return [new THREE.Vector2(
    (sourceA.x + sourceB.x) / 2,
    (sourceA.y + sourceB.y) / 2,
  )];
}

function buildBoundaryGapFallbacks(
  edgeMap: EdgeMap,
  sourceEdges: VoronoiSourceEdge[],
  startId: number,
): SkeletalTrapezoid[] {
  const result: SkeletalTrapezoid[] = [];
  const outerEdges = sourceEdges.filter((edge) => !edge.isHole);
  const holeEdges = sourceEdges.filter((edge) => edge.isHole);

  for (const holeEdge of holeEdges) {
    let best: { edge: VoronoiSourceEdge; centerline: THREE.Vector2[]; width: number } | null = null;
    for (const outerEdge of outerEdges) {
      const centerline = boundaryGapCenterline(outerEdge, holeEdge);
      if (!centerline) continue;

      const width = sampleWidth(centerline[0], outerEdge, holeEdge).width;
      if (width <= EPS) continue;
      if (!best || width < best.width) {
        best = { edge: outerEdge, centerline, width };
      }
    }

    if (!best) continue;
    result.push(buildTrapezoid(
      startId + result.length,
      edgeMap,
      [best.edge.id, holeEdge.id],
      [],
      best.centerline,
    ));
  }

  return result;
}

/**
 * Build the first Arachne skeletal-trapezoid graph from an edge Voronoi graph.
 *
 * Cura's `SkeletalTrapezoidationGraph` stores this as a half-edge structure
 * with ribs from Voronoi edges back to polygon source segments. This module
 * keeps the same information in a smaller TypeScript shape for the next
 * pipeline stages: centerline, two source polygon edges, projected source
 * samples, and local width.
 */
export function buildSkeletalTrapezoidation(
  voronoiGraph: VoronoiGraph,
  polygon: ArachnePolygon | THREE.Vector2[],
): TrapezoidGraph {
  const normalizedPolygon = normalizePolygon(polygon);
  const edgeMap = buildEdgeMap(voronoiGraph);
  const nodes: TrapezoidNode[] = voronoiGraph.vertices.map((vertex) => ({
    id: vertex.id,
    point: vertex.point.clone(),
    width: vertex.radius * 2,
  }));
  const trapezoids: SkeletalTrapezoid[] = [];
  // Track which Voronoi vertices have been consumed by an edge-based
  // trapezoid so the per-vertex fallback below is an O(1) lookup instead
  // of `trapezoids.some(...).includes(...)` which was O(trapezoids × ids).
  const coveredVertices = new Set<number>();

  for (const edge of voronoiGraph.edges) {
    const from = voronoiGraph.vertices[edge.from];
    const to = voronoiGraph.vertices[edge.to];
    if (!from || !to) continue;
    trapezoids.push(buildTrapezoid(
      trapezoids.length,
      edgeMap,
      edge.sourceEdgeIds,
      [from.id, to.id],
      edge.points.length >= 2 ? edge.points : [from.point, to.point],
    ));
    coveredVertices.add(from.id);
    coveredVertices.add(to.id);
  }

  for (const vertex of voronoiGraph.vertices) {
    if (coveredVertices.has(vertex.id)) continue;

    const pair = chooseSourcePair(vertex, edgeMap);
    if (!pair) continue;
    trapezoids.push(buildTrapezoid(
      trapezoids.length,
      edgeMap,
      pair,
      [vertex.id],
      [vertex.point],
    ));
  }

  if (trapezoids.length === 0) {
    trapezoids.push(...buildBoundaryGapFallbacks(edgeMap, voronoiGraph.sourceEdges, trapezoids.length));
  }

  return {
    sourceEdges: voronoiGraph.sourceEdges,
    nodes,
    trapezoids,
    polygon: normalizedPolygon,
  };
}
