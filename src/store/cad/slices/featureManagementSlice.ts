import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';
import { createFeatureCoreActions } from './featureManagement/featureCoreActions';
import { createFeatureMeshActions } from './featureManagement/featureMeshActions';

export function createFeatureManagementSlice(context: CADSliceContext) {
  const slice: Partial<CADState> = {
    ...createFeatureCoreActions(context),
    ...createFeatureMeshActions(context),
  };

  return slice;
}

