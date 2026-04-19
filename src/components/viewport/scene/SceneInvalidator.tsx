import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCADStore } from '../../../store/cadStore';
import { useComponentStore } from '../../../store/componentStore';

/**
 * Calls R3F's `invalidate()` whenever store state that affects 3D rendering
 * changes — features, sketches, selection, rollback, bodies, etc.
 *
 * Required because Canvas uses `frameloop="demand"`: Three.js only renders a
 * frame when explicitly requested. OrbitControls handles camera-interaction
 * frames; this component handles the "scene content changed" case so new
 * geometry / material / selection highlights appear immediately without waiting
 * for the next mouse move.
 */
export default function SceneInvalidator() {
  const { invalidate } = useThree();

  // Geometric content
  const features      = useCADStore((s) => s.features);
  const sketches      = useCADStore((s) => s.sketches);
  const rollbackIndex = useCADStore((s) => s.rollbackIndex);

  // Selection / highlight
  const selectedEntityIds    = useCADStore((s) => s.selectedEntityIds);
  const selectedFeatureId    = useCADStore((s) => s.selectedFeatureId);
  const activeTool           = useCADStore((s) => s.activeTool);
  const activeSketch         = useCADStore((s) => s.activeSketch);
  const activeAnalysis       = useCADStore((s) => s.activeAnalysis);
  const visualStyle          = useCADStore((s) => s.visualStyle);
  const showReflections      = useCADStore((s) => s.showReflections);

  // Component visibility / appearances
  const bodies               = useComponentStore((s) => s.bodies);
  const activeComponentId    = useComponentStore((s) => s.activeComponentId);

  useEffect(() => { invalidate(); }, [
    invalidate,
    features,
    sketches,
    rollbackIndex,
    selectedEntityIds,
    selectedFeatureId,
    activeTool,
    activeSketch,
    activeAnalysis,
    visualStyle,
    showReflections,
    bodies,
    activeComponentId,
  ]);

  return null;
}
