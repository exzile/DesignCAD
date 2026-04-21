// Auto-saves the open .dzn bundle whenever slicer profiles or active
// selections change — but only when an FSA file handle is already open.
// The user must explicitly open or save-as a .dzn first; after that every
// profile edit silently rewrites the file in place.

import { useSlicerStore } from '../store/slicerStore';
import { useProjectFileStore, saveBundleSlice } from '../utils/projectIO';

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSlicerSave() {
  if (!useProjectFileStore.getState().handle) return;
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    saveBundleSlice('slicer').catch(() => {});
  }, 600);
}

useSlicerStore.subscribe((state, prev) => {
  if (
    state.printerProfiles        !== prev.printerProfiles        ||
    state.materialProfiles       !== prev.materialProfiles       ||
    state.printProfiles          !== prev.printProfiles          ||
    state.activePrinterProfileId !== prev.activePrinterProfileId ||
    state.activeMaterialProfileId !== prev.activeMaterialProfileId ||
    state.activePrintProfileId   !== prev.activePrintProfileId   ||
    state.printerLastMaterial    !== prev.printerLastMaterial    ||
    state.printerLastPrint       !== prev.printerLastPrint
  ) {
    scheduleSlicerSave();
  }
});
