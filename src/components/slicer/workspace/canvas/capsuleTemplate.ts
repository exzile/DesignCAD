import * as THREE from 'three';

// Unit-capsule template used by every extrusion instance. The vertex shader
// picks a per-vertex anchor side (0 = p0 end, 1 = p1 end), reads the matching
// world-space endpoint and radius from the per-instance attributes, then
// places the vertex by combining the encoded local-frame position with the
// world-space orthonormal basis it derives from `p1 - p0`. One BufferGeometry
// here, one InstancedMesh per layer at the call site — no CPU mesh stitching.
//
// Topology: cylinder body between the two endpoints + a hemisphere cap on
// each end. Hemispheres always overlap the next segment in a continuous
// extrusion path, so joints and turns blend cleanly via the depth buffer
// without miter math, chain detection, or path-break heuristics.
//
// Each cap is built as: one pole vertex + HEMI_RINGS non-pole rings (the last
// of which is the cylinder equator). The pole-to-first-ring band is a triangle
// fan from the single pole vertex, NOT a quad strip — duplicating RADIAL
// coincident pole vertices and stitching them as quads would produce RADIAL
// degenerate (zero-area) triangles per cap, which is ~25% of the template's
// triangles for our default RADIAL=12 / HEMI_RINGS=3 settings.

const RADIAL = 12;     // segments around the tube axis
const HEMI_RINGS = 3;  // rings inside each hemisphere (pole -> equator)

export interface CapsuleTemplate {
  geometry: THREE.BufferGeometry;
  trianglesPerInstance: number;
}

function buildTemplate(): CapsuleTemplate {
  // Per vertex attributes:
  //   aSide: 0 if anchored to p0, 1 if anchored to p1.
  //   aLocal: vec3 in a local frame where x = axial (toward p1) and y/z are
  //           the perpendicular plane. Magnitude is in radius units, so the
  //           shader scales by mix(r0, r1, aSide) and rotates by the world
  //           basis to land in scene space.
  const aSide: number[] = [];
  const aLocal: number[] = [];
  const indices: number[] = [];

  let vCount = 0;
  const pushVertex = (side: 0 | 1, lx: number, ly: number, lz: number): number => {
    aSide.push(side);
    aLocal.push(lx, ly, lz);
    return vCount++;
  };

  // Build a hemisphere cap: one pole vertex + HEMI_RINGS rings of RADIAL
  // vertices each. The first ring (index 0) is the first non-pole circle,
  // the last ring (index HEMI_RINGS - 1) is the equator (axial=0, radial=1).
  // Returns { pole, rings } where rings.length === HEMI_RINGS.
  const buildCap = (side: 0 | 1, axialSign: number) => {
    const pole = pushVertex(side, axialSign * 1, 0, 0);
    const rings: number[][] = [];
    // Rings at theta = (k+1) / HEMI_RINGS * pi/2 — skips theta=0 (the pole).
    for (let r = 0; r < HEMI_RINGS; r++) {
      const theta = ((r + 1) / HEMI_RINGS) * Math.PI * 0.5;
      const axial = axialSign * Math.cos(theta);
      const radial = Math.sin(theta);
      const ring: number[] = [];
      for (let s = 0; s < RADIAL; s++) {
        const phi = (s / RADIAL) * Math.PI * 2;
        ring.push(pushVertex(side, axial, Math.cos(phi) * radial, Math.sin(phi) * radial));
      }
      rings.push(ring);
    }
    return { pole, rings };
  };

  // Stitch a quad strip between two RADIAL-vertex rings. Consistent winding
  // assumes a is "behind" b along the surface direction the caller wants
  // facing outward.
  const stitchRings = (a: number[], b: number[], reverse: boolean) => {
    for (let s = 0; s < RADIAL; s++) {
      const sNext = (s + 1) % RADIAL;
      const a0 = a[s], a1 = a[sNext];
      const b0 = b[s], b1 = b[sNext];
      if (!reverse) {
        indices.push(a0, b0, b1);
        indices.push(a0, b1, a1);
      } else {
        indices.push(a0, b1, b0);
        indices.push(a0, a1, b1);
      }
    }
  };

  // Triangle fan from a single pole vertex to a ring of RADIAL vertices.
  const stitchFan = (pole: number, ring: number[], reverse: boolean) => {
    for (let s = 0; s < RADIAL; s++) {
      const sNext = (s + 1) % RADIAL;
      if (!reverse) indices.push(pole, ring[s], ring[sNext]);
      else          indices.push(pole, ring[sNext], ring[s]);
    }
  };

  // Start cap: axial = -1 at pole, axial = 0 at equator. Outward normal
  // points in -axis direction at the pole, fading to radial at the equator.
  const startCap = buildCap(0, -1);
  // End cap: axial = +1 at pole. Reversed winding because vertex order
  // around the ring is mirrored relative to the start cap.
  const endCap = buildCap(1, +1);

  // Start cap pole fan (pole -> first non-pole ring), then ring-to-ring
  // strips up to the equator.
  stitchFan(startCap.pole, startCap.rings[0], false);
  for (let r = 0; r < HEMI_RINGS - 1; r++) {
    stitchRings(startCap.rings[r], startCap.rings[r + 1], false);
  }
  // Cylinder body: start equator -> end equator.
  stitchRings(startCap.rings[HEMI_RINGS - 1], endCap.rings[HEMI_RINGS - 1], false);
  // End cap: equator -> ... -> pole. Reversed winding because we're now
  // traversing rings inward rather than outward.
  for (let r = HEMI_RINGS - 1; r > 0; r--) {
    stitchRings(endCap.rings[r], endCap.rings[r - 1], true);
  }
  stitchFan(endCap.pole, endCap.rings[0], true);

  const geometry = new THREE.BufferGeometry();
  // `position` exists only because Three.js requires it for materials that
  // don't override it. The shader ignores it and rebuilds positions from
  // (aSide, aLocal, instance attributes) each frame.
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(aLocal), 3));
  geometry.setAttribute('aSide', new THREE.Float32BufferAttribute(new Float32Array(aSide), 1));
  geometry.setAttribute('aLocal', new THREE.Float32BufferAttribute(new Float32Array(aLocal), 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return {
    geometry,
    trianglesPerInstance: indices.length / 3,
  };
}

let cached: CapsuleTemplate | null = null;

export function getCapsuleTemplate(): CapsuleTemplate {
  if (!cached) cached = buildTemplate();
  return cached;
}

export const CAPSULE_RADIAL = RADIAL;
export const CAPSULE_HEMI_RINGS = HEMI_RINGS;
