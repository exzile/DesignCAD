import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CADState } from './cad/state';
import { createCADPersistConfig } from './cad/persistConfig';
import { createSketchLifecycleSlice } from './cad/slices/sketchLifecycleSlice';
import { createFeatureManagementSlice } from './cad/slices/featureManagementSlice';
import { createSelectionAndSketchOpsSlice } from './cad/slices/selectionAndSketchOpsSlice';
import { createExtrudeRevolveSlice } from './cad/slices/extrudeRevolveSlice';
import { createFeatureCreationSlice } from './cad/slices/featureCreationSlice';
import { createUiAndSketchToolsSlice } from './cad/slices/uiAndSketchToolsSlice';
import { createAssemblyAndSurfaceSlice } from './cad/slices/assemblyAndSurfaceSlice';
import { createHistoryAndDocumentSlice } from './cad/slices/historyAndDocumentSlice';
import { createAdvancedSolidAndMeshOpsSlice } from './cad/slices/advancedSolidAndMeshOpsSlice';

export type { CADState } from './cad/state';
export type { ExtrudeDirection, ExtrudeOperation } from '../types/cad-extrude.types';
export { deserializeFeature, serializeFeature } from './cad/persistence';

export const useCADStore = create<CADState>()(
  persist(
    (set, get) => ({
      ...createSketchLifecycleSlice({ set, get }),
      ...createFeatureManagementSlice({ set, get }),
      ...createSelectionAndSketchOpsSlice({ set, get }),
      ...createExtrudeRevolveSlice({ set, get }),
      ...createFeatureCreationSlice({ set, get }),
      ...createUiAndSketchToolsSlice({ set, get }),
      ...createAssemblyAndSurfaceSlice({ set, get }),
      ...createHistoryAndDocumentSlice({ set, get }),
      ...createAdvancedSolidAndMeshOpsSlice({ set, get }),
    } as CADState),
    createCADPersistConfig(),
  ),
);
