// 3D risk heatmap markers — render small spheres at issue.hint points
// on the current layer, color-coded by severity. Beyond Cura/Orca:
// neither tool surfaces the precise XY location of detected problems
// in 3D space, so users have to scrub layer-by-layer to find them.

import { useMemo } from 'react';
import * as THREE from 'three';
import type { PrintIssue } from './sliceStats';

interface RiskMarkersProps {
  issues: PrintIssue[];
  z: number;
}

const SEVERITY_COLORS = {
  warning: new THREE.Color('#cc6600'),
  info:    new THREE.Color('#5588cc'),
};

const RISK_GEOMETRY = new THREE.SphereGeometry(0.55, 12, 12);
RISK_GEOMETRY.userData.shared = true;

const WARNING_MATERIAL = new THREE.MeshBasicMaterial({
  color: SEVERITY_COLORS.warning,
  transparent: true, opacity: 0.85,
});
WARNING_MATERIAL.userData.shared = true;

const INFO_MATERIAL = new THREE.MeshBasicMaterial({
  color: SEVERITY_COLORS.info,
  transparent: true, opacity: 0.85,
});
INFO_MATERIAL.userData.shared = true;

export function RiskMarkers({ issues, z }: RiskMarkersProps) {
  const { warnings, infos } = useMemo(() => {
    const ws = issues.filter((i) => i.severity === 'warning' && i.hint);
    const is = issues.filter((i) => i.severity === 'info' && i.hint);
    return { warnings: ws, infos: is };
  }, [issues]);

  const warningMesh = useMemo(() => {
    if (warnings.length === 0) return null;
    const m = new THREE.InstancedMesh(RISK_GEOMETRY, WARNING_MATERIAL, warnings.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < warnings.length; i++) {
      const p = warnings[i].hint!;
      dummy.position.set(p.x, p.y, z + 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [warnings, z]);

  const infoMesh = useMemo(() => {
    if (infos.length === 0) return null;
    const m = new THREE.InstancedMesh(RISK_GEOMETRY, INFO_MATERIAL, infos.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < infos.length; i++) {
      const p = infos[i].hint!;
      dummy.position.set(p.x, p.y, z + 0.5);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    return m;
  }, [infos, z]);

  return (
    <>
      {warningMesh && <primitive object={warningMesh} />}
      {infoMesh && <primitive object={infoMesh} />}
    </>
  );
}
