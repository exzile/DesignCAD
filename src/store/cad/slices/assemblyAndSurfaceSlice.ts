import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';
import { createAnalysisActions } from './assemblyAndSurface/analysisActions';
import { createAssemblyActions } from './assemblyAndSurface/assemblyActions';
import { createSurfaceCreationActions } from './assemblyAndSurface/surfaceCreationActions';
import { createSurfaceEditActions } from './assemblyAndSurface/surfaceEditActions';

export function createAssemblyAndSurfaceSlice(context: CADSliceContext) {
  const slice: Partial<CADState> = {
    ...createAssemblyActions(context),
    ...createAnalysisActions(context),
    ...createSurfaceCreationActions(context),
    ...createSurfaceEditActions(context),
  };

  return slice;
}
