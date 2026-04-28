import { describe, expect, it } from 'vitest';

import {
  chunkStep,
  effectiveSupportXYDistance,
  shouldDemoteSupportInterface,
  shouldEmitSupportTower,
  supportDensityForLayer,
  towerRadiusForLayer,
} from './support';

describe('supportDensityForLayer', () => {
  it('uses the base support density after the first layer', () => {
    expect(supportDensityForLayer({
      supportDensity: 20,
      supportInfillDensityMultiplierInitialLayer: 200,
    }, 1)).toBe(20);
  });

  it('multiplies support density on the first layer', () => {
    expect(supportDensityForLayer({
      supportDensity: 20,
      supportInfillDensityMultiplierInitialLayer: 150,
    }, 0)).toBe(30);
  });

  it('defaults the first-layer multiplier to 100 percent', () => {
    expect(supportDensityForLayer({ supportDensity: 20 }, 0)).toBe(20);
  });

  it('clamps the effective density between 0 and 100 percent', () => {
    expect(supportDensityForLayer({
      supportDensity: 80,
      supportInfillDensityMultiplierInitialLayer: 200,
    }, 0)).toBe(100);
    expect(supportDensityForLayer({
      supportDensity: 20,
      supportInfillDensityMultiplierInitialLayer: -10,
    }, 0)).toBe(0);
  });
});

describe('shouldDemoteSupportInterface (Cura: Min Support Interface Area)', () => {
  // 4 mm² island (2 × 2)
  const small = { minX: 0, maxX: 2, minY: 0, maxY: 2 };
  // 100 mm² island (10 × 10)
  const large = { minX: 0, maxX: 10, minY: 0, maxY: 10 };

  it('keeps interface when threshold is unset', () => {
    expect(shouldDemoteSupportInterface(small, undefined)).toBe(false);
  });

  it('keeps interface when threshold is zero', () => {
    expect(shouldDemoteSupportInterface(small, 0)).toBe(false);
  });

  it('demotes interface when bbox area is below the threshold', () => {
    expect(shouldDemoteSupportInterface(small, 5)).toBe(true);
  });

  it('keeps interface when bbox area meets or exceeds the threshold', () => {
    expect(shouldDemoteSupportInterface(small, 4)).toBe(false);
    expect(shouldDemoteSupportInterface(large, 50)).toBe(false);
  });

  it('treats inverted bboxes as zero area (defensive)', () => {
    const inverted = { minX: 5, maxX: 0, minY: 5, maxY: 0 };
    expect(shouldDemoteSupportInterface(inverted, 1)).toBe(true);
  });
});

describe('shouldEmitSupportTower (Cura: Use Towers)', () => {
  // 2 mm × 2 mm island.
  const small = { minX: 0, maxX: 2, minY: 0, maxY: 2 };
  // 8 mm × 1 mm island — long but narrow.
  const long = { minX: 0, maxX: 8, minY: 0, maxY: 1 };
  // 5 mm × 5 mm island — too large for a 3 mm tower.
  const big = { minX: 0, maxX: 5, minY: 0, maxY: 5 };

  it('returns false when useTowers is off', () => {
    expect(shouldEmitSupportTower(small, false, 3)).toBe(false);
    expect(shouldEmitSupportTower(small, undefined, 3)).toBe(false);
  });

  it('returns false when towerDiameter is unset or zero', () => {
    expect(shouldEmitSupportTower(small, true, undefined)).toBe(false);
    expect(shouldEmitSupportTower(small, true, 0)).toBe(false);
  });

  it('emits a tower when the larger bbox dimension fits the tower diameter', () => {
    expect(shouldEmitSupportTower(small, true, 3)).toBe(true);
  });

  it('does NOT emit a tower when the larger bbox dimension exceeds the tower diameter', () => {
    expect(shouldEmitSupportTower(big, true, 3)).toBe(false);
    // Long-thin island: max dim is 8 mm — too long for a 3 mm tower.
    expect(shouldEmitSupportTower(long, true, 3)).toBe(false);
  });

  it('emits a tower exactly at the boundary (≤, not <)', () => {
    const exact = { minX: 0, maxX: 3, minY: 0, maxY: 3 };
    expect(shouldEmitSupportTower(exact, true, 3)).toBe(true);
  });
});

describe('towerRadiusForLayer (Cura: Tower Roof Flare)', () => {
  // Column radius 1.5 mm (towerDiameter 3); island radius 2.5 mm.
  const baseR = 1.5;
  const islandR = 2.5;
  const angle = 65; // Cura default

  it('returns baseRadius when island fits the column (no flare needed)', () => {
    expect(towerRadiusForLayer(2.0, 2.0, angle, 0)).toBe(2.0);
    expect(towerRadiusForLayer(2.0, 1.5, angle, 0)).toBe(2.0);
  });

  it('returns islandRadius at the very top of the flare (distFromTop = 0)', () => {
    expect(towerRadiusForLayer(baseR, islandR, angle, 0)).toBeCloseTo(islandR, 6);
  });

  it('returns baseRadius below the flare zone', () => {
    // flareHeight = (islandR - baseR) * tan(65°) ≈ 1.0 * 2.144 ≈ 2.144 mm
    expect(towerRadiusForLayer(baseR, islandR, angle, 5)).toBe(baseR);
  });

  it('linearly interpolates inside the flare zone', () => {
    // halfway up the flare → radius midway between baseR and islandR
    const flareHeight = (islandR - baseR) * Math.tan((angle * Math.PI) / 180);
    const mid = towerRadiusForLayer(baseR, islandR, angle, flareHeight / 2);
    expect(mid).toBeCloseTo((baseR + islandR) / 2, 6);
  });

  it('a steeper roof angle produces a taller flare (more pointed roof)', () => {
    // 80° flares over a much longer height than 30° at the same radii.
    const tall = (islandR - baseR) * Math.tan((80 * Math.PI) / 180);
    const short = (islandR - baseR) * Math.tan((30 * Math.PI) / 180);
    expect(tall).toBeGreaterThan(short);
    // At distFromTop just past the SHORT flare, the steep roof still
    // returns > baseR (still inside its flare zone), the shallow one returns baseR.
    const dz = short + 0.01;
    expect(towerRadiusForLayer(baseR, islandR, 30, dz)).toBe(baseR);
    expect(towerRadiusForLayer(baseR, islandR, 80, dz)).toBeGreaterThan(baseR);
  });

  it('defaults to the Cura roof angle (65°) when undefined', () => {
    const explicit = towerRadiusForLayer(baseR, islandR, 65, 1.0);
    const defaulted = towerRadiusForLayer(baseR, islandR, undefined, 1.0);
    expect(defaulted).toBeCloseTo(explicit, 6);
  });
});

describe('chunkStep (Cura: Break Up Support In Chunks)', () => {
  it('advances by spacing when chunking is disabled', () => {
    expect(chunkStep(2.0, 100, 5, 20, false)).toEqual({ advance: 2.0, resetCount: false });
    expect(chunkStep(2.0, 100, 5, 20, undefined)).toEqual({ advance: 2.0, resetCount: false });
  });

  it('advances by spacing when chunkLineCount is unset or zero', () => {
    expect(chunkStep(2.0, 100, undefined, 20, true)).toEqual({ advance: 2.0, resetCount: false });
    expect(chunkStep(2.0, 100, 0, 20, true)).toEqual({ advance: 2.0, resetCount: false });
  });

  it('advances by spacing when chunkSize is unset or zero', () => {
    expect(chunkStep(2.0, 100, 5, undefined, true)).toEqual({ advance: 2.0, resetCount: false });
    expect(chunkStep(2.0, 100, 5, 0, true)).toEqual({ advance: 2.0, resetCount: false });
  });

  it('advances by spacing while still building up the current chunk', () => {
    // 4 lines in, count is 5 — still inside the chunk
    expect(chunkStep(2.0, 4, 5, 20, true)).toEqual({ advance: 2.0, resetCount: false });
  });

  it('jumps the chunk gap once the line count is reached', () => {
    expect(chunkStep(2.0, 5, 5, 20, true)).toEqual({ advance: 20, resetCount: true });
  });

  it('resets the counter when the gap is taken (caller resets to 0)', () => {
    // After resetCount: true, caller sets linesInChunk = 0 and the very
    // next call should be back to spacing-advance.
    const first = chunkStep(2.0, 5, 5, 20, true);
    expect(first.resetCount).toBe(true);
    expect(chunkStep(2.0, 0, 5, 20, true)).toEqual({ advance: 2.0, resetCount: false });
  });

  it('keeps gapping every chunk-line-count after reset (sustained pattern)', () => {
    // Walk a 12-line emission with chunks of 3, gap of 5: lines 1,2,3 → gap → 4,5,6 → gap → ...
    let d = 0;
    let count = 0;
    const trace: number[] = [];
    for (let i = 0; i < 12; i++) {
      trace.push(d);
      count += 1;
      const step = chunkStep(1.0, count, 3, 5, true);
      d += step.advance;
      if (step.resetCount) count = 0;
    }
    // After every 3rd line we expect a +5 jump instead of +1.
    // d at line index i: cumulative advance up to but not including line i.
    // i=0: 0
    // i=1: 1 (after line 0 spacing)
    // i=2: 2
    // i=3: 7 (jump after line 2 = 3rd line)
    // i=4: 8
    // i=5: 9
    // i=6: 14 (jump)
    // i=7: 15
    // i=8: 16
    // i=9: 21 (jump)
    // i=10: 22
    // i=11: 23
    expect(trace).toEqual([0, 1, 2, 7, 8, 9, 14, 15, 16, 21, 22, 23]);
  });
});

describe('effectiveSupportXYDistance (Cura: Support Distance Priority)', () => {
  it('returns the user value when priority is xy_overrides_z (default)', () => {
    expect(effectiveSupportXYDistance(0.5, 'xy_overrides_z', false)).toBe(0.5);
    expect(effectiveSupportXYDistance(0.5, 'xy_overrides_z', true)).toBe(0.5);
  });

  it('returns the user value when priority is undefined', () => {
    expect(effectiveSupportXYDistance(0.7, undefined, true)).toBe(0.7);
  });

  it('keeps full XY distance on body layers regardless of priority', () => {
    // Body (non-interface) layers always get the full XY clearance —
    // there is no Z gap actively in play to take over.
    expect(effectiveSupportXYDistance(0.5, 'z_overrides_xy', false)).toBe(0.5);
  });

  it('relaxes XY distance to 0 on interface layers when priority is z_overrides_xy', () => {
    expect(effectiveSupportXYDistance(0.5, 'z_overrides_xy', true)).toBe(0);
  });

  it('still relaxes to 0 with unusual baseline values', () => {
    expect(effectiveSupportXYDistance(2.5, 'z_overrides_xy', true)).toBe(0);
    expect(effectiveSupportXYDistance(0, 'z_overrides_xy', true)).toBe(0);
  });
});
