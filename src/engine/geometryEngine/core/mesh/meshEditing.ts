import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';
import { makeClosedMesh as makeClosedMeshOp } from '../../operations/meshOps';

export function remesh(
  mesh: THREE.Mesh,
  mode: 'refine' | 'coarsen',
  iterations: number,
): THREE.Mesh {
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
        for (const [x, y, z] of [[a, ab, ca], [ab, b, bc], [ca, bc, c], [ab, bc, ca]] as [
          THREE.Vector3,
          THREE.Vector3,
          THREE.Vector3,
        ][]) {
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

export function removeFaceAndHeal(
  mesh: THREE.Mesh,
  faceNormal: THREE.Vector3,
  faceCentroid: THREE.Vector3,
  normalTolRad: number = (2 * Math.PI) / 180,
): THREE.Mesh {
  const geom = mesh.geometry.clone().toNonIndexed();
  geom.applyMatrix4(mesh.matrixWorld);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const n = faceNormal.clone().normalize();
  const cosMin = Math.cos(normalTolRad);
  if (!geom.boundingSphere) geom.computeBoundingSphere();
  const planeTol = Math.max(0.01, (geom.boundingSphere?.radius ?? 1) * 0.02);
  const planeOffset = n.dot(faceCentroid);

  const keptVerts: number[] = [];
  for (let i = 0; i < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2);
    const triN = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).normalize();
    const triCen = a.clone().add(b).add(c).divideScalar(3);
    const sameNormal = triN.dot(n) > cosMin;
    const samePlane = Math.abs(n.dot(triCen) - planeOffset) < planeTol;
    if (sameNormal && samePlane) continue;
    keptVerts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }

  const tempGeom = new THREE.BufferGeometry();
  tempGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(keptVerts), 3));
  const tempMesh = new THREE.Mesh(tempGeom, mesh.material);
  return makeClosedMeshOp(tempMesh);
}
