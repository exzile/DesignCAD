import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, INTERSECTION, SUBTRACTION } from 'three-bvh-csg';

const csgEvaluator = new Evaluator();
csgEvaluator.useGroups = false;

function ensureUVs(geometry: THREE.BufferGeometry): void {
  if (geometry.attributes.uv) return;
  const count = (geometry.attributes.position as THREE.BufferAttribute).count;
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
}

export function csgSubtract(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  ensureUVs(a);
  ensureUVs(b);
  const brushA = new Brush(a);
  const brushB = new Brush(b);
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();
  const result = csgEvaluator.evaluate(brushA, brushB, SUBTRACTION);
  result.geometry.computeVertexNormals();
  return result.geometry;
}

export function csgUnion(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  ensureUVs(a);
  ensureUVs(b);
  const brushA = new Brush(a);
  const brushB = new Brush(b);
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();
  const result = csgEvaluator.evaluate(brushA, brushB, ADDITION);
  result.geometry.computeVertexNormals();
  return result.geometry;
}

export function csgIntersect(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  ensureUVs(a);
  ensureUVs(b);
  const brushA = new Brush(a);
  const brushB = new Brush(b);
  brushA.updateMatrixWorld();
  brushB.updateMatrixWorld();
  const result = csgEvaluator.evaluate(brushA, brushB, INTERSECTION);
  result.geometry.computeVertexNormals();
  return result.geometry;
}
