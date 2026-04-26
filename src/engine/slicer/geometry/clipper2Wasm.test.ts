import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { offsetPathsClipper2 } from './clipper2Wasm';

const v = (x: number, y: number) => new THREE.Vector2(x, y);

describe('Clipper2 WASM adapter', () => {
  it('inflates a square through the WASM module', async () => {
    const result = await offsetPathsClipper2([
      [v(0, 0), v(10, 0), v(10, 10), v(0, 10)],
    ], 1, { joinType: 'miter' });

    expect(result.length).toBeGreaterThan(0);
    const xs = result.flat().map((point) => point.x);
    const ys = result.flat().map((point) => point.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(-0.99);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(10.99);
    expect(Math.min(...ys)).toBeLessThanOrEqual(-0.99);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(10.99);
  });
});
