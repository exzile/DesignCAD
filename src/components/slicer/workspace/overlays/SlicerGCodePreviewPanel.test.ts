import { describe, expect, it } from 'vitest';

import { parseGCodePreviewLines } from './gcodePreviewModel';

describe('parseGCodePreviewLines', () => {
  it('assigns lines to the current layer after layer marker comments', () => {
    const lines = parseGCodePreviewLines([
      '; header',
      'M104 S210',
      '; ----- Layer 0 -----',
      'G1 X1 Y1 E0.02 F900',
      'G1 X2 Y2 F9000',
      '; ----- Layer 1 -----',
      'M106 S255',
      'G1 X3 Y3 E0.04',
    ].join('\n'));

    expect(lines[0].layerIndex).toBeNull();
    expect(lines[1].command).toBe('M104');
    expect(lines[3]).toMatchObject({ layerIndex: 0, command: 'G1', isExtrusion: true });
    expect(lines[4]).toMatchObject({ layerIndex: 0, command: 'G1', isTravel: true });
    expect(lines[6]).toMatchObject({ layerIndex: 1, command: 'M106' });
    expect(lines[7]).toMatchObject({ layerIndex: 1, isExtrusion: true });
  });
});
