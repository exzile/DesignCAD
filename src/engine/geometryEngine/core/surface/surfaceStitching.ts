import * as THREE from 'three';

function makeIndexedGeometry(positions: number[], indices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function stitchSurfaces(
  meshes: THREE.Mesh[],
  tolerance = 1e-3,
): { geometry: THREE.BufferGeometry; isSolid: boolean } {
  if (meshes.length === 0) {
    return { geometry: new THREE.BufferGeometry(), isSolid: false };
  }

  const allPositions: number[] = [];
  const allIndices: number[] = [];
  const vertexMeshIds: number[] = [];

  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
    const mesh = meshes[meshIndex];
    mesh.updateWorldMatrix(true, false);
    const geometry = mesh.geometry;
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    const indices = geometry.index;
    const baseVertex = allPositions.length / 3;
    const vertex = new THREE.Vector3();

    for (let vertexIndex = 0; vertexIndex < positions.count; vertexIndex++) {
      vertex.fromBufferAttribute(positions, vertexIndex).applyMatrix4(mesh.matrixWorld);
      allPositions.push(vertex.x, vertex.y, vertex.z);
      vertexMeshIds.push(meshIndex);
    }

    if (indices) {
      for (let index = 0; index < indices.count; index++) {
        allIndices.push(indices.getX(index) + baseVertex);
      }
    } else {
      for (let index = 0; index < positions.count; index++) {
        allIndices.push(index + baseVertex);
      }
    }
  }

  const vertexCount = allPositions.length / 3;
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;

  const find = (index: number): number => {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  };

  const union = (a: number, b: number): void => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootA] = rootB;
  };

  const toleranceSquared = tolerance * tolerance;
  const cellSize = tolerance * 2;
  const buckets = new Map<string, number[]>();
  const cellKey = (x: number, y: number, z: number): string =>
    `${Math.floor(x / cellSize)},${Math.floor(y / cellSize)},${Math.floor(z / cellSize)}`;

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
    const x = allPositions[vertexIndex * 3];
    const y = allPositions[vertexIndex * 3 + 1];
    const z = allPositions[vertexIndex * 3 + 2];
    const key = cellKey(x, y, z);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(vertexIndex);
  }

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex++) {
    const vx = allPositions[vertexIndex * 3];
    const vy = allPositions[vertexIndex * 3 + 1];
    const vz = allPositions[vertexIndex * 3 + 2];
    const cx = Math.floor(vx / cellSize);
    const cy = Math.floor(vy / cellSize);
    const cz = Math.floor(vz / cellSize);

    for (const dx of [-1, 0, 1]) {
      for (const dy of [-1, 0, 1]) {
        for (const dz of [-1, 0, 1]) {
          const neighbors = buckets.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!neighbors) continue;

          for (const otherIndex of neighbors) {
            if (otherIndex <= vertexIndex) continue;
            if (vertexMeshIds[vertexIndex] === vertexMeshIds[otherIndex]) continue;

            const dx2 = vx - allPositions[otherIndex * 3];
            const dy2 = vy - allPositions[otherIndex * 3 + 1];
            const dz2 = vz - allPositions[otherIndex * 3 + 2];
            if (dx2 * dx2 + dy2 * dy2 + dz2 * dz2 <= toleranceSquared) {
              union(vertexIndex, otherIndex);
            }
          }
        }
      }
    }
  }

  const weldedIndices = allIndices.map((index) => find(index));
  const edgeCount = new Map<string, number>();
  for (let triangleIndex = 0; triangleIndex < weldedIndices.length / 3; triangleIndex++) {
    const a = weldedIndices[triangleIndex * 3];
    const b = weldedIndices[triangleIndex * 3 + 1];
    const c = weldedIndices[triangleIndex * 3 + 2];
    for (const [edgeA, edgeB] of [
      [Math.min(a, b), Math.max(a, b)],
      [Math.min(b, c), Math.max(b, c)],
      [Math.min(a, c), Math.max(a, c)],
    ] as const) {
      const key = `${edgeA}_${edgeB}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }

  let isSolid = true;
  for (const count of edgeCount.values()) {
    if (count === 1) {
      isSolid = false;
      break;
    }
  }

  const usedRoots = new Set(weldedIndices);
  const rootToCompact = new Map<number, number>();
  const compactPositions: number[] = [];
  for (const root of usedRoots) {
    rootToCompact.set(root, compactPositions.length / 3);
    compactPositions.push(
      allPositions[root * 3],
      allPositions[root * 3 + 1],
      allPositions[root * 3 + 2],
    );
  }

  return {
    geometry: makeIndexedGeometry(
      compactPositions,
      weldedIndices.map((root) => rootToCompact.get(root)!),
    ),
    isSolid,
  };
}

export function unstitchSurface(mesh: THREE.Mesh): THREE.BufferGeometry[] {
  const geometry = mesh.geometry;
  const positions = geometry.attributes.position as THREE.BufferAttribute;
  const indices = geometry.index;
  const triCount = indices ? indices.count / 3 : positions.count / 3;
  if (triCount === 0) return [geometry];

  const getTri = (triangleIndex: number): [number, number, number] => {
    if (indices) {
      return [
        indices.getX(triangleIndex * 3),
        indices.getX(triangleIndex * 3 + 1),
        indices.getX(triangleIndex * 3 + 2),
      ];
    }
    return [triangleIndex * 3, triangleIndex * 3 + 1, triangleIndex * 3 + 2];
  };

  const edgeToTriangles = new Map<string, number[]>();
  for (let triangleIndex = 0; triangleIndex < triCount; triangleIndex++) {
    const [a, b, c] = getTri(triangleIndex);
    for (const [edgeA, edgeB] of [
      [Math.min(a, b), Math.max(a, b)],
      [Math.min(b, c), Math.max(b, c)],
      [Math.min(a, c), Math.max(a, c)],
    ] as const) {
      const key = `${edgeA}_${edgeB}`;
      if (!edgeToTriangles.has(key)) edgeToTriangles.set(key, []);
      edgeToTriangles.get(key)!.push(triangleIndex);
    }
  }

  const componentIds = new Int32Array(triCount).fill(-1);
  let componentCount = 0;
  for (let start = 0; start < triCount; start++) {
    if (componentIds[start] !== -1) continue;

    const componentIndex = componentCount++;
    const queue: number[] = [start];
    componentIds[start] = componentIndex;
    for (let head = 0; head < queue.length; head++) {
      const triangleIndex = queue[head];
      const [a, b, c] = getTri(triangleIndex);
      for (const [edgeA, edgeB] of [
        [Math.min(a, b), Math.max(a, b)],
        [Math.min(b, c), Math.max(b, c)],
        [Math.min(a, c), Math.max(a, c)],
      ] as const) {
        const neighbors = edgeToTriangles.get(`${edgeA}_${edgeB}`);
        if (!neighbors) continue;
        for (const neighborIndex of neighbors) {
          if (componentIds[neighborIndex] === -1) {
            componentIds[neighborIndex] = componentIndex;
            queue.push(neighborIndex);
          }
        }
      }
    }
  }

  if (componentCount === 1) return [geometry];

  return Array.from({ length: componentCount }, (_, componentIndex) => {
    const componentPositions: number[] = [];
    const componentIndices: number[] = [];
    const oldToNew = new Map<number, number>();

    for (let triangleIndex = 0; triangleIndex < triCount; triangleIndex++) {
      if (componentIds[triangleIndex] !== componentIndex) continue;
      for (const vertexIndex of getTri(triangleIndex)) {
        if (!oldToNew.has(vertexIndex)) {
          oldToNew.set(vertexIndex, componentPositions.length / 3);
          componentPositions.push(
            positions.getX(vertexIndex),
            positions.getY(vertexIndex),
            positions.getZ(vertexIndex),
          );
        }
        componentIndices.push(oldToNew.get(vertexIndex)!);
      }
    }

    return makeIndexedGeometry(componentPositions, componentIndices);
  });
}
