import { useState } from 'react';
import PluginsPage from './PluginsPage';
import { SlicerBottomBar } from './SlicerBottomBar';
import { SlicerWorkspaceNavBar, type SlicerPage } from './SlicerWorkspaceNavBar';
import { SlicerWorkspaceViewport } from './workspace/canvas/SlicerWorkspaceViewport';
import { SlicerWorkspaceProfileEditorModal } from './workspace/modals/SlicerWorkspaceProfileEditorModal';
import { SlicerWorkspaceObjectsPanel } from './workspace/panels/SlicerWorkspaceObjectsPanel';
import { SlicerWorkspaceSettingsPanel } from './workspace/panels/SlicerWorkspaceSettingsPanel';


// =============================================================================
// Main Export: SlicerWorkspace
// ============================================================================= 
export default function SlicerWorkspace() {
  const [editingProfile, setEditingProfile] = useState<'printer' | 'material' | 'print' | null>(null);
  const [currentPage, setCurrentPage] = useState<SlicerPage>('prepare');

  return (
    <div className="slicer-workspace">
      {/* Workspace navigation tabs */}
      <SlicerWorkspaceNavBar currentPage={currentPage} onChangePage={setCurrentPage} />

      {/* Plugins page */}
      {currentPage === 'plugins' && <PluginsPage />}

      {/* Prepare page: left panel + 3D view + right panel (hidden when plugins active) */}
      <div className={`slicer-workspace__prepare ${currentPage === 'prepare' ? '' : 'is-hidden'}`}>
        {/* Left Panel - Objects */}
        <SlicerWorkspaceObjectsPanel />

        {/* Center - 3D Canvas */}
        <SlicerWorkspaceViewport />

        {/* Right Panel - Settings */}
        <SlicerWorkspaceSettingsPanel onEditProfile={(type) => setEditingProfile(type)} />
      </div>

      {/* Bottom Bar — only shown on Prepare page */}
      {currentPage === 'prepare' && <SlicerBottomBar />}

      {/* Profile Editor Modal */}
      {editingProfile && (
        <SlicerWorkspaceProfileEditorModal type={editingProfile} onClose={() => setEditingProfile(null)} />
      )}
    </div>
  );
}
