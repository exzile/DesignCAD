import * as THREE from 'three';

export function fillSurface(
  boundaryPoints: THREE.Vector3[][],
  continuity: ('G0' | 'G1' | 'G2')[],
): THREE.BufferGeometry {
  const allPoints: THREE.Vector3[] = [];
  for (const edge of boundaryPoints) allPoints.push(...edge);

  const centroid = new THREE.Vector3();
  for (const point of allPoints) centroid.add(point);
  if (allPoints.length > 0) centroid.divideScalar(allPoints.length);

  const positions: number[] = [];
  const indices: number[] = [];

  for (let edgeIndex = 0; edgeIndex < boundaryPoints.length; edgeIndex++) {
    const edge = boundaryPoints[edgeIndex];
    const continuityType = continuity[edgeIndex] ?? 'G0';
    const blendFactor = continuityType === 'G2' ? 0.5 : continuityType === 'G1' ? 0.3 : 0;

    const edgePoints = edge.map((point) =>
      blendFactor === 0 ? point.clone() : new THREE.Vector3().lerpVectors(point, centroid, blendFactor),
    );

    const centroidIndex = positions.length / 3;
    positions.push(centroid.x, centroid.y, centroid.z);
    for (const point of edgePoints) positions.push(point.x, point.y, point.z);
    for (let i = 0; i < edgePoints.length - 1; i++) {
      indices.push(centroidIndex, centroidIndex + 1 + i, centroidIndex + 2 + i);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function offsetCurveToSurface(
  points: THREE.Vector3[],
  distance: number,
  referenceNormal: THREE.Vector3,
): THREE.BufferGeometry {
  if (points.length < 2) return new THREE.BufferGeometry();

  const normal = referenceNormal.clone().normalize();
  const offset = normal.clone().multiplyScalar(distance);
  const positions: number[] = [];
  const indices: number[] = [];

  for (const point of points) {
    const shifted = point.clone().add(offset);
    positions.push(point.x, point.y, point.z);
    positions.push(shifted.x, shifted.y, shifted.z);
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c);
    indices.push(b, d, c);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function mergeSurfaces(meshA: THREE.Mesh, meshB: THREE.Mesh): THREE.BufferGeometry {
  meshA.updateWorldMatrix(true, false);
  meshB.updateWorldMatrix(true, false);

  const geomA = meshA.geometry.clone().applyMatrix4(meshA.matrixWorld);
  const geomB = meshB.geometry.clone().applyMatrix4(meshB.matrixWorld);

  const posA = geomA.attributes.position as THREE.BufferAttribute;
  const posB = geomB.attributes.position as THREE.BufferAttribute;
  const idxA = geomA.index;
  const idxB = geomB.index;

  const countA = posA.count;
  const countB = posB.count;
  const merged = new Float32Array((countA + countB) * 3);

  for (let i = 0; i < countA; i++) {
    merged[i * 3] = posA.getX(i);
    merged[i * 3 + 1] = posA.getY(i);
    merged[i * 3 + 2] = posA.getZ(i);
  }
  for (let i = 0; i < countB; i++) {
    merged[(countA + i) * 3] = posB.getX(i);
    merged[(countA + i) * 3 + 1] = posB.getY(i);
    merged[(countA + i) * 3 + 2] = posB.getZ(i);
  }

  const indicesA: number[] = [];
  if (idxA) {
    for (let i = 0; i < idxA.count; i++) indicesA.push(idxA.getX(i));
  } else {
    for (let i = 0; i < countA; i++) indicesA.push(i);
  }

  const indicesB: number[] = [];
  if (idxB) {
    for (let i = 0; i < idxB.count; i++) indicesB.push(idxB.getX(i) + countA);
  } else {
    for (let i = 0; i < countB; i++) indicesB.push(countA + i);
  }

  const allIndices = [...indicesA, ...indicesB];
  const tolerance = 1e-4;
  const remapTable = new Int32Array(countA + countB);
  const keptPositions: number[] = [];

  for (let i = 0; i < countA + countB; i++) {
    const ix = merged[i * 3];
    const iy = merged[i * 3 + 1];
    const iz = merged[i * 3 + 2];
    let found = -1;
    for (let j = 0; j < keptPositions.length / 3; j++) {
      const dx = keptPositions[j * 3] - ix;
      const dy = keptPositions[j * 3 + 1] - iy;
      const dz = keptPositions[j * 3 + 2] - iz;
      if (dx * dx + dy * dy + dz * dz < tolerance * tolerance) {
        found = j;
        break;
      }
    }
    if (found === -1) {
      remapTable[i] = keptPositions.length / 3;
      keptPositions.push(ix, iy, iz);
    } else {
      remapTable[i] = found;
    }
  }

  const remappedIndices = allIndices.map((index) => remapTable[index]);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(keptPositions, 3));
  out.setIndex(remappedIndices);
  out.computeVertexNormals();

  geomA.dispose();
  geomB.dispose();
  return out;
}

export function createSurfacePrimitive(
  type: 'plane' | 'box' | 'sphere' | 'cylinder' | 'torus' | 'cone',
  params: Record<string, number>,
): THREE.BufferGeometry {
  switch (type) {
    case 'plane': {
      const width = params.width ?? 10;
      const height = params.height ?? 10;
      return new THREE.PlaneGeometry(width, height);
    }
    case 'box': {
      const width = params.width ?? 10;
      const height = params.height ?? 10;
      const depth = params.depth ?? 10;
      const hw = width / 2;
      const hh = height / 2;
      const hd = depth / 2;
      const faces = [
        { pos: new THREE.Vector3(hw, 0, 0), rot: [0, Math.PI / 2, 0], size: [depth, height] },
        { pos: new THREE.Vector3(-hw, 0, 0), rot: [0, -Math.PI / 2, 0], size: [depth, height] },
        { pos: new THREE.Vector3(0, hh, 0), rot: [-Math.PI / 2, 0, 0], size: [width, depth] },
        { pos: new THREE.Vector3(0, -hh, 0), rot: [Math.PI / 2, 0, 0], size: [width, depth] },
        { pos: new THREE.Vector3(0, 0, hd), rot: [0, 0, 0], size: [width, height] },
        { pos: new THREE.Vector3(0, 0, -hd), rot: [0, Math.PI, 0], size: [width, height] },
      ] as const;

      const positions: number[] = [];
      const indices: number[] = [];
      let vertOffset = 0;

      for (const face of faces) {
        const plane = new THREE.PlaneGeometry(face.size[0], face.size[1]);
        plane.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...face.rot as [number, number, number])));
        plane.applyMatrix4(new THREE.Matrix4().makeTranslation(face.pos.x, face.pos.y, face.pos.z));

        const posAttr = plane.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
        if (plane.index) {
          for (let i = 0; i < plane.index.count; i++) indices.push(plane.index.getX(i) + vertOffset);
        } else {
          for (let i = 0; i < posAttr.count; i++) indices.push(i + vertOffset);
        }
        vertOffset += posAttr.count;
        plane.dispose();
      }

      const out = new THREE.BufferGeometry();
      out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      out.setIndex(indices);
      out.computeVertexNormals();
      return out;
    }
    case 'sphere':
      return new THREE.SphereGeometry(params.radius ?? 5, 32, 16);
    case 'cylinder':
      return new THREE.CylinderGeometry(params.radius ?? 5, params.radius ?? 5, params.height2 ?? params.height ?? 10, 32, 1, true);
    case 'torus':
      return new THREE.TorusGeometry(params.radius ?? 8, params.tube ?? 2, 16, 100);
    case 'cone':
      return new THREE.ConeGeometry(params.radius ?? 5, params.height2 ?? params.height ?? 10, 32, 1, true);
    default:
      return new THREE.BufferGeometry();
  }
}
