import type { CADSliceContext } from '../sliceContext';
import type { CADState } from '../state';
import { createGeneralUiActions } from './uiAndSketchTools/generalUiActions';
import { createSketchUiActions } from './uiAndSketchTools/sketchUiActions';
import { createSurfaceUiActions } from './uiAndSketchTools/surfaceUiActions';

export function createUiAndSketchToolsSlice(context: CADSliceContext) {
  const slice: Partial<CADState> = {
    ...createGeneralUiActions(context),
    ...createSketchUiActions(context),
    ...createSurfaceUiActions(context),
  };

  return slice;
}

