import type { DuetHeightMap } from '../../types/duet';

export function parseHeightMapCsv(csv: string): DuetHeightMap {
  const lines = csv.trim().split('\n');
  let headerLine = '';
  let dataStartIndex = 0;

  for (let index = 0; index < lines.length; index++) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith('RepRapFirmware') || trimmed.startsWith(';')) continue;
    if (trimmed.toLowerCase().includes('xmin') || (trimmed.includes(',') && !headerLine)) {
      headerLine = trimmed;
      dataStartIndex = index + 1;
      break;
    }
  }

  const headerParts = headerLine.split(',').map((part) => part.trim());
  const paramLine = isNaN(parseFloat(headerParts[0])) ? lines[dataStartIndex++].trim() : headerLine;
  const [xMin, xMax, yMin, yMax, radius, xSpacing, ySpacing, numXRaw, numYRaw] = paramLine.split(',').map((part) => parseFloat(part.trim()));
  const numX = Math.round(numXRaw);
  const numY = Math.round(numYRaw);

  const points: number[][] = [];
  for (let index = dataStartIndex; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line || line.startsWith(';')) continue;
    points.push(line.split(',').map((part) => {
      const value = parseFloat(part.trim());
      return isNaN(value) ? 0 : value;
    }));
  }

  return { xMin, xMax, xSpacing, yMin, yMax, ySpacing, radius, numX, numY, points };
}
