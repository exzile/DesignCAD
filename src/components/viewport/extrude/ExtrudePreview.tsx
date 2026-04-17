import { useMemo, useEffect } from 'react';
import { GeometryEngine } from '../../../engine/GeometryEngine';
import type { ExtrudeDirection } from '../../../store/cadStore';
import { useCADStore } from '../../../store/cadStore';
import type { Sketch } from '../../../types/cad';
import { PREVIEW_MATERIAL, PREVIEW_MATERIAL_CUT } from './materials';

export default function ExtrudePreview({ sketch, distance, direction }: {
  sketch: Sketch;
  distance: number;
  direction: ExtrudeDirection;
}) {
  const operation = useCADStore((s) => s.extrudeOperation);
  const absDistance = Math.abs(distance);
  const isCut = operation === 'cut';
  // Negative distance = user dragged in reverse direction
  const effectiveDirection: ExtrudeDirection = distance < 0 ? 'reverse' : direction;

  const mesh = useMemo(() => {
    if (absDistance < 0.001) return null;
    const m = GeometryEngine.extrudeSketch(sketch, absDistance);
    if (!m) return null;
    m.material = isCut ? PREVIEW_MATERIAL_CUT : PREVIEW_MATERIAL;
    if (effectiveDirection === 'symmetric') {
      m.position.sub(GeometryEngine.getSketchExtrudeNormal(sketch).multiplyScalar(absDistance / 2));
    } else if (effectiveDirection === 'reverse') {
      m.position.sub(GeometryEngine.getSketchExtrudeNormal(sketch).multiplyScalar(absDistance));
    }
    return m;
  }, [sketch, absDistance, effectiveDirection, isCut]);

  useEffect(() => {
    return () => { mesh?.geometry.dispose(); };
  }, [mesh]);

  if (!mesh) return null;
  return <primitive object={mesh} />;
}
