export interface GCodeLine {
  lineNumber: number;
  text: string;
  command: string;
  layerIndex: number | null;
  isComment: boolean;
  isExtrusion: boolean;
  isTravel: boolean;
}

const LAYER_MARKER = /^;\s*-+\s*Layer\s+(\d+)/i;

export function parseGCodePreviewLines(gcode: string): GCodeLine[] {
  let currentLayer: number | null = null;
  return gcode.split(/\r?\n/).map((raw, index) => {
    const text = raw.trimEnd();
    const trimmed = text.trimStart();
    const layerMatch = trimmed.match(LAYER_MARKER);
    if (layerMatch) currentLayer = Number(layerMatch[1]);
    const command = trimmed.split(/[;\s]/, 1)[0]?.toUpperCase() ?? '';
    const isComment = trimmed.startsWith(';') || command === '';
    const hasExtrusion = /\bE-?\d/.test(trimmed);
    const isMotion = command === 'G0' || command === 'G1';
    return {
      lineNumber: index + 1,
      text,
      command,
      layerIndex: currentLayer,
      isComment,
      isExtrusion: isMotion && hasExtrusion,
      isTravel: isMotion && !hasExtrusion,
    };
  });
}
