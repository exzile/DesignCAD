import { describe, expect, it } from 'vitest';

import {
  shouldExpandSkinForRegion,
  skinRemovalWidthForLayer,
  skipSkinForSmallRegion,
  solidSkinCenterlineInset,
} from './emitContourInfill';

describe('skinRemovalWidthForLayer', () => {
  it('uses the generic skin removal width by default', () => {
    expect(skinRemovalWidthForLayer({ skinRemovalWidth: 0.2 }, false, false)).toBe(0.2);
  });

  it('lets top skin removal width override the generic value', () => {
    expect(skinRemovalWidthForLayer({
      skinRemovalWidth: 0.2,
      topSkinRemovalWidth: 0.45,
    }, true, false)).toBe(0.45);
  });

  it('lets bottom skin removal width override the generic value', () => {
    expect(skinRemovalWidthForLayer({
      skinRemovalWidth: 0.2,
      bottomSkinRemovalWidth: 0.35,
    }, false, true)).toBe(0.35);
  });

  it('falls back to zero when no skin removal width is configured', () => {
    expect(skinRemovalWidthForLayer({}, true, false)).toBe(0);
  });
});

describe('solidSkinCenterlineInset', () => {
  it('subtracts Orca-style skin overlap from the half-width centerline inset', () => {
    expect(solidSkinCenterlineInset(0.45, 0.1035)).toBeCloseTo(0.1215, 6);
  });

  it('does not allow overlap to push the centerline inset negative', () => {
    expect(solidSkinCenterlineInset(0.45, 0.4)).toBe(0);
  });
});

describe('skipSkinForSmallRegion (Cura: Small Top/Bottom Width)', () => {
  const wide = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const narrow = { minX: 0, maxX: 10, minY: 0, maxY: 0.5 };
  const tiny = { minX: 0, maxX: 0.4, minY: 0, maxY: 0.4 };

  it('keeps skin emission when the threshold is unset', () => {
    expect(skipSkinForSmallRegion(wide, undefined)).toBe(false);
    expect(skipSkinForSmallRegion(tiny, undefined)).toBe(false);
  });

  it('keeps skin emission when the threshold is zero', () => {
    expect(skipSkinForSmallRegion(tiny, 0)).toBe(false);
  });

  it('keeps skin emission when both bbox dimensions exceed the threshold', () => {
    expect(skipSkinForSmallRegion(wide, 1.0)).toBe(false);
  });

  it('skips skin when the smaller bbox dimension is below the threshold', () => {
    expect(skipSkinForSmallRegion(narrow, 1.0)).toBe(true);
  });

  it('skips skin when both bbox dimensions are below the threshold', () => {
    expect(skipSkinForSmallRegion(tiny, 1.0)).toBe(true);
  });

  it('uses the smaller dimension, not the larger, for the comparison', () => {
    // 10 mm long but only 0.5 mm wide — should be skipped at threshold 1.0
    expect(skipSkinForSmallRegion(narrow, 1.0)).toBe(true);
    // and kept at threshold 0.4
    expect(skipSkinForSmallRegion(narrow, 0.4)).toBe(false);
  });
});

describe('shouldExpandSkinForRegion (Cura: Minimum Skin Width for Expansion)', () => {
  const wide = { minX: 0, maxX: 10, minY: 0, maxY: 10 };
  const narrow = { minX: 0, maxX: 10, minY: 0, maxY: 0.5 };
  const tiny = { minX: 0, maxX: 0.4, minY: 0, maxY: 0.4 };

  it('always expands when threshold is unset', () => {
    expect(shouldExpandSkinForRegion(wide, undefined)).toBe(true);
    expect(shouldExpandSkinForRegion(tiny, undefined)).toBe(true);
  });

  it('always expands when threshold is zero', () => {
    expect(shouldExpandSkinForRegion(tiny, 0)).toBe(true);
  });

  it('expands when both bbox dimensions meet the threshold', () => {
    expect(shouldExpandSkinForRegion(wide, 1.0)).toBe(true);
  });

  it('skips expansion when the smaller bbox dimension is below the threshold', () => {
    expect(shouldExpandSkinForRegion(narrow, 1.0)).toBe(false);
  });

  it('skips expansion when both dimensions are below the threshold', () => {
    expect(shouldExpandSkinForRegion(tiny, 1.0)).toBe(false);
  });

  it('boundary: equal-to threshold expands (>=, not >)', () => {
    const exact = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    expect(shouldExpandSkinForRegion(exact, 1.0)).toBe(true);
  });
});
