import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import { variableWidthPathsToPerimeters } from '../index';

const v = (x: number, y: number) => new THREE.Vector2(x, y);

describe('Arachne pipeline integration', () => {
  it('keeps per-vertex line widths when converting paths to perimeters', () => {
    const perimeters = variableWidthPathsToPerimeters([
      {
        points: [v(0, 0), v(1, 0), v(1, 1)],
        widths: [0.3, 0.4, 0.5],
        depth: 0,
        isClosed: false,
        source: 'outer',
      },
      {
        points: [v(2, 0), v(2, 1)],
        widths: [0.6, 0.7],
        depth: 1,
        isClosed: false,
        source: 'gapfill',
      },
    ]);

    expect(perimeters.outerCount).toBe(1);
    expect(perimeters.lineWidths).toEqual([
      [0.3, 0.4, 0.5],
      [0.6, 0.7],
    ]);
    expect(perimeters.wallClosed).toEqual([false, false]);
    expect(perimeters.wallDepths).toEqual([0, 1]);
  });
});
