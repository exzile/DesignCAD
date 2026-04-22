import { X, Check } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export default function PatchPanel() {
  const activeTool = useCADStore((s) => s.activeTool);
  const sketches = useCADStore((s) => s.sketches);
  const profileId = useCADStore((s) => s.patchSelectedSketchId);
  const setProfileId = useCADStore((s) => s.setPatchSelectedSketchId);
  const commitPatch = useCADStore((s) => s.commitPatch);
  const cancelPatchTool = useCADStore((s) => s.cancelPatchTool);

  if (activeTool !== 'patch') return null;

  const available = sketches.filter((s) => s.entities.length > 0);
  const canCommit = !!profileId;

  return (
    <div className="extrude-panel">
      <div className="sketch-palette-header">
        <span className="sketch-palette-dot" style={{ background: '#34d399' }} />
        <span className="sketch-palette-title">PATCH</span>
        <button className="sketch-palette-close" onClick={cancelPatchTool} title="Cancel">
          <X size={12} />
        </button>
      </div>

      <div className="sketch-palette-body">
        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Profile</span>
          <select
            className="measure-select"
            value={profileId ?? ''}
            onChange={(e) => setProfileId(e.target.value || null)}
          >
            <option value="" disabled>Select profile sketch</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="extrude-panel-actions">
          <button className="btn btn-secondary" onClick={cancelPatchTool}>
            <X size={14} /> Cancel
          </button>
          <button className="btn btn-primary" onClick={commitPatch} disabled={!canCommit}>
            <Check size={14} /> OK
          </button>
        </div>
      </div>
    </div>
  );
}
