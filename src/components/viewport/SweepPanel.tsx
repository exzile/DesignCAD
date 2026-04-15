import { X, Check } from 'lucide-react';
import { useCADStore } from '../../store/cadStore';

export default function SweepPanel() {
  const activeTool = useCADStore((s) => s.activeTool);
  const sketches = useCADStore((s) => s.sketches);

  const profileId = useCADStore((s) => s.sweepProfileSketchId);
  const setProfileId = useCADStore((s) => s.setSweepProfileSketchId);
  const pathId = useCADStore((s) => s.sweepPathSketchId);
  const setPathId = useCADStore((s) => s.setSweepPathSketchId);
  const bodyKind = useCADStore((s) => s.sweepBodyKind);
  const setBodyKind = useCADStore((s) => s.setSweepBodyKind);

  // D71 upgrades
  const orientation = useCADStore((s) => s.sweepOrientation);
  const setOrientation = useCADStore((s) => s.setSweepOrientation);
  const twistAngle = useCADStore((s) => s.sweepTwistAngle);
  const setTwistAngle = useCADStore((s) => s.setSweepTwistAngle);
  const taperAngle = useCADStore((s) => s.sweepTaperAngle);
  const setTaperAngle = useCADStore((s) => s.setSweepTaperAngle);
  const guideRailId = useCADStore((s) => s.sweepGuideRailId);
  const setGuideRailId = useCADStore((s) => s.setSweepGuideRailId);

  const commitSweep = useCADStore((s) => s.commitSweep);
  const cancelSweepTool = useCADStore((s) => s.cancelSweepTool);

  if (activeTool !== 'sweep') return null;

  const available = sketches.filter((s) => s.entities.length > 0);
  const canCommit = !!profileId && !!pathId && profileId !== pathId;

  return (
    <div className="extrude-panel">
      <div className="sketch-palette-header">
        <span className="sketch-palette-dot" style={{ background: '#a78bfa' }} />
        <span className="sketch-palette-title">SWEEP</span>
        <button className="sketch-palette-close" onClick={cancelSweepTool} title="Cancel">
          <X size={12} />
        </button>
      </div>

      <div className="sketch-palette-body">
        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Profile</span>
          <select className="measure-select" value={profileId ?? ''}
            onChange={(e) => setProfileId(e.target.value || null)}>
            <option value="" disabled>Select profile sketch</option>
            {available.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Path</span>
          <select className="measure-select" value={pathId ?? ''}
            onChange={(e) => setPathId(e.target.value || null)}>
            <option value="" disabled>Select path sketch</option>
            {available.filter((s) => s.id !== profileId)
              .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Guide Rail</span>
          <select className="measure-select" value={guideRailId ?? ''}
            onChange={(e) => setGuideRailId(e.target.value || null)}>
            <option value="">— none —</option>
            {available.filter((s) => s.id !== profileId && s.id !== pathId)
              .map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Orientation</span>
          <select className="measure-select" value={orientation}
            onChange={(e) => setOrientation(e.target.value as 'perpendicular' | 'parallel')}>
            <option value="perpendicular">Perpendicular to Path</option>
            <option value="parallel">Parallel (Fixed)</option>
          </select>
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Twist (°)</span>
          <input type="number" className="measure-input" value={twistAngle} step={5}
            onChange={(e) => setTwistAngle(Number(e.target.value))}
            style={{ width: 70 }} />
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Taper (°)</span>
          <input type="number" className="measure-input" value={taperAngle}
            step={1} min={-45} max={45}
            onChange={(e) => setTaperAngle(Number(e.target.value))}
            style={{ width: 70 }} />
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Output</span>
          <select className="measure-select" value={bodyKind}
            onChange={(e) => setBodyKind(e.target.value as 'solid' | 'surface')}>
            <option value="solid">Solid Body</option>
            <option value="surface">Surface Body</option>
          </select>
        </div>

        <div className="extrude-panel-actions">
          <button className="btn btn-secondary" onClick={cancelSweepTool}>
            <X size={14} /> Cancel
          </button>
          <button className="btn btn-primary" onClick={commitSweep} disabled={!canCommit}>
            <Check size={14} /> OK
          </button>
        </div>
      </div>
    </div>
  );
}
