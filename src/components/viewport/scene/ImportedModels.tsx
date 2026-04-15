import { useEffect } from 'react';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';
import { useComponentStore } from '../../../store/componentStore';
import { DIM_MATERIAL } from './bodyMaterial';

export default function ImportedModels() {
  const features = useCADStore((s) => s.features);
  const rollbackIndex = useCADStore((s) => s.rollbackIndex);
  const activeComponentId = useComponentStore((s) => s.activeComponentId);
  const rootComponentId = useComponentStore((s) => s.rootComponentId);

  const editingInPlace = !!activeComponentId && activeComponentId !== rootComponentId;

  // Tag imported meshes as pickable so the SketchPlaneSelector can hit-test them
  useEffect(() => {
    features.filter(f => f.type === 'import' && f.mesh).forEach((f) => {
      const mesh = f.mesh!;
      mesh.userData.pickable = true;
      mesh.userData.featureId = f.id;
      mesh.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.userData.pickable = true;
          obj.userData.featureId = f.id;
        }
      });
    });
  }, [features]);

  return (
    <>
      {features.filter((f, i) => {
        // D187 suppress + D190 rollback + visibility
        if (f.type !== 'import' || !f.visible || f.suppressed || !f.mesh) return false;
        if (rollbackIndex >= 0 && i > rollbackIndex) return false;
        return true;
      }).map((feature) => {
        if (editingInPlace && feature.componentId !== activeComponentId) {
          // Apply dim material to all mesh children
          feature.mesh!.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              (obj as THREE.Mesh).material = DIM_MATERIAL;
            }
          });
        }
        return <primitive key={feature.id} object={feature.mesh!} />;
      })}
    </>
  );
}
