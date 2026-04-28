import * as React from 'react';
import './SlicerWorkspace.css';
import { SlicerWorkspaceBottomBar } from './workspace/bottom/SlicerWorkspaceBottomBar';
import { SlicerWorkspaceViewport } from './workspace/canvas/SlicerWorkspaceViewport';
import { SlicerProfileEditorModal } from './workspace/modals/SlicerProfileEditorModal';
import { SlicerWorkspaceTopNav } from './workspace/nav/SlicerWorkspaceTopNav';
import { SlicerWorkspaceObjectsPanel } from './workspace/panels/SlicerWorkspaceObjectsPanel';
import { SlicerWorkspaceSettingsPanel } from './workspace/panels/SlicerWorkspaceSettingsPanel';


// =============================================================================
// Main Export: SlicerWorkspace
// =============================================================================
export default function SlicerWorkspace() {
  const [editingProfile, setEditingProfile] = React.useState<'printer' | 'material' | 'print' | null>(null);

  return (
    <React.Fragment>
      <div className="slicer-workspace">
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
      </div>
    </React.Fragment>
  );
}
