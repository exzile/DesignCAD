import type { CADState } from './state';

export function snapshotCADState(state: CADState): string {
  return JSON.stringify({
    features: state.features.map((f) => ({
      ...f,
      mesh: undefined,
    })),
    sketches: state.sketches.map((s) => ({
      ...s,
      planeNormal: s.planeNormal ? [s.planeNormal.x, s.planeNormal.y, s.planeNormal.z] : null,
      planeOrigin: s.planeOrigin ? [s.planeOrigin.x, s.planeOrigin.y, s.planeOrigin.z] : null,
    })),
    featureGroups: state.featureGroups,
  });
}
