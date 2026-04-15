import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';

/** Renders a small yellow sphere + Y-axis line gizmo at world origin for each joint feature. */
export default function JointGizmos() {
  const features = useCADStore((s) => s.features);

  const jointFeatures = useMemo(
    () =>
      features.filter(
        (f) =>
          f.name.startsWith('Joint') ||
          (f.type === 'import' && f.params?.asBuilt)
      ),
    [features]
  );

  if (jointFeatures.length === 0) return null;

  return (
    <>
      {jointFeatures.map((f) => (
        <JointGizmo key={f.id} />
      ))}
    </>
  );
}

function JointGizmo() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const lineRef   = useRef<THREE.Line>(null);

  const sphereGeo = useMemo(() => new THREE.SphereGeometry(1, 8, 8), []);
  const linePts   = useMemo(
    () => [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 5, 0)],
    []
  );
  const lineGeo   = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(linePts);
    return g;
  }, [linePts]);

  const sphereMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 'yellow' }),
    []
  );
  const lineMat   = useMemo(
    () => new THREE.LineBasicMaterial({ color: 'yellow' }),
    []
  );

  useEffect(() => {
    return () => {
      sphereGeo.dispose();
      lineGeo.dispose();
      sphereMat.dispose();
      lineMat.dispose();
    };
  }, [sphereGeo, lineGeo, sphereMat, lineMat]);

  return (
    <group>
      <mesh ref={sphereRef} geometry={sphereGeo} material={sphereMat} />
      <primitive
        ref={lineRef}
        object={new THREE.Line(lineGeo, lineMat)}
      />
    </group>
  );
}
