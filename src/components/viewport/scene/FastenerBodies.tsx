import { useMemo } from 'react';
import { useCADStore } from '../../../store/cadStore';

/** Renders fastener features inserted via Insert Fastener (D194). */
export default function FastenerBodies() {
  // Subscribe to the full features array (reference-stable between unrelated changes)
  // and derive the filtered subset via useMemo so the snapshot returned by the selector
  // stays referentially stable — filter() inside the selector would return a fresh
  // array every render and trigger useSyncExternalStore's infinite-loop guard.
  const features = useCADStore((s) => s.features);
  const fasteners = useMemo(
    () => features.filter((f) => f.type === 'fastener' && f.visible && !f.suppressed && f.mesh),
    [features],
  );

  return (
    <>
      {fasteners.map((f) =>
        f.mesh ? <primitive key={f.id} object={f.mesh} /> : null,
      )}
    </>
  );
}
