import { Eye, Layers } from 'lucide-react';
import { useSlicerStore } from '../../../../store/slicerStore';
export type { SlicerPage } from '../../../../types/slicer-nav.types';

export function SlicerWorkspaceTopNav() {
  const sliceResult = useSlicerStore((s) => s.sliceResult);
  const previewMode = useSlicerStore((s) => s.previewMode);
  const setPreviewMode = useSlicerStore((s) => s.setPreviewMode);
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
    </div>
  );
}
