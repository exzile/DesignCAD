import * as THREE from 'three';

type JoinType = 'miter' | 'square' | 'round';

interface Clipper2Module {
  HEAPF64: Float64Array;
  HEAP32: Int32Array;
  _malloc(size: number): number;
  _free(ptr: number): void;
  _clipperAnswer(): number;
  _offsetPaths(
    pointsPtr: number,
    pathCountsPtr: number,
    pathCount: number,
    delta: number,
    joinType: number,
    miterLimit: number,
    arcTolerance: number,
    precision: number,
  ): number;
  _getOffsetCounts(outPtr: number): void;
  _emitOffsetPathCounts(outPtr: number, capacityInts: number): number;
  _emitOffsetPoints(outPtr: number, capacityDoubles: number): number;
  _resetOffsetPaths(): void;
}

let modulePromise: Promise<Clipper2Module> | null = null;

function joinTypeToInt(joinType: JoinType): number {
  if (joinType === 'square') return 1;
  if (joinType === 'round') return 2;
  return 0;
}

async function loadModule(): Promise<Clipper2Module> {
  if (modulePromise) return modulePromise;
  modulePromise = (async () => {
    const factory = (await import('../../../../wasm/dist/clipper2.js')).default;
    const factoryOpts: { wasmBinary?: ArrayBuffer; locateFile?(path: string): string } = {};
    const maybeProcess = (globalThis as { process?: { versions?: { node?: string } } }).process;
    if (maybeProcess?.versions?.node) {
      const nodePrefix = 'node';
      const fs = await import(`${nodePrefix}:fs/promises`);
      const url = await import(`${nodePrefix}:url`);
      const path = await import(`${nodePrefix}:path`);
      const here = path.dirname(url.fileURLToPath(import.meta.url));
      const wasmPath = path.resolve(here, '../../../../wasm/dist/clipper2.wasm');
      const buf = await fs.readFile(wasmPath);
      factoryOpts.wasmBinary = buf.buffer.slice(
        buf.byteOffset,
        buf.byteOffset + buf.byteLength,
      ) as ArrayBuffer;
    }

    const mod: Clipper2Module = await factory(factoryOpts);
    if (typeof mod._clipperAnswer !== 'function' || mod._clipperAnswer() !== 1) {
      throw new Error('clipper2Wasm: module loaded but _clipperAnswer() check failed');
    }
    return mod;
  })();
  return modulePromise;
}

export async function offsetPathsClipper2(
  paths: THREE.Vector2[][],
  delta: number,
  options: {
    joinType?: JoinType;
    miterLimit?: number;
    arcTolerance?: number;
    precision?: number;
  } = {},
): Promise<THREE.Vector2[][]> {
  const mod = await loadModule();
  const validPaths = paths.filter((path) => path.length >= 3);
  if (validPaths.length === 0) return [];

  const totalPoints = validPaths.reduce((sum, path) => sum + path.length, 0);
  const pointsPtr = mod._malloc(totalPoints * 2 * 8);
  const countsPtr = mod._malloc(validPaths.length * 4);
  if (!pointsPtr || !countsPtr) {
    if (pointsPtr) mod._free(pointsPtr);
    if (countsPtr) mod._free(countsPtr);
    throw new Error('clipper2Wasm: malloc failed for input buffers');
  }

  try {
    const points = new Float64Array(mod.HEAPF64.buffer, pointsPtr, totalPoints * 2);
    const counts = new Int32Array(mod.HEAP32.buffer, countsPtr, validPaths.length);
    let pointOffset = 0;
    validPaths.forEach((path, pathIndex) => {
      counts[pathIndex] = path.length;
      for (const point of path) {
        points[pointOffset++] = point.x;
        points[pointOffset++] = point.y;
      }
    });

    const status = mod._offsetPaths(
      pointsPtr,
      countsPtr,
      validPaths.length,
      delta,
      joinTypeToInt(options.joinType ?? 'miter'),
      options.miterLimit ?? 2,
      options.arcTolerance ?? 0,
      options.precision ?? 3,
    );
    if (status !== 0) throw new Error(`clipper2Wasm: _offsetPaths returned ${status}`);

    const outCountsPtr = mod._malloc(2 * 4);
    if (!outCountsPtr) throw new Error('clipper2Wasm: malloc failed for output counts');
    let outputPathCount = 0;
    let outputPointCount = 0;
    try {
      mod._getOffsetCounts(outCountsPtr);
      const outCounts = new Int32Array(mod.HEAP32.buffer, outCountsPtr, 2);
      outputPathCount = outCounts[0];
      outputPointCount = outCounts[1];
    } finally {
      mod._free(outCountsPtr);
    }
    if (outputPathCount === 0 || outputPointCount === 0) return [];

    const outputCountsPtr = mod._malloc(outputPathCount * 4);
    const outputPointsPtr = mod._malloc(outputPointCount * 2 * 8);
    if (!outputCountsPtr || !outputPointsPtr) {
      if (outputCountsPtr) mod._free(outputCountsPtr);
      if (outputPointsPtr) mod._free(outputPointsPtr);
      throw new Error('clipper2Wasm: malloc failed for output buffers');
    }

    try {
      if (mod._emitOffsetPathCounts(outputCountsPtr, outputPathCount) < 0) {
        throw new Error('clipper2Wasm: _emitOffsetPathCounts capacity mismatch');
      }
      if (mod._emitOffsetPoints(outputPointsPtr, outputPointCount * 2) < 0) {
        throw new Error('clipper2Wasm: _emitOffsetPoints capacity mismatch');
      }

      const outputCounts = new Int32Array(mod.HEAP32.buffer, outputCountsPtr, outputPathCount);
      const outputPoints = new Float64Array(mod.HEAPF64.buffer, outputPointsPtr, outputPointCount * 2);
      const result: THREE.Vector2[][] = [];
      let offset = 0;
      for (let pathIndex = 0; pathIndex < outputPathCount; pathIndex++) {
        const count = outputCounts[pathIndex];
        const path: THREE.Vector2[] = [];
        for (let i = 0; i < count; i++) {
          path.push(new THREE.Vector2(outputPoints[offset++], outputPoints[offset++]));
        }
        if (path.length >= 3) result.push(path);
      }
      return result;
    } finally {
      mod._free(outputCountsPtr);
      mod._free(outputPointsPtr);
    }
  } finally {
    mod._free(pointsPtr);
    mod._free(countsPtr);
    mod._resetOffsetPaths();
  }
}
