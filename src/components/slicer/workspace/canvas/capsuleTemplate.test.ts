import { describe, expect, it } from 'vitest';
import { CAPSULE_HEMI_RINGS, CAPSULE_RADIAL, getCapsuleTemplate } from './capsuleTemplate';

// Capsule template topology: cylinder body + two hemisphere caps. Tests
// verify the per-vertex anchor side and local-frame magnitudes match what
// the extrusion vertex shader expects, and that the index buffer is closed
// (no holes, no degenerate triangles).

describe('capsuleTemplate', () => {
  it('caches the template — repeated calls return the same geometry instance', () => {
    const a = getCapsuleTemplate();
    const b = getCapsuleTemplate();
    expect(a).toBe(b);
  });

  it('exposes aSide values strictly in {0, 1}', () => {
    const { geometry } = getCapsuleTemplate();
    const aSide = geometry.getAttribute('aSide').array as Float32Array;
    for (let i = 0; i < aSide.length; i++) {
      expect(aSide[i] === 0 || aSide[i] === 1).toBe(true);
    }
  });

  it('aLocal magnitudes never exceed 1 (unit-radius template)', () => {
    const { geometry } = getCapsuleTemplate();
    const aLocal = geometry.getAttribute('aLocal').array as Float32Array;
    for (let i = 0; i < aLocal.length; i += 3) {
      const mag = Math.hypot(aLocal[i], aLocal[i + 1], aLocal[i + 2]);
      expect(mag).toBeLessThanOrEqual(1 + 1e-5);
    }
  });

  it('cylinder equator vertices on each side are unit-magnitude in the YZ plane', () => {
    // The equator is the largest |radial| ring on each hemisphere; for a
    // unit capsule those vertices lie at axial=0, |y/z|=1.
    const { geometry } = getCapsuleTemplate();
    const aLocal = geometry.getAttribute('aLocal').array as Float32Array;
    const aSide = geometry.getAttribute('aSide').array as Float32Array;
    let foundSide0Equator = false;
    let foundSide1Equator = false;
    for (let i = 0; i < aSide.length; i++) {
      const ax = aLocal[i * 3];
      const ay = aLocal[i * 3 + 1];
      const az = aLocal[i * 3 + 2];
      const radial = Math.hypot(ay, az);
      if (Math.abs(ax) < 1e-5 && Math.abs(radial - 1) < 1e-5) {
        if (aSide[i] === 0) foundSide0Equator = true;
        else if (aSide[i] === 1) foundSide1Equator = true;
      }
    }
    expect(foundSide0Equator).toBe(true);
    expect(foundSide1Equator).toBe(true);
  });

  it('has poles at axial = -1 (side=0) and axial = +1 (side=1)', () => {
    const { geometry } = getCapsuleTemplate();
    const aLocal = geometry.getAttribute('aLocal').array as Float32Array;
    const aSide = geometry.getAttribute('aSide').array as Float32Array;
    let minAxial = Infinity, maxAxial = -Infinity;
    let minSide = -1, maxSide = -1;
    for (let i = 0; i < aSide.length; i++) {
      const ax = aLocal[i * 3];
      if (ax < minAxial) { minAxial = ax; minSide = aSide[i]; }
      if (ax > maxAxial) { maxAxial = ax; maxSide = aSide[i]; }
    }
    expect(minAxial).toBeCloseTo(-1, 5);
    expect(maxAxial).toBeCloseTo(1, 5);
    expect(minSide).toBe(0);
    expect(maxSide).toBe(1);
  });

  it('triangle count matches cylinder + two hemispheres (single pole, no degenerate triangles)', () => {
    const { trianglesPerInstance } = getCapsuleTemplate();
    // Each cap = pole fan (RADIAL tris) + (HEMI_RINGS - 1) ring strips
    // (RADIAL * 2 tris each). Cylinder body adds one RADIAL * 2 strip.
    const cylinderTris = CAPSULE_RADIAL * 2;
    const hemiTris = CAPSULE_RADIAL + (CAPSULE_HEMI_RINGS - 1) * CAPSULE_RADIAL * 2;
    expect(trianglesPerInstance).toBe(cylinderTris + 2 * hemiTris);
  });

  it('has exactly two pole vertices (one per cap), not RADIAL coincident copies', () => {
    const { geometry } = getCapsuleTemplate();
    const aLocal = geometry.getAttribute('aLocal').array as Float32Array;
    let polesAtMinusOne = 0;
    let polesAtPlusOne = 0;
    for (let i = 0; i < aLocal.length; i += 3) {
      const ax = aLocal[i], ay = aLocal[i + 1], az = aLocal[i + 2];
      if (Math.abs(ay) < 1e-6 && Math.abs(az) < 1e-6) {
        if (Math.abs(ax + 1) < 1e-6) polesAtMinusOne++;
        else if (Math.abs(ax - 1) < 1e-6) polesAtPlusOne++;
      }
    }
    expect(polesAtMinusOne).toBe(1);
    expect(polesAtPlusOne).toBe(1);
  });

  it('has no zero-area triangles (no two vertices in a triangle at the same world position)', () => {
    // World position = mix(iA, iB, aSide) + frame * aLocal * radius. Two
    // verts collide in world space only when both aLocal AND aSide match
    // (equator vertices share aLocal between caps but their aSide differs,
    // which puts them at different anchors in world space — that's the
    // cylinder body, not a degenerate triangle).
    const { geometry } = getCapsuleTemplate();
    const indices = geometry.getIndex()!.array;
    const aLocal = geometry.getAttribute('aLocal').array as Float32Array;
    const aSide  = geometry.getAttribute('aSide').array as Float32Array;
    const samePos = (a: number, b: number) =>
      aSide[a] === aSide[b] &&
      Math.abs(aLocal[a * 3]     - aLocal[b * 3])     < 1e-6 &&
      Math.abs(aLocal[a * 3 + 1] - aLocal[b * 3 + 1]) < 1e-6 &&
      Math.abs(aLocal[a * 3 + 2] - aLocal[b * 3 + 2]) < 1e-6;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      expect(samePos(a, b)).toBe(false);
      expect(samePos(b, c)).toBe(false);
      expect(samePos(a, c)).toBe(false);
    }
  });

  it('every index references a valid vertex', () => {
    const { geometry } = getCapsuleTemplate();
    const indexAttr = geometry.getIndex();
    expect(indexAttr).not.toBeNull();
    const indices = indexAttr!.array;
    const vertexCount = geometry.getAttribute('aSide').count;
    for (let i = 0; i < indices.length; i++) {
      expect(indices[i]).toBeGreaterThanOrEqual(0);
      expect(indices[i]).toBeLessThan(vertexCount);
    }
  });

  it('produces no degenerate triangles (no two indices in a triangle equal)', () => {
    const { geometry } = getCapsuleTemplate();
    const indices = geometry.getIndex()!.array;
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i], b = indices[i + 1], c = indices[i + 2];
      expect(a).not.toBe(b);
      expect(b).not.toBe(c);
      expect(a).not.toBe(c);
    }
  });
});
