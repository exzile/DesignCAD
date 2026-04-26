// Unit tests for slice-result aggregation + issue detection.

import { describe, expect, it } from 'vitest';

import {
  computeSliceStats,
  detectPrintIssues,
  extractZSeamPoints,
  formatDuration,
} from './sliceStats';
import type { SliceMove, SliceResult } from '../../../../types/slicer';

const v = (x: number, y: number) => ({ x, y });

function makeMove(overrides: Partial<SliceMove>): SliceMove {
  return {
    type: 'wall-outer',
    from: v(0, 0),
    to: v(1, 0),
    speed: 60,
    extrusion: 0.05,
    lineWidth: 0.45,
    ...overrides,
  } as SliceMove;
}

function makeResult(layers: Array<{ z: number; layerTime: number; moves: SliceMove[] }>): SliceResult {
  return {
    layers: layers.map((l, i) => ({ ...l, layerIndex: i })),
    layerCount: layers.length,
    printTime: layers.reduce((s, l) => s + l.layerTime, 0),
    filamentUsed: 0, filamentWeight: 0, filamentCost: 0,
    gcode: '',
  } as unknown as SliceResult;
}

describe('computeSliceStats', () => {
  it('aggregates filament, path length, time, and per-feature breakdown', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 5, moves: [
        makeMove({ type: 'wall-outer', from: v(0, 0), to: v(10, 0), extrusion: 0.4, speed: 60 }),
        makeMove({ type: 'wall-inner', from: v(10, 0), to: v(20, 0), extrusion: 0.4, speed: 60 }),
        makeMove({ type: 'travel',     from: v(20, 0), to: v(0, 0),  extrusion: 0,   speed: 150 }),
        makeMove({ type: 'infill',     from: v(0, 0),  to: v(10, 0), extrusion: 0.4, speed: 60 }),
      ] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24, costPerKg: 25 });

    expect(stats.totalExtrudeMm).toBeCloseTo(30, 6);  // 3 × 10mm extrusion
    expect(stats.totalTravelMm).toBeCloseTo(20, 6);   // 1 × 20mm travel
    expect(stats.totalFilamentMm).toBeCloseTo(1.2, 6);

    expect(stats.byFeature['wall-outer']?.pathMm).toBeCloseTo(10, 6);
    expect(stats.byFeature['wall-inner']?.pathMm).toBeCloseTo(10, 6);
    expect(stats.byFeature.infill?.pathMm).toBeCloseTo(10, 6);
    expect(stats.byFeature['wall-outer']?.timeSec).toBeCloseTo(10 / 60, 6);

    // Filament length 1.2mm * filamentArea (1.75/2)²π ≈ 2.405 mm²
    //                = ~2.886 mm³ = 0.002886 cm³ × 1.24 g/cm³ = ~0.00358 g
    expect(stats.totalFilamentG).toBeCloseTo(0.00358, 4);
    // Cost = 0.00358g × $25/kg / 1000 = ~$0.00009
    expect(stats.estimatedCostUsd).toBeGreaterThan(0);
    expect(stats.estimatedCostUsd).toBeLessThan(0.01);
  });

  it('per-layer arrays are parallel to result.layers', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 1, moves: [makeMove({ extrusion: 0.1 })] },
      { z: 0.4, layerTime: 2, moves: [makeMove({ extrusion: 0.2 })] },
      { z: 0.6, layerTime: 3, moves: [makeMove({ extrusion: 0.3 })] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    expect(stats.perLayerFilamentMm).toEqual([0.1, 0.2, 0.3]);
    expect(stats.perLayerExtrudeMm.length).toBe(3);
  });

  it('cost is zero when costPerKg is unset', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 1, moves: [makeMove({ extrusion: 1.5 })] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    expect(stats.estimatedCostUsd).toBe(0);
  });
});

describe('detectPrintIssues', () => {
  it('flags long bridge segments', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 1, moves: [
        makeMove({ type: 'bridge', from: v(0, 0), to: v(15, 0) }), // 15mm bridge
      ] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    const issues = detectPrintIssues(result, stats, { bridgeWarnMm: 8 });
    expect(issues.some((i) => i.kind === 'long-bridge')).toBe(true);
    expect(issues.find((i) => i.kind === 'long-bridge')?.severity).toBe('warning');
  });

  it('flags thin Arachne walls', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 1, moves: [
        makeMove({ type: 'wall-outer', lineWidth: 0.15 }), // sub-min Arachne tail
      ] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    const issues = detectPrintIssues(result, stats, { thinWallMm: 0.25 });
    expect(issues.some((i) => i.kind === 'thin-wall')).toBe(true);
  });

  it('flags small first-layer footprint', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 1, moves: [
        // Tiny 4mm × 4mm = 16mm² footprint, well under 50mm² threshold.
        makeMove({ type: 'wall-outer', from: v(0, 0), to: v(4, 0) }),
        makeMove({ type: 'wall-outer', from: v(4, 0), to: v(4, 4) }),
        makeMove({ type: 'wall-outer', from: v(4, 4), to: v(0, 4) }),
        makeMove({ type: 'wall-outer', from: v(0, 4), to: v(0, 0) }),
      ] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    const issues = detectPrintIssues(result, stats);
    expect(issues.some((i) => i.kind === 'small-first-layer-contact')).toBe(true);
  });

  it('flags slow-layer outliers (only when ≥10 layers)', () => {
    const layers = Array.from({ length: 12 }, (_, i) => ({
      z: 0.2 * (i + 1),
      layerTime: i === 5 ? 30 : 5, // layer 5 is 6× slower
      moves: [makeMove({ extrusion: 0.1 })],
    }));
    const result = makeResult(layers);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    const issues = detectPrintIssues(result, stats);
    expect(issues.some((i) => i.kind === 'slow-layer' && i.layerIndex === 5)).toBe(true);
  });

  it('does not flag slow-layer for short prints (<10 layers)', () => {
    const layers = Array.from({ length: 5 }, (_, i) => ({
      z: 0.2 * (i + 1),
      layerTime: i === 2 ? 30 : 5,
      moves: [makeMove({ extrusion: 0.1 })],
    }));
    const result = makeResult(layers);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    const issues = detectPrintIssues(result, stats);
    expect(issues.some((i) => i.kind === 'slow-layer')).toBe(false);
  });

  it('flags high travel-ratio layers', () => {
    const result = makeResult([
      { z: 0.2, layerTime: 1, moves: [
        // 5mm extrude + 50mm travel = 91% travel
        makeMove({ type: 'infill', from: v(0, 0), to: v(5, 0), extrusion: 0.2 }),
        makeMove({ type: 'travel', from: v(5, 0), to: v(55, 0), extrusion: 0 }),
      ] },
    ]);
    const stats = computeSliceStats(result, { diameterMm: 1.75, densityGPerCm3: 1.24 });
    const issues = detectPrintIssues(result, stats, { highTravelRatio: 0.45 });
    expect(issues.some((i) => i.kind === 'high-travel-ratio')).toBe(true);
  });
});

describe('extractZSeamPoints', () => {
  it('returns the first wall-outer chain start point per chain', () => {
    const layer = {
      layerIndex: 0, z: 0.2, layerTime: 1,
      moves: [
        makeMove({ type: 'wall-outer', from: v(0, 0), to: v(1, 0) }),
        makeMove({ type: 'wall-outer', from: v(1, 0), to: v(2, 0) }),
        makeMove({ type: 'travel',     from: v(2, 0), to: v(5, 0) }),
        makeMove({ type: 'wall-outer', from: v(5, 0), to: v(6, 0) }),
        makeMove({ type: 'wall-inner', from: v(6, 0), to: v(7, 0) }),
        makeMove({ type: 'wall-outer', from: v(7, 0), to: v(8, 0) }),
      ] as SliceMove[],
    };
    const seams = extractZSeamPoints(layer);
    expect(seams).toEqual([v(0, 0), v(5, 0), v(7, 0)]);
  });

  it('returns empty array for layers with no wall-outer moves', () => {
    const layer = {
      layerIndex: 0, z: 0.2, layerTime: 1,
      moves: [makeMove({ type: 'infill' }), makeMove({ type: 'top-bottom' })] as SliceMove[],
    };
    expect(extractZSeamPoints(layer)).toEqual([]);
  });
});

describe('formatDuration', () => {
  it.each([
    [30, '30s'],
    [59, '59s'],
    [60, '1m 0s'],
    [125, '2m 5s'],
    [3600, '1h 0m'],
    [3725, '1h 2m'],
    [7384, '2h 3m'],
  ])('formats %d seconds → %s', (sec, expected) => {
    expect(formatDuration(sec)).toBe(expected);
  });
});
