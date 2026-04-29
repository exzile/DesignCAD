import * as React from 'react';
import './SlicerWorkspace.css';
import { SlicerWorkspaceBottomBar } from './workspace/bottom/SlicerWorkspaceBottomBar';
import { SlicerWorkspaceViewport } from './workspace/canvas/SlicerWorkspaceViewport';
import { SlicerProfileEditorModal } from './workspace/modals/SlicerProfileEditorModal';
import { SlicerWorkspaceTopNav } from './workspace/nav/SlicerWorkspaceTopNav';
import { SlicerWorkspaceObjectsPanel } from './workspace/panels/SlicerWorkspaceObjectsPanel';
import { SlicerWorkspaceSettingsPanel } from './workspace/panels/SlicerWorkspaceSettingsPanel';
import { useSlicerStore } from '../../store/slicerStore';
import { useSlicerHotkeys } from './workspace/useSlicerHotkeys';

// =============================================================================
// Main Export: SlicerWorkspace
// =============================================================================
export default function SlicerWorkspace() {
  const [editingProfile, setEditingProfile] = React.useState<'printer' | 'material' | 'print' | null>(null);
  const importFileToPlate = useSlicerStore((s) => s.importFileToPlate);
  const [dropActive, setDropActive] = React.useState(false);
  const dragDepthRef = React.useRef(0);

  useSlicerHotkeys();

  // Whole-workspace drag-and-drop. We use a depth-counter pattern because
  // dragenter/dragleave fire for every child element the cursor crosses;
  // tracking the count lets us flip the overlay only when the drag truly
  // leaves or enters the root. Files are accepted the same way the panel's
  // dropzone accepts them.
  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    dragDepthRef.current += 1;
    if (dragDepthRef.current === 1) setDropActive(true);
  }, []);
  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDropActive(false);
  }, []);
  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
    }
  }, []);
  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepthRef.current = 0;
    setDropActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void importFileToPlate(file).catch((err) => console.error('Drop import failed:', err));
    }
  }, [importFileToPlate]);

  return (
    <React.Fragment>
      <div
        className="slicer-workspace"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Workspace navigation tabs */}
        <SlicerWorkspaceTopNav />

        {/* Prepare page: left panel + 3D view + right panel */}
        <div className="slicer-workspace__prepare">
          {/* Left Panel - Objects */}
          <SlicerWorkspaceObjectsPanel />

          {/* Center - 3D Canvas */}
          <SlicerWorkspaceViewport />

          {/* Right Panel - Settings */}
          <SlicerWorkspaceSettingsPanel onEditProfile={(type) => setEditingProfile(type)} />
        </div>

        {/* Bottom Bar — only shown on Prepare page */}
        <SlicerWorkspaceBottomBar />

        {/* Profile Editor Modal */}
        {editingProfile && (
          <SlicerProfileEditorModal type={editingProfile} onClose={() => setEditingProfile(null)} />
        )}

        {dropActive && (
          <div className="slicer-workspace__drop-overlay">
            Drop file to import to plate
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
