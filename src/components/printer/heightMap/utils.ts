import * as THREE from 'three';
import type { DuetHeightMap as HeightMapData } from '../../../types/duet';

export interface HeightMapStats {
  min: number;
  max: number;
  mean: number;
  rms: number;
  probePoints: number;
  gridDimensions: string;
}

export function deviationColor(value: number, minVal: number, maxVal: number): string {
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal), 0.001);
  const t = Math.max(-1, Math.min(1, value / range));
  if (t < 0) {
    const f = 1 + t;
    const r = Math.round(34 * f);
    const g = Math.round(100 * (1 - f) + 197 * f);
    const b = Math.round(255 * (1 - f) + 94 * f);
    return `rgb(${r},${g},${b})`;
  }
  const f = t;
  const r = Math.round(34 * (1 - f) + 239 * f);
  const g = Math.round(197 * (1 - f) + 68 * f);
  const b = Math.round(94 * (1 - f) + 68 * f);
  return `rgb(${r},${g},${b})`;
}

export function deviationColorThree(value: number, minVal: number, maxVal: number): THREE.Color {
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal), 0.001);
  const t = Math.max(-1, Math.min(1, value / range));
  if (t < 0) {
    const f = 1 + t;
    return new THREE.Color((34 * f) / 255, (100 * (1 - f) + 197 * f) / 255, (255 * (1 - f) + 94 * f) / 255);
  }
  const f = t;
  return new THREE.Color((34 * (1 - f) + 239 * f) / 255, (197 * (1 - f) + 68 * f) / 255, (94 * (1 - f) + 68 * f) / 255);
}

export function divergingColor(value: number, minVal: number, maxVal: number): string {
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal), 0.001);
  const t = Math.max(-1, Math.min(1, value / range));
  if (t < 0) {
    const f = -t;
    return `rgb(${Math.round(255 * (1 - f) + 59 * f)},${Math.round(255 * (1 - f) + 130 * f)},${Math.round(255 * (1 - f) + 246 * f)})`;
  }
  const f = t;
  return `rgb(${Math.round(255 * (1 - f) + 239 * f)},${Math.round(255 * (1 - f) + 68 * f)},${Math.round(255 * (1 - f) + 68 * f)})`;
}

export function divergingColorThree(value: number, minVal: number, maxVal: number): THREE.Color {
  const range = Math.max(Math.abs(minVal), Math.abs(maxVal), 0.001);
  const t = Math.max(-1, Math.min(1, value / range));
  if (t < 0) {
    const f = -t;
    return new THREE.Color((255 * (1 - f) + 59 * f) / 255, (255 * (1 - f) + 130 * f) / 255, (255 * (1 - f) + 246 * f) / 255);
  }
  const f = t;
  return new THREE.Color((255 * (1 - f) + 239 * f) / 255, (255 * (1 - f) + 68 * f) / 255, (255 * (1 - f) + 68 * f) / 255);
}

export function computeDiffMap(map1: HeightMapData, map2: HeightMapData): HeightMapData | null {
  if (map1.numX !== map2.numX || map1.numY !== map2.numY) return null;
  const points = Array.from({ length: map1.numY }, (_, y) =>
    Array.from({ length: map1.numX }, (_, x) => (map2.points[y]?.[x] ?? 0) - (map1.points[y]?.[x] ?? 0)),
  );
  return { ...map1, points };
}

export function computeStats(hm: HeightMapData): HeightMapStats {
  const values: number[] = [];
  for (let y = 0; y < hm.numY; y++) {
    for (let x = 0; x < hm.numX; x++) {
      const value = hm.points[y]?.[x];
      if (value !== undefined && !isNaN(value)) values.push(value);
    }
  }
  if (values.length === 0) return { min: 0, max: 0, mean: 0, rms: 0, probePoints: 0, gridDimensions: `${hm.numX}x${hm.numY}` };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const rms = Math.sqrt(values.reduce((a, b) => a + b * b, 0) / values.length);
  return { min, max, mean, rms, probePoints: values.length, gridDimensions: `${hm.numX} x ${hm.numY}` };
}

export function exportHeightMapCSV(hm: HeightMapData): void {
  const lines = [
    `RepRapFirmware height map file v2 generated at ${new Date().toISOString()}`,
    'xmin,xmax,ymin,ymax,radius,xspacing,yspacing,num_x,num_y',
    `${hm.xMin},${hm.xMax},${hm.yMin},${hm.yMax},${hm.radius},${hm.xSpacing.toFixed(2)},${hm.ySpacing.toFixed(2)},${hm.numX},${hm.numY}`,
    ...Array.from({ length: hm.numY }, (_, y) =>
      Array.from({ length: hm.numX }, (_, x) => {
        const value = hm.points[y]?.[x];
        return value !== undefined && !isNaN(value) ? value.toFixed(3) : '0';
      }).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'heightmap.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
