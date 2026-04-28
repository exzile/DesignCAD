import { describe, expect, it } from 'vitest';

import { shouldDemoteSupportInterface, supportDensityForLayer } from './support';

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
