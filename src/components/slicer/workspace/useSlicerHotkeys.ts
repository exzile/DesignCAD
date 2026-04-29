import { useEffect } from 'react';
import { useSlicerStore } from '../../../store/slicerStore';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  return TYPING_TAGS.has(el.tagName);
}

/**
 * Global keyboard shortcuts for the prepare page. Registered once at the
 * SlicerWorkspace root. Inputs, textareas, and contentEditable nodes are
 * skipped so users can still type freely in the settings panel.
 */
export function useSlicerHotkeys() {
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (isEditableTarget(ev.target)) return;
      const store = useSlicerStore.getState();
      const ids = store.getSelectedIds();
      const mod = ev.ctrlKey || ev.metaKey;

      if (mod && (ev.key === 'z' || ev.key === 'Z')) {
        ev.preventDefault();
        if (ev.shiftKey) store.redoPlate();
        else store.undoPlate();
        return;
      }
      if (mod && (ev.key === 'y' || ev.key === 'Y')) {
        ev.preventDefault();
        store.redoPlate();
        return;
      }
      if (mod && (ev.key === 'd' || ev.key === 'D')) {
        ev.preventDefault();
        if (ids.length > 0) store.duplicateSelectedPlateObjects();
        return;
      }
      if (mod && (ev.key === 'a' || ev.key === 'A')) {
        // Select all
        ev.preventDefault();
        const all = store.plateObjects;
        if (all.length > 0) {
          // We can't batch-set with the existing API, so set anchor + extras
          // through the store directly.
          useSlicerStore.setState({
            selectedPlateObjectId: all[0].id,
            additionalSelectedIds: all.slice(1).map((o) => o.id),
          });
        }
        return;
      }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        if (ids.length === 0) return;
        ev.preventDefault();
        store.removeSelectedPlateObjects();
        return;
      }
      if (ev.key === 'Escape') {
        store.clearPlateSelection();
        return;
      }
      // Single-letter tool shortcuts (lowercase only — uppercase variants are
      // typically modifier combos handled above).
      if (ids.length > 0 && !mod) {
        if (ev.key === 'f') {
          ev.preventDefault();
          ids.forEach((id) => store.layFlatPlateObject(id));
        } else if (ev.key === 'b') {
          ev.preventDefault();
          ids.forEach((id) => store.dropToBedPlateObject(id));
        } else if (ev.key === 'm') {
          store.setTransformMode('move');
        } else if (ev.key === 'r') {
          store.setTransformMode('rotate');
        } else if (ev.key === 's') {
          store.setTransformMode('scale');
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
