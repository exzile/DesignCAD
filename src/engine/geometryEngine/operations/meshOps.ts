import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

export function reverseNormals(geom: THREE.BufferGeometry): void {
  if (geom.index) {
    const idx = geom.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i + 1];
      (idx as Uint16Array | Uint32Array)[i + 1] = idx[i + 2];
      (idx as Uint16Array | Uint32Array)[i + 2] = tmp;
    }
    geom.index.needsUpdate = true;
  } else {
    const pos = geom.getAttribute('position');
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 9) {
      for (let k = 0; k < 3; k++) {
        const tmp = arr[i + 3 + k];
        arr[i + 3 + k] = arr[i + 6 + k];
        arr[i + 6 + k] = tmp;
      }
    }
    pos.needsUpdate = true;
  }
  geom.computeVertexNormals();
}

export function mirrorMesh(source: THREE.Mesh, plane: 'XY' | 'XZ' | 'YZ'): THREE.Mesh {
  const scale = new THREE.Vector3(
    plane === 'YZ' ? -1 : 1,
    plane === 'XZ' ? -1 : 1,
    plane === 'XY' ? -1 : 1,
  );
  const reflectMatrix = new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z);
  const geo = source.geometry.clone();
  geo.applyMatrix4(reflectMatrix);

  const idx = geo.index;
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      const b = idx.getX(i + 2);
      idx.setX(i + 1, b);
      idx.setX(i + 2, a);
    }
    idx.needsUpdate = true;
  } else {
    const pos = geo.attributes.position;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 3) {
      tmp.fromBufferAttribute(pos, i + 1);
      pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, tmp.x, tmp.y, tmp.z);
    }
    pos.needsUpdate = true;
  }
  geo.computeVertexNormals();

  const mat = Array.isArray(source.material) ? source.material[0].clone() : source.material.clone();
  return new THREE.Mesh(geo, mat);
}

export function reverseMeshNormals(mesh: THREE.Mesh): THREE.Mesh {
  const geom = mesh.geometry.clone();
  const pos = geom.attributes.position as THREE.BufferAttribute;
  if (geom.index) {
    const idx = geom.index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < idx.length; i += 3) {
      const tmp = idx[i + 1];
      idx[i + 1] = idx[i + 2];
      idx[i + 2] = tmp;
    }
    geom.index.needsUpdate = true;
  } else {
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i += 9) {
      for (let j = 0; j < 3; j++) {
        const tmp = arr[i + 3 + j];
        arr[i + 3 + j] = arr[i + 6 + j];
        arr[i + 6 + j] = tmp;
      }
    }
    pos.needsUpdate = true;
  }
  if (geom.attributes.normal) geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function combineMeshes(meshes: THREE.Mesh[]): THREE.Mesh {
  const geoms = meshes.map((mesh) => {
    const geometry = mesh.geometry.toNonIndexed();
    geometry.applyMatrix4(mesh.matrixWorld);
    return geometry;
  });
  let totalVerts = 0;
  for (const geometry of geoms) totalVerts += (geometry.attributes.position as THREE.BufferAttribute).count;
  const positions = new Float32Array(totalVerts * 3);
  let offset = 0;
  for (const geometry of geoms) {
    const positionArray = geometry.attributes.position.array as Float32Array;
    positions.set(positionArray, offset);
    offset += positionArray.length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.computeVertexNormals();
  const material = Array.isArray(meshes[0].material) ? meshes[0].material[0] : meshes[0].material;
  return new THREE.Mesh(merged, material);
}

export function transformMesh(
  mesh: THREE.Mesh,
  params: { tx: number; ty: number; tz: number; rx: number; ry: number; rz: number; scale: number },
): THREE.Mesh {
  const geom = mesh.geometry.clone();
  const matrix = new THREE.Matrix4().compose(
    new THREE.Vector3(params.tx, params.ty, params.tz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(params.rx, params.ry, params.rz)),
    new THREE.Vector3(params.scale, params.scale, params.scale),
  );
  geom.applyMatrix4(matrix);
  geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function scaleMesh(mesh: THREE.Mesh, sx: number, sy: number, sz: number): THREE.Mesh {
  const geom = mesh.geometry.clone();
  geom.applyMatrix4(new THREE.Matrix4().makeScale(sx, sy, sz));
  geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function linearPattern(
  mesh: THREE.Mesh,
  params: {
    dirX: number; dirY: number; dirZ: number;
    spacing: number; count: number;
    dir2X?: number; dir2Y?: number; dir2Z?: number;
    spacing2?: number; count2?: number;
  },
): THREE.Mesh[] {
  const dir1 = new THREE.Vector3(params.dirX, params.dirY, params.dirZ).normalize();
  const results: THREE.Mesh[] = [];
  const count2 = params.count2 ?? 1;
  const spacing2 = params.spacing2 ?? 0;
  const dir2 = params.dir2X !== undefined
    ? new THREE.Vector3(params.dir2X, params.dir2Y ?? 0, params.dir2Z ?? 0).normalize()
    : null;
  for (let j = 0; j < count2; j++) {
    for (let i = 0; i < params.count; i++) {
      if (i === 0 && j === 0) continue;
      const offset = dir1.clone().multiplyScalar(i * params.spacing);
      if (dir2) offset.addScaledVector(dir2, j * spacing2);
      const geom = mesh.geometry.clone();
      geom.translate(offset.x, offset.y, offset.z);
      const copy = new THREE.Mesh(geom, mesh.material);
      copy.userData = { ...mesh.userData };
      results.push(copy);
    }
  }
  return results;
}

export function circularPattern(
  mesh: THREE.Mesh,
  params: {
    axisX: number; axisY: number; axisZ: number;
    originX: number; originY: number; originZ: number;
    count: number; totalAngle: number;
  },
): THREE.Mesh[] {
  const axis = new THREE.Vector3(params.axisX, params.axisY, params.axisZ).normalize();
  const origin = new THREE.Vector3(params.originX, params.originY, params.originZ);
  const results: THREE.Mesh[] = [];
  const angleStep = (params.totalAngle / params.count) * (Math.PI / 180);
  for (let i = 1; i < params.count; i++) {
    const angle = angleStep * i;
    const quat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    const geom = mesh.geometry.clone();
    const pos = geom.attributes.position as THREE.BufferAttribute;
    for (let v = 0; v < pos.count; v++) {
      const point = new THREE.Vector3().fromBufferAttribute(pos, v).sub(origin).applyQuaternion(quat).add(origin);
      pos.setXYZ(v, point.x, point.y, point.z);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    const copy = new THREE.Mesh(geom, mesh.material);
    copy.userData = { ...mesh.userData };
    results.push(copy);
  }
  return results;
}

export function planeCutMesh(
  mesh: THREE.Mesh,
  planeNormal: THREE.Vector3,
  planeOffset: number,
  keepSide: 'positive' | 'negative',
): THREE.Mesh {
  const geom = mesh.geometry.toNonIndexed();
  geom.applyMatrix4(mesh.matrixWorld);
  const normal = planeNormal.clone().normalize();
  const sign = keepSide === 'positive' ? 1 : -1;

  const pos = geom.attributes.position as THREE.BufferAttribute;
  const keptVerts: number[] = [];
  const cutLoop: THREE.Vector3[] = [];

  for (let i = 0; i < pos.count; i += 3) {
    const va = new THREE.Vector3().fromBufferAttribute(pos, i);
    const vb = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const vc = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const da = normal.dot(va) - planeOffset;
    const db = normal.dot(vb) - planeOffset;
    const dc = normal.dot(vc) - planeOffset;
    const sa = Math.sign(da) * sign >= 0;
    const sb = Math.sign(db) * sign >= 0;
    const sc = Math.sign(dc) * sign >= 0;

    if (sa && sb && sc) {
      keptVerts.push(va.x, va.y, va.z, vb.x, vb.y, vb.z, vc.x, vc.y, vc.z);
    } else if (!sa && !sb && !sc) {
      continue;
    } else {
      const verts = [va, vb, vc];
      const distances = [da, db, dc];
      const kept: THREE.Vector3[] = [];
      const boundary: THREE.Vector3[] = [];
      for (let j = 0; j < 3; j++) {
        const curr = verts[j];
        const next = verts[(j + 1) % 3];
        const dc0 = distances[j];
        const dc1 = distances[(j + 1) % 3];
        const currKept = dc0 * sign >= 0;
        const nextKept = dc1 * sign >= 0;
        if (currKept) kept.push(curr);
        if (currKept !== nextKept) {
          const t = dc0 / (dc0 - dc1);
          const point = curr.clone().lerp(next, t);
          kept.push(point);
          boundary.push(point.clone());
        }
      }
      for (let j = 1; j + 1 < kept.length; j++) {
        keptVerts.push(
          kept[0].x, kept[0].y, kept[0].z,
          kept[j].x, kept[j].y, kept[j].z,
          kept[j + 1].x, kept[j + 1].y, kept[j + 1].z,
        );
      }
      cutLoop.push(...boundary);
    }
  }

  if (cutLoop.length >= 3) {
    const cen = cutLoop.reduce((acc, point) => acc.clone().add(point)).divideScalar(cutLoop.length);
    for (let i = 0; i < cutLoop.length - 1; i++) {
      keptVerts.push(
        cen.x, cen.y, cen.z,
        cutLoop[i].x, cutLoop[i].y, cutLoop[i].z,
        cutLoop[i + 1].x, cutLoop[i + 1].y, cutLoop[i + 1].z,
      );
    }
  }

  const newGeom = new THREE.BufferGeometry();
  newGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keptVerts), 3));
  newGeom.computeVertexNormals();
  const result = new THREE.Mesh(newGeom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function makeClosedMesh(mesh: THREE.Mesh): THREE.Mesh {
  const geom = mesh.geometry.toNonIndexed();
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const quantum = 1e-4;
  const hashKey = (v: THREE.Vector3) =>
    `${Math.round(v.x / quantum)}|${Math.round(v.y / quantum)}|${Math.round(v.z / quantum)}`;

  const existingVerts: number[] = [];
  for (let i = 0; i < pos.count * 3; i++) existingVerts.push(pos.array[i]);

  const edgeCount = new Map<string, number>();
  const edgeVerts = new Map<string, [THREE.Vector3, THREE.Vector3]>();
  for (let i = 0; i < pos.count; i += 3) {
    const verts = [
      new THREE.Vector3().fromBufferAttribute(pos, i),
      new THREE.Vector3().fromBufferAttribute(pos, i + 1),
      new THREE.Vector3().fromBufferAttribute(pos, i + 2),
    ];
    for (let j = 0; j < 3; j++) {
      const a = verts[j];
      const b = verts[(j + 1) % 3];
      const ka = hashKey(a);
      const kb = hashKey(b);
      const key = ka < kb ? `${ka}#${kb}` : `${kb}#${ka}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
      edgeVerts.set(key, [a, b]);
    }
  }

  const adjacency = new Map<string, string[]>();
  const keyVert = new Map<string, THREE.Vector3>();
  for (const [key, count] of edgeCount) {
    if (count !== 1) continue;
    const [a, b] = edgeVerts.get(key)!;
    const ka = hashKey(a);
    const kb = hashKey(b);
    keyVert.set(ka, a);
    keyVert.set(kb, b);
    if (!adjacency.has(ka)) adjacency.set(ka, []);
    if (!adjacency.has(kb)) adjacency.set(kb, []);
    adjacency.get(ka)!.push(kb);
    adjacency.get(kb)!.push(ka);
  }

  const visited = new Set<string>();
  const capVerts: number[] = [];
  for (const startKey of adjacency.keys()) {
    if (visited.has(startKey)) continue;
    const loop: THREE.Vector3[] = [];
    let cur = startKey;
    let prev = '';
    while (!visited.has(cur)) {
      visited.add(cur);
      loop.push(keyVert.get(cur)!);
      const neighbors = adjacency.get(cur) ?? [];
      const next = neighbors.find((candidate) => candidate !== prev && !visited.has(candidate));
      if (!next) break;
      prev = cur;
      cur = next;
    }
    if (loop.length < 3) continue;
    const cen = loop.reduce((acc, point) => acc.clone().add(point)).divideScalar(loop.length);
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i];
      const b = loop[(i + 1) % loop.length];
      capVerts.push(cen.x, cen.y, cen.z, b.x, b.y, b.z, a.x, a.y, a.z);
    }
  }

  const combined = new Float32Array(existingVerts.length + capVerts.length);
  combined.set(existingVerts);
  combined.set(capVerts, existingVerts.length);
  const newGeom = new THREE.BufferGeometry();
  newGeom.setAttribute('position', new THREE.BufferAttribute(combined, 3));
  newGeom.computeVertexNormals();
  const result = new THREE.Mesh(newGeom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function smoothMesh(mesh: THREE.Mesh, iterations: number, factor = 0.5): THREE.Mesh {
  const geom = mesh.geometry.clone().toNonIndexed();
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const count = pos.count;
  const neighbors = new Map<number, Set<number>>();
  for (let i = 0; i < count; i++) neighbors.set(i, new Set());
  for (let i = 0; i < count; i += 3) {
    const [a, b, c] = [i, i + 1, i + 2];
    neighbors.get(a)!.add(b); neighbors.get(a)!.add(c);
    neighbors.get(b)!.add(a); neighbors.get(b)!.add(c);
    neighbors.get(c)!.add(a); neighbors.get(c)!.add(b);
  }
  const arr = pos.array as Float32Array;
  for (let iter = 0; iter < iterations; iter++) {
    const newPos = arr.slice();
    for (let i = 0; i < count; i++) {
      const nbrs = [...neighbors.get(i)!];
      if (nbrs.length === 0) continue;
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (const nn of nbrs) {
        sx += arr[nn * 3];
        sy += arr[nn * 3 + 1];
        sz += arr[nn * 3 + 2];
      }
      sx /= nbrs.length;
      sy /= nbrs.length;
      sz /= nbrs.length;
      newPos[i * 3] = arr[i * 3] + factor * (sx - arr[i * 3]);
      newPos[i * 3 + 1] = arr[i * 3 + 1] + factor * (sy - arr[i * 3 + 1]);
      newPos[i * 3 + 2] = arr[i * 3 + 2] + factor * (sz - arr[i * 3 + 2]);
    }
    arr.set(newPos);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function meshSectionSketch(mesh: THREE.Mesh, plane: THREE.Plane): THREE.Vector3[][] {
  const geom = mesh.geometry.toNonIndexed();
  geom.applyMatrix4(mesh.matrixWorld);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const segments: [THREE.Vector3, THREE.Vector3][] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const verts = [
      new THREE.Vector3().fromBufferAttribute(pos, i),
      new THREE.Vector3().fromBufferAttribute(pos, i + 1),
      new THREE.Vector3().fromBufferAttribute(pos, i + 2),
    ];
    const dists = verts.map((v) => plane.distanceToPoint(v));
    const crossings: THREE.Vector3[] = [];
    for (let j = 0; j < 3; j++) {
      const a = verts[j];
      const b = verts[(j + 1) % 3];
      const da = dists[j];
      const db = dists[(j + 1) % 3];
      if (da * db < 0) {
        crossings.push(a.clone().lerp(b, da / (da - db)));
      } else if (Math.abs(da) < 1e-6) {
        crossings.push(a.clone());
      }
    }
    if (crossings.length >= 2) segments.push([crossings[0], crossings[1]]);
  }
  return segments.map(([a, b]) => [a, b]);
}

export function createRib(
  profilePoints: THREE.Vector3[],
  thickness: number,
  height: number,
  normal: THREE.Vector3,
): THREE.Mesh {
  const n = normal.clone().normalize();
  const verts: number[] = [];

  for (let i = 0; i + 1 < profilePoints.length; i++) {
    const p0 = profilePoints[i];
    const p1 = profilePoints[i + 1];
    const dir = p1.clone().sub(p0).normalize();
    const side = new THREE.Vector3().crossVectors(dir, n).normalize().multiplyScalar(thickness / 2);
    const up = n.clone().multiplyScalar(height);

    const corners = [
      p0.clone().sub(side),
      p0.clone().add(side),
      p1.clone().add(side),
      p1.clone().sub(side),
      p0.clone().sub(side).add(up),
      p0.clone().add(side).add(up),
      p1.clone().add(side).add(up),
      p1.clone().sub(side).add(up),
    ];

    const faces = [[0, 1, 2, 0, 2, 3], [4, 6, 5, 4, 7, 6], [0, 4, 5, 0, 5, 1], [2, 6, 7, 2, 7, 3], [0, 3, 7, 0, 7, 4], [1, 5, 6, 1, 6, 2]];
    for (const face of faces) {
      for (const idx of face) verts.push(corners[idx].x, corners[idx].y, corners[idx].z);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4 }));
}

export function createWeb(
  entityPoints: THREE.Vector3[][],
  thickness: number,
  height: number,
  normal: THREE.Vector3,
): THREE.Mesh {
  const allVerts: number[] = [];
  for (const pts of entityPoints) {
    if (pts.length < 2) continue;
    const ribMesh = createRib(pts, thickness, height, normal);
    const pos = ribMesh.geometry.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    for (let i = 0; i < arr.length; i++) allVerts.push(arr[i]);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(allVerts), 3));
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4 }));
}

export function createRest(
  centerX: number,
  centerY: number,
  centerZ: number,
  normalX: number,
  normalY: number,
  normalZ: number,
  width: number,
  depth: number,
  thickness: number,
): THREE.Mesh {
  const baseGeom = new THREE.BoxGeometry(width, thickness, depth);
  const normal = new THREE.Vector3(normalX, normalY, normalZ).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  const mesh = new THREE.Mesh(baseGeom, new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4 }));
  mesh.position.set(centerX, centerY, centerZ);
  mesh.quaternion.copy(quat);
  mesh.updateMatrixWorld(true);
  const geom = baseGeom.clone();
  geom.applyMatrix4(mesh.matrixWorld);
  geom.computeVertexNormals();
  return new THREE.Mesh(geom, new THREE.MeshPhysicalMaterial({ color: 0x8899aa, metalness: 0.3, roughness: 0.4 }));
}

export function createCosmeticThread(radius: number, pitch: number, length: number, turns?: number): THREE.BufferGeometry {
  const n = turns ?? Math.ceil(length / pitch);
  const stepsPerTurn = 64;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= n * stepsPerTurn; i++) {
    const t = i / stepsPerTurn;
    const angle = t * Math.PI * 2;
    const y = (i / (n * stepsPerTurn)) * length;
    points.push(new THREE.Vector3(radius * Math.cos(angle), y, radius * Math.sin(angle)));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

export function patternOnPath(mesh: THREE.Mesh, pathPoints: THREE.Vector3[], count: number): THREE.Mesh[] {
  if (pathPoints.length < 2 || count < 2) return [];
  const results: THREE.Mesh[] = [];
  const arcLens = [0];
  for (let i = 1; i < pathPoints.length; i++) {
    arcLens.push(arcLens[i - 1] + pathPoints[i].distanceTo(pathPoints[i - 1]));
  }
  const total = arcLens[arcLens.length - 1];

  for (let k = 0; k < count; k++) {
    const targetLen = count > 1 ? (k / (count - 1)) * total : 0;
    let seg = 0;
    for (let i = 1; i < arcLens.length; i++) {
      if (arcLens[i] >= targetLen) { seg = i - 1; break; }
    }
    const segT = arcLens[seg + 1] > arcLens[seg]
      ? (targetLen - arcLens[seg]) / (arcLens[seg + 1] - arcLens[seg])
      : 0;
    const pos = pathPoints[seg].clone().lerp(pathPoints[Math.min(seg + 1, pathPoints.length - 1)], segT);
    const tangent = pathPoints[Math.min(seg + 1, pathPoints.length - 1)].clone().sub(pathPoints[seg]).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    const geom = mesh.geometry.clone();
    const matrix = new THREE.Matrix4().compose(pos, quat, new THREE.Vector3(1, 1, 1));
    geom.applyMatrix4(matrix);
    const copy = new THREE.Mesh(geom, mesh.material);
    copy.userData = { ...mesh.userData };
    results.push(copy);
  }
  return results;
}

export function remesh(mesh: THREE.Mesh, mode: 'refine' | 'coarsen', iterations: number): THREE.Mesh {
  if (mode === 'refine') {
    let geom = mesh.geometry.clone().toNonIndexed();
    for (let iter = 0; iter < iterations; iter++) {
      const pos = geom.attributes.position as THREE.BufferAttribute;
      const newVerts: number[] = [];
      for (let i = 0; i < pos.count; i += 3) {
        const a = new THREE.Vector3().fromBufferAttribute(pos, i);
        const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
        const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
        const ab = a.clone().add(b).multiplyScalar(0.5);
        const bc = b.clone().add(c).multiplyScalar(0.5);
        const ca = c.clone().add(a).multiplyScalar(0.5);
        for (const [x, y, z] of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]] as [THREE.Vector3, THREE.Vector3, THREE.Vector3][]) {
          newVerts.push(x.x, x.y, x.z, y.x, y.y, y.z, z.x, z.y, z.z);
        }
      }
      geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newVerts), 3));
    }
    geom.computeVertexNormals();
    const result = new THREE.Mesh(geom, mesh.material);
    result.userData = { ...mesh.userData };
    return result;
  }

  const srcNI = mesh.geometry.clone();
  const merged = srcNI.index ? srcNI : mergeVertices(srcNI, 1e-4);
  if (!srcNI.index) srcNI.dispose();
  const modifier = new SimplifyModifier();
  let cur = merged;
  for (let iter = 0; iter < iterations; iter++) {
    const pos = cur.attributes.position as THREE.BufferAttribute;
    const vertCount = pos.count;
    const remove = Math.max(0, Math.min(vertCount - 60, Math.floor(vertCount * 0.2)));
    if (remove < 3) break;
    const next = modifier.modify(cur, remove);
    if (cur !== merged) cur.dispose();
    cur = next;
  }
  cur.computeVertexNormals();
  if (cur === merged) {
    const result = new THREE.Mesh(cur, mesh.material);
    result.userData = { ...mesh.userData };
    return result;
  }
  merged.dispose();
  const result = new THREE.Mesh(cur, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function shellMesh(
  mesh: THREE.Mesh,
  thickness: number,
  direction: 'inward' | 'outward' | 'symmetric',
): THREE.Mesh {
  const inwardDist = direction === 'outward' ? 0 : -thickness;
  let outerGeom = mesh.geometry.clone();
  outerGeom.applyMatrix4(mesh.matrixWorld);
  outerGeom.deleteAttribute('normal');
  outerGeom = mergeVertices(outerGeom, 1e-4);
  outerGeom.computeVertexNormals();

  const innerGeom = outerGeom.clone();
  const innerPos = innerGeom.attributes.position as THREE.BufferAttribute;
  const innerNorm = innerGeom.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < innerPos.count; i++) {
    const nx = innerNorm.getX(i);
    const ny = innerNorm.getY(i);
    const nz = innerNorm.getZ(i);
    innerPos.setXYZ(
      i,
      innerPos.getX(i) + nx * inwardDist,
      innerPos.getY(i) + ny * inwardDist,
      innerPos.getZ(i) + nz * inwardDist,
    );
  }
  innerPos.needsUpdate = true;

  if (innerGeom.index) {
    const idx = innerGeom.index;
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i + 1);
      idx.setX(i + 1, idx.getX(i + 2));
      idx.setX(i + 2, a);
    }
    idx.needsUpdate = true;
  }
  innerGeom.computeVertexNormals();

  const outerNI = outerGeom.toNonIndexed();
  const innerNI = innerGeom.toNonIndexed();
  outerGeom.dispose();
  innerGeom.dispose();
  const outerArr = outerNI.attributes.position.array as Float32Array;
  const innerArr = innerNI.attributes.position.array as Float32Array;
  const combined = new Float32Array(outerArr.length + innerArr.length);
  combined.set(outerArr, 0);
  combined.set(innerArr, outerArr.length);
  outerNI.dispose();
  innerNI.dispose();
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(combined, 3));
  geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function draftMesh(
  mesh: THREE.Mesh,
  pullAxisDir: THREE.Vector3,
  draftAngle: number,
  fixedPlaneY = 0,
): THREE.Mesh {
  const geom = mesh.geometry.clone().toNonIndexed();
  geom.applyMatrix4(mesh.matrixWorld);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const axis = pullAxisDir.clone().normalize();
  const tanAngle = Math.tan(draftAngle * Math.PI / 180);

  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i);
    const height = v.dot(axis) - fixedPlaneY;
    if (Math.abs(height) < 1e-6) continue;
    const axisComponent = axis.clone().multiplyScalar(v.dot(axis));
    const radial = v.clone().sub(axisComponent);
    const radialLen = radial.length();
    if (radialLen < 1e-8) continue;
    const radialDir = radial.divideScalar(radialLen);
    const offset = height * tanAngle;
    pos.setXYZ(
      i,
      v.x + radialDir.x * offset,
      v.y + radialDir.y * offset,
      v.z + radialDir.z * offset,
    );
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, mesh.material);
  result.userData = { ...mesh.userData };
  return result;
}

export function removeFaceAndHeal(
  mesh: THREE.Mesh,
  faceNormal: THREE.Vector3,
  faceCentroid: THREE.Vector3,
  normalTolRad = 2 * Math.PI / 180,
): THREE.Mesh {
  const geom = mesh.geometry.clone().toNonIndexed();
  geom.applyMatrix4(mesh.matrixWorld);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const normal = faceNormal.clone().normalize();
  const cosMin = Math.cos(normalTolRad);
  if (!geom.boundingSphere) geom.computeBoundingSphere();
  const planeTol = Math.max(0.01, (geom.boundingSphere?.radius ?? 1) * 0.02);
  const planeOffset = normal.dot(faceCentroid);

  const keptVerts: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const triN = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const triCen = a.clone().add(b).add(c).divideScalar(3);
    const sameNormal = triN.dot(normal) > cosMin;
    const samePlane = Math.abs(normal.dot(triCen) - planeOffset) < planeTol;
    if (sameNormal && samePlane) continue;
    keptVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }

  const tempGeom = new THREE.BufferGeometry();
  tempGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keptVerts), 3));
  const tempMesh = new THREE.Mesh(tempGeom, mesh.material);
  return makeClosedMesh(tempMesh);
}

export function alignMeshToCentroid(sourceMesh: THREE.Mesh, targetMesh: THREE.Mesh): THREE.Mesh {
  const srcBox = new THREE.Box3().setFromObject(sourceMesh);
  const tgtBox = new THREE.Box3().setFromObject(targetMesh);
  const srcCen = new THREE.Vector3();
  const tgtCen = new THREE.Vector3();
  srcBox.getCenter(srcCen);
  tgtBox.getCenter(tgtCen);
  const offset = tgtCen.sub(srcCen);
  const geom = sourceMesh.geometry.clone();
  geom.applyMatrix4(sourceMesh.matrixWorld);
  geom.translate(offset.x, offset.y, offset.z);
  geom.computeVertexNormals();
  const result = new THREE.Mesh(geom, sourceMesh.material);
  result.userData = { ...sourceMesh.userData };
  return result;
}
