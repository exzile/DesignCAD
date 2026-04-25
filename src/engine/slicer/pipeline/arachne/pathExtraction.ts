import * as THREE from 'three';

import type { Bead, BeadGraph, BeadTrapezoid } from './beadStrategy';
import type { VariableWidthPath } from './types';
import type { VoronoiSourceEdge } from './voronoi';

type SourceEdgeMap = Map<number, VoronoiSourceEdge>;

const EPS = 1e-7;
const CONNECT_EPS = 1e-4;

interface PathFragment {
  points: THREE.Vector2[];
  widths: number[];
  depth: number;
  source: VariableWidthPath['source'];
}

function beadPoint(trapezoid: BeadTrapezoid, bead: Bead, sampleIndex: number): THREE.Vector2 {
  const sample = trapezoid.samples[sampleIndex];
  if (!sample || sample.width <= EPS) {
    return trapezoid.centerline[Math.min(sampleIndex, trapezoid.centerline.length - 1)]?.clone() ?? new THREE.Vector2();
  }

  const location = bead.sampleLocations[sampleIndex] ?? bead.location;
  const t = Math.max(0, Math.min(1, location / sample.width));
  return new THREE.Vector2(
    sample.sourceA.x + (sample.sourceB.x - sample.sourceA.x) * t,
    sample.sourceA.y + (sample.sourceB.y - sample.sourceA.y) * t,
  );
}

function sourceForTrapezoid(
  graph: BeadGraph,
  trapezoid: BeadTrapezoid,
  edgeMap: SourceEdgeMap,
): VariableWidthPath['source'] {
  if (trapezoid.beadCount === 1 && trapezoid.width < graph.lineWidth * 1.5) return 'gapfill';
  // O(1) lookup per id rather than `sourceEdges.find` per id, which made
  // the previous version O(beads × sourceEdges) — same pattern I fixed
  // in trapezoidation's edgeById.
  for (const id of trapezoid.sourceEdgeIds) {
    const edge = edgeMap.get(id);
    if (edge?.isHole) return 'hole';
  }
  return 'outer';
}

function fragmentFromBead(
  graph: BeadGraph,
  trapezoid: BeadTrapezoid,
  bead: Bead,
  edgeMap: SourceEdgeMap,
): PathFragment | null {
  const sampleCount = Math.max(trapezoid.samples.length, trapezoid.centerline.length);
  if (sampleCount === 0) return null;

  const points: THREE.Vector2[] = new Array(sampleCount);
  const widths: number[] = new Array(sampleCount);
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    points[sampleIndex] = beadPoint(trapezoid, bead, sampleIndex);
    widths[sampleIndex] = bead.sampleWidths[sampleIndex] ?? bead.width;
  }

  return {
    points,
    widths,
    depth: bead.depth,
    source: sourceForTrapezoid(graph, trapezoid, edgeMap),
  };
}

function endpointDistance(a: THREE.Vector2, b: THREE.Vector2): number {
  return a.distanceTo(b);
}

function endpointKey(point: THREE.Vector2): string {
  return `${Math.round(point.x / CONNECT_EPS)},${Math.round(point.y / CONNECT_EPS)}`;
}

function branchEndpointKeys(fragments: PathFragment[]): Set<string> {
  const counts = new Map<string, number>();
  for (const fragment of fragments) {
    const start = fragment.points[0];
    const end = fragment.points[fragment.points.length - 1];
    if (start) counts.set(endpointKey(start), (counts.get(endpointKey(start)) ?? 0) + 1);
    if (end) counts.set(endpointKey(end), (counts.get(endpointKey(end)) ?? 0) + 1);
  }
  const branches = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 2) branches.add(key);
  }
  return branches;
}

function appendFragment(target: PathFragment, fragment: PathFragment): void {
  target.points.push(...fragment.points.slice(1));
  target.widths.push(...fragment.widths.slice(1));
}

function prependFragment(target: PathFragment, fragment: PathFragment): void {
  target.points.unshift(...fragment.points.slice(0, -1));
  target.widths.unshift(...fragment.widths.slice(0, -1));
}

function reverseFragment(fragment: PathFragment): PathFragment {
  return {
    ...fragment,
    points: [...fragment.points].reverse(),
    widths: [...fragment.widths].reverse(),
  };
}

function tryConnect(path: PathFragment, fragment: PathFragment, branchKeys: Set<string>): boolean {
  const pathStart = path.points[0];
  const pathEnd = path.points[path.points.length - 1];
  const fragmentStart = fragment.points[0];
  const fragmentEnd = fragment.points[fragment.points.length - 1];
  if (!pathStart || !pathEnd || !fragmentStart || !fragmentEnd) return false;

  if (endpointDistance(pathEnd, fragmentStart) <= CONNECT_EPS) {
    if (branchKeys.has(endpointKey(pathEnd))) return false;
    appendFragment(path, fragment);
    return true;
  }
  if (endpointDistance(pathEnd, fragmentEnd) <= CONNECT_EPS) {
    if (branchKeys.has(endpointKey(pathEnd))) return false;
    appendFragment(path, reverseFragment(fragment));
    return true;
  }
  if (endpointDistance(pathStart, fragmentEnd) <= CONNECT_EPS) {
    if (branchKeys.has(endpointKey(pathStart))) return false;
    prependFragment(path, fragment);
    return true;
  }
  if (endpointDistance(pathStart, fragmentStart) <= CONNECT_EPS) {
    if (branchKeys.has(endpointKey(pathStart))) return false;
    prependFragment(path, reverseFragment(fragment));
    return true;
  }

  return false;
}

function mergeFragments(fragments: PathFragment[]): PathFragment[] {
  const branchKeys = branchEndpointKeys(fragments);
  // Phase 1: greedy linear merge. For each incoming fragment, try to
  // connect to an existing path that already shares one of its endpoints
  // — drops this from O(F²) to O(F · avgBucketSize) typical.
  const paths: PathFragment[] = [];
  const buckets = new Map<number, number[]>(); // hash → pathIndex[]
  const scale = 1 / CONNECT_EPS;

  const registerEndpoints = (pathIdx: number, path: PathFragment): void => {
    const start = path.points[0];
    const end = path.points[path.points.length - 1];
    if (!start || !end) return;
    for (const pt of [start, end]) {
      const cx = Math.round(pt.x * scale) | 0;
      const cy = Math.round(pt.y * scale) | 0;
      const key = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) | 0;
      let bucket = buckets.get(key);
      if (!bucket) { bucket = []; buckets.set(key, bucket); }
      if (!bucket.includes(pathIdx)) bucket.push(pathIdx);
    }
  };

  const candidatePathsAt = (pt: THREE.Vector2): number[] => {
    const cx = Math.round(pt.x * scale) | 0;
    const cy = Math.round(pt.y * scale) | 0;
    const out: number[] = [];
    const seen = new Set<number>();
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const key = (Math.imul(cx + dx, 73856093) ^ Math.imul(cy + dy, 19349663)) | 0;
        const bucket = buckets.get(key);
        if (!bucket) continue;
        for (const idx of bucket) {
          if (!seen.has(idx)) { seen.add(idx); out.push(idx); }
        }
      }
    }
    return out;
  };

  for (const fragment of fragments) {
    if (fragment.points.length < 1) continue;
    const fragStart = fragment.points[0];
    const fragEnd = fragment.points[fragment.points.length - 1];

    let merged = false;
    const candidates = new Set<number>();
    for (const idx of candidatePathsAt(fragStart)) candidates.add(idx);
    for (const idx of candidatePathsAt(fragEnd)) candidates.add(idx);

    for (const idx of candidates) {
      const path = paths[idx];
      if (path.depth !== fragment.depth || path.source !== fragment.source) continue;
      if (tryConnect(path, fragment, branchKeys)) {
        merged = true;
        // Path endpoints changed — re-register. Stale entries in the
        // index are filtered out by the depth/source check above plus
        // the `tryConnect` distance check, so we don't need to remove.
        registerEndpoints(idx, path);
        break;
      }
    }

    if (!merged) {
      const fresh: PathFragment = {
        ...fragment,
        points: [...fragment.points],
        widths: [...fragment.widths],
      };
      paths.push(fresh);
      registerEndpoints(paths.length - 1, fresh);
    }
  }

  // Phase 2: pair-merge any remaining open ends. Bounded to
  // `paths.length` iterations so worst-case is O(F²) once, not the
  // O(F³) the previous `while (changed) { ... splice ... }` could hit.
  let changed = true;
  let iterations = 0;
  while (changed && iterations < paths.length) {
    changed = false;
    iterations++;
    for (let i = 0; i < paths.length && !changed; i++) {
      const a = paths[i];
      if (a.points.length === 0) continue;
      const candidates = new Set<number>();
      for (const idx of candidatePathsAt(a.points[0])) {
        if (idx > i) candidates.add(idx);
      }
      for (const idx of candidatePathsAt(a.points[a.points.length - 1])) {
        if (idx > i) candidates.add(idx);
      }
      for (const j of candidates) {
        const b = paths[j];
        if (a.depth !== b.depth || a.source !== b.source) continue;
        if (b.points.length === 0) continue;
        if (tryConnect(a, b, branchKeys)) {
          // Drop b without splicing — splice is O(F) and shifts indices.
          // We mark b empty and let the filter at the end remove it.
          b.points = [];
          b.widths = [];
          registerEndpoints(i, a);
          changed = true;
          break;
        }
      }
    }
  }

  return paths.filter((p) => p.points.length > 0);
}

function closePath(path: PathFragment): VariableWidthPath {
  const first = path.points[0];
  const last = path.points[path.points.length - 1];
  const isClosed = !!first && !!last && path.points.length > 2 && first.distanceTo(last) <= CONNECT_EPS;

  const points = isClosed ? path.points.slice(0, -1) : path.points;
  const widths = isClosed ? path.widths.slice(0, -1) : path.widths;
  return {
    points,
    widths,
    depth: path.depth,
    isClosed,
    source: path.source,
  };
}

/**
 * Walk a `BeadGraph` and extract continuous variable-width wall paths.
 *
 * This is the TypeScript equivalent of the early path-walk part of Cura's
 * `generateToolpaths`: bead centers are placed between each trapezoid's two
 * source edges, fragments with matching depth/source are connected by shared
 * endpoints, and each output path keeps per-vertex line width.
 */
export function extractBeadPaths(beadGraph: BeadGraph): VariableWidthPath[] {
  const fragments: PathFragment[] = [];
  const edgeMap: SourceEdgeMap = new Map();
  for (const edge of beadGraph.sourceEdges) edgeMap.set(edge.id, edge);

  for (const trapezoid of beadGraph.trapezoids) {
    for (const bead of trapezoid.beads) {
      const fragment = fragmentFromBead(beadGraph, trapezoid, bead, edgeMap);
      if (fragment && fragment.points.length > 0) fragments.push(fragment);
    }
  }

  return mergeFragments(fragments)
    .map(closePath)
    .filter((path) => path.points.length >= (path.isClosed ? 3 : 1) && path.widths.length === path.points.length);
}
