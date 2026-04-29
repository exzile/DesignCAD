import { useMemo } from 'react';
import { AlignEndHorizontal, Ruler, X } from 'lucide-react';
import * as THREE from 'three';
import { useSlicerStore } from '../../../../store/slicerStore';
import './PickToolsOverlay.css';

/**
 * Floating "pick-mode" toolbar shown in the upper centre of the viewport
 * when the user has triggered a tool that needs a click on the 3D scene
 * (face-pick lay-flat, measurement). Includes a status hint and a cancel
 * button so the user is never stuck in a mode.
 */
export function PickToolsOverlay() {
  const pickMode = useSlicerStore((s) => s.viewportPickMode);
  const measurePoints = useSlicerStore((s) => s.measurePoints);
  const setPickMode = useSlicerStore((s) => s.setViewportPickMode);
  const clearMeasure = useSlicerStore((s) => s.clearMeasurePoints);
  const selectedId = useSlicerStore((s) => s.selectedPlateObjectId);

  const distance = useMemo(() => {
    if (measurePoints.length < 2) return null;
    const a = new THREE.Vector3(measurePoints[0].x, measurePoints[0].y, measurePoints[0].z);
    const b = new THREE.Vector3(measurePoints[1].x, measurePoints[1].y, measurePoints[1].z);
    const d = a.distanceTo(b);
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    const dz = Math.abs(a.z - b.z);
    return { d, dx, dy, dz };
  }, [measurePoints]);

  return (
    <div className="slicer-pick-tools" role="toolbar">
      <button
        type="button"
        title="Lay flat (click a face)"
        className={`slicer-pick-tools__btn${pickMode === 'lay-flat' ? ' is-active' : ''}`}
        onClick={() => setPickMode(pickMode === 'lay-flat' ? 'none' : 'lay-flat')}
        disabled={!selectedId}
      >
        <AlignEndHorizontal size={14} /> Lay Flat (face)
      </button>
      <button
        type="button"
        title="Measurement tool — click two points"
        className={`slicer-pick-tools__btn${pickMode === 'measure' ? ' is-active' : ''}`}
        onClick={() => setPickMode(pickMode === 'measure' ? 'none' : 'measure')}
      >
        <Ruler size={14} /> Measure
      </button>

      {pickMode === 'lay-flat' && (
        <span className="slicer-pick-tools__hint">
          Click a face on the selected object…
          <button onClick={() => setPickMode('none')} title="Cancel" className="slicer-pick-tools__cancel"><X size={11} /></button>
        </span>
      )}
      {pickMode === 'measure' && (
        <span className="slicer-pick-tools__hint">
          {measurePoints.length === 0 && 'Click point A'}
          {measurePoints.length === 1 && 'Click point B'}
          {measurePoints.length >= 2 && distance && (
            <>
              {distance.d.toFixed(2)} mm
              {' '}<span style={{ color: 'var(--text-muted)' }}>
                (Δx {distance.dx.toFixed(1)}, Δy {distance.dy.toFixed(1)}, Δz {distance.dz.toFixed(1)})
              </span>
            </>
          )}
          <button onClick={() => { clearMeasure(); setPickMode('none'); }} title="Done" className="slicer-pick-tools__cancel"><X size={11} /></button>
        </span>
      )}
    </div>
  );
}

export function MeasurementMarkers() {
  const measurePoints = useSlicerStore((s) => s.measurePoints);
  if (measurePoints.length === 0) return null;
  return (
    <group>
      {measurePoints.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[0.6, 12, 12]} />
          <meshBasicMaterial color={i === 0 ? '#ff8a4c' : '#2f80ed'} />
        </mesh>
      ))}
      {measurePoints.length === 2 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[new Float32Array([
                measurePoints[0].x, measurePoints[0].y, measurePoints[0].z,
                measurePoints[1].x, measurePoints[1].y, measurePoints[1].z,
              ]), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#ffaa44" />
        </line>
      )}
    </group>
  );
}
