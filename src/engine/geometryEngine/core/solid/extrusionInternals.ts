import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { csgSubtract } from './csg';

function removeDegenerateTriangles(
  geometry: THREE.BufferGeometry,
  relAreaThreshold = 0.01,
): THREE.BufferGeometry {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const cross = new THREE.Vector3();

  const areas: number[] = [];
  for (let i = 0; i < count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    cross.crossVectors(ab, ac);
    areas.push(cross.length() * 0.5);
  }

  const sorted = [...areas].sort((lhs, rhs) => lhs - rhs);
  const medianArea = sorted[Math.floor(sorted.length / 2)] ?? 0;
  const areaCutoff = medianArea * relAreaThreshold;

  const nextPositions: number[] = [];
  for (let i = 0; i < count; i += 3) {
    if (areas[i / 3] < areaCutoff) continue;
    for (let k = 0; k < 3; k++) {
      a.fromBufferAttribute(pos, i + k);
      nextPositions.push(a.x, a.y, a.z);
    }
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(nextPositions, 3));
  result.computeVertexNormals();
  return result;
}

export function buildExtrudeGeomHolesAware(
  shapes: THREE.Shape[],
  extrudeSettings: THREE.ExtrudeGeometryOptions,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  for (const shape of shapes) {
    if (shape.holes.length === 0) {
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const nonIndexed = geometry.toNonIndexed();
      geometry.dispose();
      parts.push(removeDegenerateTriangles(nonIndexed));
      nonIndexed.dispose();
      continue;
    }

    const outerShape = new THREE.Shape(shape.getPoints(64));
    const outerRaw = new THREE.ExtrudeGeometry(outerShape, extrudeSettings);
    const outerNonIndexed = outerRaw.toNonIndexed();
    outerRaw.dispose();
    let solid = removeDegenerateTriangles(outerNonIndexed);
    outerNonIndexed.dispose();

    for (const holePath of shape.holes) {
      const holeShape = new THREE.Shape(holePath.getPoints(64));
      const holeSettings: THREE.ExtrudeGeometryOptions = {
        ...extrudeSettings,
        depth: (extrudeSettings.depth ?? 1) + 2,
      };
      const holeRaw = new THREE.ExtrudeGeometry(holeShape, holeSettings);
      const holeNonIndexed = holeRaw.toNonIndexed();
      holeRaw.dispose();
      const holeGeom = removeDegenerateTriangles(holeNonIndexed);
      holeNonIndexed.dispose();
      holeGeom.translate(0, 0, -1);
      const subtracted = csgSubtract(solid, holeGeom);
      solid.dispose();
      holeGeom.dispose();
      solid = subtracted;
    }

    parts.push(solid);
  }

  let combined: THREE.BufferGeometry;
  if (parts.length === 1) {
    combined = parts[0];
  } else {
    const totalCount = parts.reduce((sum, geometry) => sum + geometry.attributes.position.count, 0);
    const mergedPositions = new Float32Array(totalCount * 3);
    let offset = 0;
    for (const geometry of parts) {
      const arr = (geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      mergedPositions.set(arr, offset);
      offset += arr.length;
      geometry.dispose();
    }
    combined = new THREE.BufferGeometry();
    combined.setAttribute('position', new THREE.Float32BufferAttribute(mergedPositions, 3));
  }

  const merged = mergeVertices(combined, 1e-4);
  combined.dispose();
  return toCreasedNormals(merged, Math.PI / 6);
}
