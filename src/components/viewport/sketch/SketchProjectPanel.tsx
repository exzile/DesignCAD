import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export default function SketchProjectPanel() {
  const activeTool = useCADStore(s => s.activeTool);
  const projectLiveLink = useCADStore(s => s.projectLiveLink);
  const setProjectLiveLink = useCADStore(s => s.setProjectLiveLink);
  const cancelSketchProjectTool = useCADStore(s => s.cancelSketchProjectTool);

  if (activeTool !== 'sketch-project') return null;

  return (
    <div className="extrude-panel">
      <div className="sketch-palette-header">
        <span className="sketch-palette-dot" style={{ background: '#38bdf8' }} />
        <span className="sketch-palette-title">PROJECT / INCLUDE</span>
        <button className="sketch-palette-close" onClick={cancelSketchProjectTool} title="Cancel">
          <X size={12} />
        </button>
      </div>
      <div className="sketch-palette-body">
        <div className="sketch-palette-row">
          <label className="sketch-project-link-label">
            <input type="checkbox" checked={projectLiveLink}
              onChange={e => setProjectLiveLink(e.target.checked)} />
            <span className="sketch-palette-label">Live Link (Include)</span>
          </label>
        </div>
        <div className="sketch-project-hint">
          {projectLiveLink
            ? 'Projected edges stay linked to the 3D body'
            : 'Geometry is copied once with no link'}
        </div>
        <div className="sketch-palette-row sketch-palette-row--centered">
          <button className="btn btn-secondary btn--full-width" onClick={cancelSketchProjectTool}>
            <X size={14} /> Close
          </button>
        </div>
      </div>
    </div>
  );
}
