import type { PersistOptions, PersistStorage } from 'zustand/middleware';
import type { Feature, Sketch } from '../../types/cad';
import { useComponentStore } from '../componentStore';
import { deserializeFeature, deserializeSketch, idbStorage, serializeFeature } from './persistence';
import type { CADState } from './state';

function rebuildExtrudeBodies(state: CADState) {
  const componentStore = useComponentStore.getState();
  const existingBodyIds = new Set(Object.keys(componentStore.bodies));
  const createdThisRun = new Set<string>();

  for (const feature of state.features) {
    if (feature.type !== 'extrude') continue;
    const op = (feature.params?.operation as string) ?? 'new-body';
    if (op !== 'new-body') continue;
    if (feature.bodyId && (existingBodyIds.has(feature.bodyId) || createdThisRun.has(feature.bodyId))) continue;

    const parentId = componentStore.activeComponentId ?? componentStore.rootComponentId;
    const bodyLabel =
      (feature.bodyKind === 'surface' ? 'Surface' : 'Body') +
      ' ' +
      (Object.keys(componentStore.bodies).length + 1);
    const bodyId = componentStore.addBody(parentId, bodyLabel);
    if (bodyId) {
      componentStore.addFeatureToBody(bodyId, feature.id);
      createdThisRun.add(bodyId);
    }
  }
}

export function createCADPersistConfig(): PersistOptions<CADState, Partial<CADState>> {
  return {
    name: 'dzign3d-cad',
    storage: idbStorage as unknown as PersistStorage<unknown>,
    version: 3,
    migrate: (persistedState: unknown) => {
      const state = (persistedState ?? {}) as Partial<CADState>;
      return {
        ...state,
        sketches: (state.sketches ?? []).map((s) => deserializeSketch(s as Sketch)),
        features: (state.features ?? []).map((f) => deserializeFeature(f as Feature)),
      } as CADState;
    },
    merge: (persistedState: unknown, currentState: CADState): CADState => {
      const state = (persistedState ?? {}) as Partial<CADState>;
      return {
        ...currentState,
        ...state,
        activeSketch: state.activeSketch ? deserializeSketch(state.activeSketch as Sketch) : currentState.activeSketch,
        sketches: (state.sketches ?? currentState.sketches).map((s) => deserializeSketch(s as Sketch)),
        features: (state.features ?? currentState.features).map((f) => deserializeFeature(f as Feature)),
      };
    },
    onRehydrateStorage: () => (state: CADState | undefined) => {
      if (!state) return;

      const compPersist = (useComponentStore as unknown as {
        persist?: {
          hasHydrated: () => boolean;
          onFinishHydration: (cb: () => void) => (() => void) | void;
        };
      }).persist;

      if (compPersist && !compPersist.hasHydrated()) {
        compPersist.onFinishHydration(() => rebuildExtrudeBodies(state));
      } else {
        rebuildExtrudeBodies(state);
      }
    },
    partialize: (state: CADState) => ({
      gridSize: state.gridSize,
      snapEnabled: state.snapEnabled,
      gridVisible: state.gridVisible,
      sketchPolygonSides: state.sketchPolygonSides,
      sketchFilletRadius: state.sketchFilletRadius,
      units: state.units,
      visualStyle: state.visualStyle,
      showEnvironment: state.showEnvironment,
      showShadows: state.showShadows,
      showGroundPlane: state.showGroundPlane,
      showComponentColors: state.showComponentColors,
      viewportLayout: state.viewportLayout,
      ambientOcclusionEnabled: state.ambientOcclusionEnabled,
      dimensionToleranceMode: state.dimensionToleranceMode,
      dimensionToleranceUpper: state.dimensionToleranceUpper,
      dimensionToleranceLower: state.dimensionToleranceLower,
      sketches: state.sketches,
      features: state.features.map((f: Feature) => serializeFeature(f) as Feature),
      parameters: state.parameters,
      frozenFormVertices: state.frozenFormVertices,
      featureGroups: state.featureGroups,
      canvasReferences: state.canvasReferences,
      jointOrigins: state.jointOrigins,
      formBodies: state.formBodies,
    }),
  } as unknown as PersistOptions<CADState, Partial<CADState>>;
}
