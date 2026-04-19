import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { disposeGeometries } from '../../../utils/threeDisposal';
import { FACE_HIGHLIGHT_FILL, FACE_HIGHLIGHT_OUTLINE } from './materials';

/** Renders a translucent fill + outline over a coplanar boundary loop. */
export default function FaceHighlight({ boundary }: { boundary: THREE.Vector3[] }) {
  // Build a flat polygon in WORLD space directly from the boundary points.
  // We don't project to plane-local coords — that just adds bugs. The mesh
  // is rendered in world space with depthTest disabled so it always shows on
  // top of the underlying body face.
  const { fillGeom, outlineGeom } = useMemo(() => {
    if (boundary.length < 3) return { fillGeom: null, outlineGeom: null };

    // Triangulate the boundary correctly — works for convex AND for faces
    // with holes that come back as a single closed loop with zero-width
    // bridges (e.g. a rectangular face with circular holes). A fan from
    // vertex 0 produced a huge visible triangle radiating from one corner
    // out to the hole boundaries; ear-clipping (via THREE.ShapeUtils) gives
    // a clean triangulation that respects the bridged polygon.
    //
    // Step 1: build an orthonormal 2D basis on the face plane using the
    // first three points. `boundary` is known coplanar so any two non-collinear
    // edges work.
    const p0 = boundary[0];
    const ab = boundary[1].clone().sub(p0);
    // Find a third point not collinear with p0→p1 (rare edge case if the
    // first three are collinear).
    let ac: THREE.Vector3 | null = null;
    for (let i = 2; i < boundary.length; i++) {
      const cand = boundary[i].clone().sub(p0);
      if (cand.clone().cross(ab).lengthSq() > 1e-10) { ac = cand; break; }
    }
    const t1 = ab.clone().normalize();
    const n = (ac ?? new THREE.Vector3(1, 0, 0)).clone().cross(t1).normalize();
    const t2 = n.clone().cross(t1).normalize();

    // Step 2: project the boundary to 2D (u, v) on the face plane.
    const pts2D = boundary.map((p) => {
      const d = p.clone().sub(p0);
      return new THREE.Vector2(d.dot(t1), d.dot(t2));
    });

    // Step 3: ear-clip. THREE.ShapeUtils.triangulateShape returns triangles
    // as index triples into the input contour array.
    const triIndices = THREE.ShapeUtils.triangulateShape(pts2D, []);

    const positions: number[] = [];
    for (const p of boundary) positions.push(p.x, p.y, p.z);
    const indices: number[] = [];
    for (const [i, j, k] of triIndices) indices.push(i, j, k);

    const fillGeom = new THREE.BufferGeometry();
    fillGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    fillGeom.setIndex(indices);
    fillGeom.computeVertexNormals();

    // Outline: closed line loop visiting each boundary point in order
    const outlinePositions: number[] = [];
    for (const p of boundary) outlinePositions.push(p.x, p.y, p.z);
    const outlineGeom = new THREE.BufferGeometry();
    outlineGeom.setAttribute('position', new THREE.Float32BufferAttribute(outlinePositions, 3));

    return { fillGeom, outlineGeom };
  }, [boundary]);

  useEffect(() => {
    return () => disposeGeometries(fillGeom, outlineGeom);
  }, [fillGeom, outlineGeom]);

  if (!fillGeom || !outlineGeom) return null;

  return (
    <group renderOrder={2000}>
      <mesh geometry={fillGeom} material={FACE_HIGHLIGHT_FILL} renderOrder={2000} />
      <lineLoop geometry={outlineGeom} material={FACE_HIGHLIGHT_OUTLINE} renderOrder={2001} />
    </group>
  );
}
