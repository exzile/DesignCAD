import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { sortSolidSkinLinesForEmission } from './emitContourInfill';

function line(from: [number, number], to: [number, number]) {
  return {
    from: new THREE.Vector2(...from),
    to: new THREE.Vector2(...to),
  };
}

describe('sortSolidSkinLinesForEmission', () => {
  it('keeps first-layer skin transitions on the nearest adjacent segment before crossing a hole', () => {
    const sorted = sortSolidSkinLinesForEmission([
      line([0, 0], [5, 0]),
      line([15, 0], [20, 0]),
      line([0, 1], [5, 1]),
      line([15, 1], [20, 1]),
    ], 0.45, { x: 0, y: 0 });

    expect(sorted.map((segment) => [
      [segment.from.x, segment.from.y],
      [segment.to.x, segment.to.y],
    ])).toEqual([
      [[0, 0], [5, 0]],
      [[5, 1], [0, 1]],
      [[15, 1], [20, 1]],
      [[20, 0], [15, 0]],
    ]);
  });
});
