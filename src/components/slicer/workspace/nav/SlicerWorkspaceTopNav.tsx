import { Eye, Layers, Undo2, Redo2 } from 'lucide-react';
import { useSlicerStore } from '../../../../store/slicerStore';
export type { SlicerPage } from '../../../../types/slicer-nav.types';

export function SlicerWorkspaceTopNav() {
  const sliceResult = useSlicerStore((s) => s.sliceResult);
  const previewMode = useSlicerStore((s) => s.previewMode);
  const setPreviewMode = useSlicerStore((s) => s.setPreviewMode);
  const undoPlate = useSlicerStore((s) => s.undoPlate);
  const redoPlate = useSlicerStore((s) => s.redoPlate);
  const plateHistory = useSlicerStore((s) => s.plateHistory);
  const plateFuture = useSlicerStore((s) => s.plateFuture);
  const hasSlice = sliceResult !== null;

  return (
    <div className="slicer-workspace-nav">
      <button
        type="button"
        className={`slicer-workspace-nav__tab ${previewMode === 'model' ? 'is-active' : ''}`}
        onClick={() => setPreviewMode('model')}
      >
        <Layers size={13} />
        Prepare
      </button>
      <button
        type="button"
        className={`slicer-workspace-nav__tab ${previewMode === 'preview' ? 'is-active' : ''}`}
        onClick={() => setPreviewMode('preview')}
        disabled={!hasSlice}
        title={hasSlice ? 'Show sliced preview' : 'Slice first to enable preview'}
      >
        <Eye size={13} />
        Preview
      </button>

      <div style={{ flex: 1 }} />

      <button
        type="button"
        className="slicer-workspace-nav__tab"
        onClick={undoPlate}
        disabled={plateHistory.length === 0}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 size={13} />
      </button>
      <button
        type="button"
        className="slicer-workspace-nav__tab"
        onClick={redoPlate}
        disabled={plateFuture.length === 0}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 size={13} />
      </button>
    </div>
  );
}
