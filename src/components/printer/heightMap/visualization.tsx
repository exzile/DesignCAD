import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { DuetHeightMap as HeightMapData } from '../../../types/duet';
import { computeStats, deviationColor, deviationColorThree, divergingColor, divergingColorThree, type HeightMapStats } from './utils';

function HeightMapMesh({ heightMap, diverging = false }: { heightMap: HeightMapData; diverging?: boolean }) {
  const { geometry } = useMemo(() => {
    const stats = computeStats(heightMap);
    const geo = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const xRange = heightMap.xMax - heightMap.xMin;
    const yRange = heightMap.yMax - heightMap.yMin;
    const scaleXY = 1 / Math.max(xRange, yRange, 1);
    const zScale = (1 / Math.max(Math.abs(stats.max), Math.abs(stats.min), 0.01)) * 0.3;
    const colorFn = diverging ? divergingColorThree : deviationColorThree;

    for (let yi = 0; yi < heightMap.numY; yi++) {
      for (let xi = 0; xi < heightMap.numX; xi++) {
        const value = heightMap.points[yi]?.[xi] ?? 0;
        const x = (heightMap.xMin + xi * heightMap.xSpacing) * scaleXY - 0.5;
        const y = (heightMap.yMin + yi * heightMap.ySpacing) * scaleXY - 0.5;
        vertices.push(x, value * zScale, -y);
        const color = colorFn(value, stats.min, stats.max);
        colors.push(color.r, color.g, color.b);
      }
    }

    for (let yi = 0; yi < heightMap.numY - 1; yi++) {
      for (let xi = 0; xi < heightMap.numX - 1; xi++) {
        const a = yi * heightMap.numX + xi;
        const b = a + 1;
        const c = a + heightMap.numX;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return { geometry: geo };
  }, [heightMap, diverging]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry}><meshStandardMaterial vertexColors side={THREE.DoubleSide} flatShading /></mesh>;
}

function GridOverlay({ heightMap }: { heightMap: HeightMapData }) {
  const lines = useMemo(() => {
    const rangeX = heightMap.xMax - heightMap.xMin;
    const rangeY = heightMap.yMax - heightMap.yMin;
    const scale = 1 / Math.max(rangeX, rangeY, 1);
    const pts: THREE.Vector3[] = [];
    for (let y = 0; y < heightMap.numY; y++) {
      for (let x = 0; x < heightMap.numX; x++) {
        const px = (heightMap.xMin + x * heightMap.xSpacing) * scale - 0.5;
        const py = (heightMap.yMin + y * heightMap.ySpacing) * scale - 0.5;
        pts.push(new THREE.Vector3(px, -0.001, -py));
        if (x < heightMap.numX - 1) pts.push(new THREE.Vector3((heightMap.xMin + (x + 1) * heightMap.xSpacing) * scale - 0.5, -0.001, -py));
      }
    }
    for (let x = 0; x < heightMap.numX; x++) {
      for (let y = 0; y < heightMap.numY; y++) {
        const px = (heightMap.xMin + x * heightMap.xSpacing) * scale - 0.5;
        const py = (heightMap.yMin + y * heightMap.ySpacing) * scale - 0.5;
        pts.push(new THREE.Vector3(px, -0.001, -py));
        if (y < heightMap.numY - 1) pts.push(new THREE.Vector3(px, -0.001, -(heightMap.yMin + (y + 1) * heightMap.ySpacing) * scale + 0.5));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [heightMap]);

  useEffect(() => () => lines.dispose(), [lines]);
  return <lineSegments geometry={lines}><lineBasicMaterial color="#666" opacity={0.3} transparent /></lineSegments>;
}

function AxisLabels() {
  return (
    <group>
      <Text position={[0.6, 0, 0]} fontSize={0.05} color="#ef4444">X</Text>
      <Text position={[0, 0, 0.6]} fontSize={0.05} color="#22c55e">Y</Text>
      <Text position={[0, 0.4, 0]} fontSize={0.05} color="#3b82f6">Z</Text>
    </group>
  );
}

export function Scene3D({ heightMap, diverging = false }: { heightMap: HeightMapData; diverging?: boolean }) {
  return (
    <Canvas camera={{ position: [0.8, 0.6, 0.8], fov: 50 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />
      <HeightMapMesh heightMap={heightMap} diverging={diverging} />
      <GridOverlay heightMap={heightMap} />
      <AxisLabels />
      <OrbitControls enableDamping dampingFactor={0.1} />
    </Canvas>
  );
}

export function Heatmap2D({ heightMap, diverging = false }: { heightMap: HeightMapData; diverging?: boolean }) {
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; value: number; screenX: number; screenY: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const stats = useMemo(() => computeStats(heightMap), [heightMap]);
  const padding = 40;
  const svgWidth = 500;
  const svgHeight = 400;
  const gridWidth = svgWidth - padding * 2;
  const gridHeight = svgHeight - padding * 2;
  const cellWidth = gridWidth / heightMap.numX;
  const cellHeight = gridHeight / heightMap.numY;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGRectElement>, xi: number, yi: number, value: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHoverInfo({
      x: heightMap.xMin + xi * heightMap.xSpacing,
      y: heightMap.yMin + yi * heightMap.ySpacing,
      value,
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
    });
  }, [heightMap]);

  return (
    <div className="heatmap-2d-container" style={{ position: 'relative' }}>
      <svg ref={svgRef} viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', maxWidth: svgWidth, height: 'auto' }}>
        {Array.from({ length: heightMap.numY }, (_, yi) =>
          Array.from({ length: heightMap.numX }, (_, xi) => {
            const value = heightMap.points[yi]?.[xi] ?? 0;
            const fill = diverging ? divergingColor(value, stats.min, stats.max) : deviationColor(value, stats.min, stats.max);
            return (
              <rect
                key={`${xi}-${yi}`}
                x={padding + xi * cellWidth}
                y={padding + (heightMap.numY - 1 - yi) * cellHeight}
                width={cellWidth}
                height={cellHeight}
                fill={fill}
                stroke="#333"
                strokeWidth={0.5}
                onMouseMove={(e) => handleMouseMove(e, xi, yi, value)}
                onMouseLeave={() => setHoverInfo(null)}
                style={{ cursor: 'crosshair' }}
              />
            );
          }),
        )}
      </svg>
      {hoverInfo && (
        <div className="heatmap-tooltip" style={{ position: 'absolute', left: hoverInfo.screenX + 12, top: hoverInfo.screenY - 30, background: '#1e1e2e', border: '1px solid #444', borderRadius: 4, padding: '4px 8px', fontSize: 12, color: '#eee', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 10 }}>
          X: {hoverInfo.x.toFixed(1)} / Y: {hoverInfo.y.toFixed(1)} / Z: {hoverInfo.value.toFixed(4)} mm
        </div>
      )}
    </div>
  );
}

export function ColorScaleLegend({ min, max, diverging = false }: { min: number; max: number; diverging?: boolean }) {
  const labels = Array.from({ length: 11 }, (_, i) => {
    const value = min + (i / 10) * (max - min);
    return { value, color: (diverging ? divergingColor : deviationColor)(value, min, max) };
  });

  return (
    <div className="heightmap-legend">
      <span className="legend-label">{min.toFixed(3)}</span>
      <div className="legend-bar">
        {labels.map((label, index) => <div key={index} className="legend-segment" style={{ background: label.color, flex: 1 }} title={`${label.value.toFixed(3)} mm`} />)}
      </div>
      <span className="legend-label">{max.toFixed(3)}</span>
      <span className="legend-unit">mm</span>
    </div>
  );
}

export function StatsPanel({ stats }: { stats: HeightMapStats }) {
  return (
    <div className="heightmap-stats">
      <div className="stat-row"><span className="stat-label">Min Deviation</span><span className="stat-value">{stats.min.toFixed(4)} mm</span></div>
      <div className="stat-row"><span className="stat-label">Max Deviation</span><span className="stat-value">{stats.max.toFixed(4)} mm</span></div>
      <div className="stat-row"><span className="stat-label">Mean Deviation</span><span className="stat-value">{stats.mean.toFixed(4)} mm</span></div>
      <div className="stat-row"><span className="stat-label">RMS Deviation</span><span className="stat-value">{stats.rms.toFixed(4)} mm</span></div>
      <div className="stat-row"><span className="stat-label">Probe Points</span><span className="stat-value">{stats.probePoints}</span></div>
      <div className="stat-row"><span className="stat-label">Grid Dimensions</span><span className="stat-value">{stats.gridDimensions}</span></div>
    </div>
  );
}
