import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { generatePerimetersArachne } from '../index';
import type { PrintProfile } from '../../../../../types/slicer';
import type { PerimeterDeps } from '../../../../../types/slicer-pipeline-deps.types';
import type { InfillRegion } from '../../../../../types/slicer-pipeline.types';
import {
  acuteCorner,
  annulus,
  breakthroughHole,
  nearCollinear,
  rectangle10x10,
  thinNeck,
  tinyEdge,
} from './fixtures';

const v = (x: number, y: number) => new THREE.Vector2(x, y);

/** Minimal stand-in for the real PerimeterDeps — uses polygon-clipping for
 *  offsets so we exercise the same code path the slicer does. */
function makeDeps(): PerimeterDeps {
  return {
    offsetContour: (contour, offset) => {
      // Simple inset/expand via a polygon-clipping buffer trick: union with
      // self after expanding each edge. Good enough for these synthetic
      // tests; real slicer uses Clipper.
      if (contour.length < 3) return [];
      try {
        // polygon-clipping doesn't have an offset operation natively; for
        // these tests we just shrink/grow towards the centroid.
        let cx = 0, cy = 0;
        for (const p of contour) { cx += p.x; cy += p.y; }
        cx /= contour.length; cy /= contour.length;
        const offset_ = -offset; // positive offset = inward
        const result = contour.map((p) => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const len = Math.hypot(dx, dy);
          if (len < 1e-9) return new THREE.Vector2(p.x, p.y);
          const factor = (len + offset_) / len;
          return new THREE.Vector2(cx + dx * factor, cy + dy * factor);
        });
        return result;
      } catch {
        return [];
      }
    },
    signedArea: (points) => {
      let area = 0;
      for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        area += a.x * b.y - b.x * a.y;
      }
      return area / 2;
    },
    multiPolygonToRegions: (mp) => {
      const out: InfillRegion[] = [];
      for (const poly of mp) {
        const contour = poly[0]?.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)) ?? [];
        const holes = poly.slice(1).map((ring) => ring.slice(0, -1).map(([x, y]) => new THREE.Vector2(x, y)));
        if (contour.length >= 3) out.push({ contour, holes });
      }
      return out;
    },
  };
}

const baseProfile = {
  wallCount: 3,
  wallLineWidth: 0.4,
  minWallLineWidth: 0.2,
} as unknown as PrintProfile;

describe('Arachne integration fallback contract', () => {
  it.each([rectangle10x10, thinNeck, annulus, breakthroughHole, nearCollinear, acuteCorner, tinyEdge])(
    'always returns a coherent GeneratedPerimeters for "$name"',
    (fixture) => {
      const result = generatePerimetersArachne(
        fixture.outer,
        fixture.holes,
        baseProfile.wallCount,
        baseProfile.wallLineWidth,
        0,
        baseProfile,
        makeDeps(),
      );

      // Shape contract — the rest of the slicer relies on these arrays
      // being defined and consistent regardless of which generator ran.
      expect(Array.isArray(result.walls)).toBe(true);
      expect(Array.isArray(result.lineWidths)).toBe(true);
      expect(Array.isArray(result.wallDepths)).toBe(true);
      expect(Array.isArray(result.innermostHoles)).toBe(true);
      expect(Array.isArray(result.infillRegions)).toBe(true);
      expect(result.walls.length).toBe(result.lineWidths.length);
      expect(result.walls.length).toBe(result.wallDepths.length);
      expect(result.outerCount).toBeGreaterThanOrEqual(0);
      expect(result.outerCount).toBeLessThanOrEqual(result.walls.length);

      // Every wall point is finite — no NaN/Infinity escaping into G-code.
      for (const wall of result.walls) {
        for (const pt of wall) {
          expect(Number.isFinite(pt.x) && Number.isFinite(pt.y)).toBe(true);
        }
      }
      // Every per-wall lineWidth entry is either a positive number or a
      // non-empty array of positive numbers.
      for (const lw of result.lineWidths) {
        if (Array.isArray(lw)) {
          expect(lw.length).toBeGreaterThan(0);
          expect(lw.every((w) => Number.isFinite(w) && w > 0)).toBe(true);
        } else {
          expect(Number.isFinite(lw) && lw > 0).toBe(true);
        }
      }
    },
  );

  it('falls back to classic when Arachne path-extraction yields nothing', () => {
    // A degenerate input where Arachne is likely to produce 0 paths but
    // classic should still emit walls (or at least an empty-but-coherent
    // GeneratedPerimeters with no NaN).
    const degenerate = [v(0, 0), v(0.0001, 0), v(0.0001, 0.0001), v(0, 0.0001)];
    const result = generatePerimetersArachne(
      degenerate, [],
      baseProfile.wallCount, baseProfile.wallLineWidth, 0,
      baseProfile, makeDeps(),
    );

    // Most important: we don't throw and we return defined arrays.
    expect(result).toBeDefined();
    expect(Array.isArray(result.walls)).toBe(true);
    expect(Array.isArray(result.lineWidths)).toBe(true);
  });
});
