import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';
import { createExtrudeCommitActions } from './extrudeRevolve/extrudeCommitActions';
import { createExtrudeSetupActions } from './extrudeRevolve/extrudeSetupActions';
import { createRevolveActions } from './extrudeRevolve/revolveActions';

export function createExtrudeRevolveSlice(context: CADSliceContext) {
  const slice: Partial<CADState> = {
    ...createExtrudeSetupActions(context),
    ...createExtrudeCommitActions(context),
    ...createRevolveActions(context),
  };

  return slice;
}

