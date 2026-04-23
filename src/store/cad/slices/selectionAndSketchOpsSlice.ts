import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';
import { createConstraintAndViewActions } from './selectionAndSketchOps/constraintAndViewActions';
import { createSelectionAndFormActions } from './selectionAndSketchOps/selectionAndFormActions';
import { createSketchEditingActions } from './selectionAndSketchOps/sketchEditingActions';

export function createSelectionAndSketchOpsSlice(context: CADSliceContext) {
  const slice: Partial<CADState> = {
    ...createSelectionAndFormActions(context),
    ...createSketchEditingActions(context),
    ...createConstraintAndViewActions(context),
  };

  return slice;
}
