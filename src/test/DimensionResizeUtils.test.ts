import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { applyDimensionResize } from '../engine/dimensionResizeUtils';
import type { Sketch, SketchDimension, SketchEntity } from '../types/cad';

const mkSketch = (entities: SketchEntity[], dimensions: SketchDimension[] = []): Sketch => ({
  id: 'dimension-resize-sketch',
  name: 'Dimension resize sketch',
  plane: 'XY',
  planeNormal: new THREE.Vector3(0, 1, 0),
  planeOrigin: new THREE.Vector3(0, 0, 0),
  entities,
  constraints: [],
  dimensions,
  fullyConstrained: false,
});

describe('applyDimensionResize', () => {
  it('resizes point-to-point linear dimensions that use vertex references', () => {
    const line: SketchEntity = {
      id: 'line-a',
      type: 'line',
      points: [
        { id: 'line-a-start', x: 0, y: 0, z: 0 },
        { id: 'line-a-end', x: 5, y: 0, z: 0 },
      ],
    };
    const dimension: SketchDimension = {
      id: 'dim-line-a',
      type: 'linear',
      entityIds: ['line-a::vertex:0', 'line-a::vertex:1'],
      value: 12,
      position: { x: 6, y: 2 },
      driven: false,
      orientation: 'horizontal',
    };

    const [resizedLine] = applyDimensionResize(mkSketch([line], [dimension]), dimension, 12);

    expect(resizedLine?.points[0]).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(resizedLine?.points[1]).toMatchObject({ x: 12, y: 0, z: 0 });
  });

  it('keeps the measured direction for aligned point dimensions', () => {
    const line: SketchEntity = {
      id: 'line-b',
      type: 'line',
      points: [
        { id: 'line-b-start', x: 0, y: 0, z: 0 },
        { id: 'line-b-end', x: 3, y: 0, z: -4 },
      ],
    };
    const dimension: SketchDimension = {
      id: 'dim-line-b',
      type: 'aligned',
      entityIds: ['line-b::vertex:0', 'line-b::vertex:1'],
      value: 10,
      position: { x: 5, y: 5 },
      driven: false,
    };

    const [resizedLine] = applyDimensionResize(mkSketch([line], [dimension]), dimension, 10);

    expect(resizedLine?.points[0]).toMatchObject({ x: 0, y: 0, z: 0 });
    expect(resizedLine?.points[1]?.x).toBeCloseTo(6);
    expect(resizedLine?.points[1]?.y).toBeCloseTo(0);
    expect(resizedLine?.points[1]?.z).toBeCloseTo(-8);
  });
});
