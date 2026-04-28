import { describe, expect, it } from 'vitest';
import * as THREE from 'three';

import {
  findSolidSkinContourConnectorPath,
  solidSkinConnectorLinkLimit,
  sortSolidSkinLinesForEmission,
} from './emitContourInfill';

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

  it('prefers a printable neighboring transition over a closer transition that would become travel', () => {
    const sorted = sortSolidSkinLinesForEmission([
      line([0, 0], [10, 0]),
      line([10.2, 0], [12, 0]),
      line([0, 7], [10, 7]),
    ], 0.45, { x: 0, y: 0 }, {
      canTransition: (_from, to) => to.y > 0.5,
    });

    expect(sorted.map((segment) => [
      [segment.from.x, segment.from.y],
      [segment.to.x, segment.to.y],
    ])).toEqual([
      [[0, 0], [10, 0]],
      [[10, 7], [0, 7]],
      [[10.2, 0], [12, 0]],
    ]);
  });
});

describe('findSolidSkinContourConnectorPath', () => {
  it('allows first-layer skin endpoints slightly off a hole boundary to contour-walk instead of travel', () => {
    const hole = [
      new THREE.Vector2(10, 8),
      new THREE.Vector2(12, 10),
      new THREE.Vector2(10, 12),
      new THREE.Vector2(8, 10),
    ];
    const outer = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(20, 0),
      new THREE.Vector2(20, 20),
      new THREE.Vector2(0, 20),
    ];

    const path = findSolidSkinContourConnectorPath(
      new THREE.Vector2(10.55, 8.05),
      new THREE.Vector2(12.05, 10.55),
      outer,
      [hole],
      0.45,
    );

    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(2);
  });
});

describe('solidSkinConnectorLinkLimit', () => {
  it('permits short neighboring first-layer skin links without opening long chords', () => {
    expect(solidSkinConnectorLinkLimit(0.45)).toBeCloseTo(1.4625);
  });
});
