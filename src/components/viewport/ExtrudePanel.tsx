import { X, Check } from 'lucide-react';
import {
  useCADStore,
  type ExtrudeDirection,
  type ExtrudeOperation,
} from '../../store/cadStore';
import ExpressionInput from '../ui/ExpressionInput';
import { GeometryEngine } from '../../engine/GeometryEngine';

export default function ExtrudePanel() {
  const activeTool = useCADStore((s) => s.activeTool);
  const sketches = useCADStore((s) => s.sketches);
  const selectedIds = useCADStore((s) => s.extrudeSelectedSketchIds);
  const setSelectedIds = useCADStore((s) => s.setExtrudeSelectedSketchIds);
  const distance = useCADStore((s) => s.extrudeDistance);
  const setDistance = useCADStore((s) => s.setExtrudeDistance);
  const direction = useCADStore((s) => s.extrudeDirection);
  const setDirection = useCADStore((s) => s.setExtrudeDirection);
  const operation = useCADStore((s) => s.extrudeOperation);
  const setOperation = useCADStore((s) => s.setExtrudeOperation);
  const commitExtrude = useCADStore((s) => s.commitExtrude);
  const cancelExtrudeTool = useCADStore((s) => s.cancelExtrudeTool);
  const thinEnabled = useCADStore((s) => s.extrudeThinEnabled);
  const setThinEnabled = useCADStore((s) => s.setExtrudeThinEnabled);
  const thinThickness = useCADStore((s) => s.extrudeThinThickness);
  const setThinThickness = useCADStore((s) => s.setExtrudeThinThickness);
  const thinSide = useCADStore((s) => s.extrudeThinSide);
  const setThinSide = useCADStore((s) => s.setExtrudeThinSide);
  const startType = useCADStore((s) => s.extrudeStartType);
  const setStartType = useCADStore((s) => s.setExtrudeStartType);
  const startOffset = useCADStore((s) => s.extrudeStartOffset);
  const setStartOffset = useCADStore((s) => s.setExtrudeStartOffset);
  const extentType = useCADStore((s) => s.extrudeExtentType);
  const setExtentType = useCADStore((s) => s.setExtrudeExtentType);
  const taperAngle = useCADStore((s) => s.extrudeTaperAngle);
  const setTaperAngle = useCADStore((s) => s.setExtrudeTaperAngle);
  const bodyKind = useCADStore((s) => s.extrudeBodyKind);
  const setBodyKind = useCADStore((s) => s.setExtrudeBodyKind);
  const units = useCADStore((s) => s.units);

  const extrudable = sketches.filter((s) => s.entities.length > 0);
  const profileOptions = extrudable.flatMap((sketch) => {
    const count = GeometryEngine.sketchToShapes(sketch).length;
    return Array.from({ length: count }, (_, index) => ({
      id: `${sketch.id}::${index}`,
      label: `${sketch.name} • Profile ${index + 1}`,
      sketchId: sketch.id,
    })).filter(({ sketchId, id }) => {
      const source = extrudable.find((s) => s.id === sketchId);
      if (!source) return false;
      const profileIndex = Number(id.split('::')[1]);
      return Number.isFinite(profileIndex) && GeometryEngine.createProfileSketch(source, profileIndex) !== null;
    });
  });

  const selectedSketches = selectedIds
    .map((id) => {
      const [sketchId] = id.split('::');
      return extrudable.find((s) => s.id === sketchId);
    })
    .filter(Boolean) as typeof extrudable;

  const allClosedProfiles = selectedSketches.length > 0 && selectedSketches.every((s) => GeometryEngine.isSketchClosedProfile(s));
  const effectiveBodyKind: 'solid' | 'surface' = allClosedProfiles ? bodyKind : 'surface';
  const isCutMode = distance < 0;
  const canCommit = selectedIds.length > 0 && (extentType === 'all' || Math.abs(distance) > 0.01);
  const effectiveOperation = isCutMode ? 'cut' : operation;

  if (activeTool !== 'extrude' || selectedIds.length === 0) return null;

  return (
    <div className="extrude-panel">
      <div className="sketch-palette-header">
        <span
          className="sketch-palette-dot"
          style={{ background: isCutMode ? '#ef4444' : '#3b82f6' }}
        />
        <span className="sketch-palette-title">{isCutMode ? 'PRESS-PULL CUT' : 'EXTRUDE'}</span>
        <button
          className="sketch-palette-close"
          onClick={cancelExtrudeTool}
          title="Cancel"
        >
          <X size={12} />
        </button>
      </div>

      <div className="sketch-palette-body">
        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Profiles</span>
          <select
            className="measure-select"
            value={selectedIds}
            multiple
            size={Math.min(6, Math.max(2, profileOptions.length))}
            onChange={(e) => {
              const ids = Array.from(e.currentTarget.selectedOptions).map((o) => o.value);
              setSelectedIds(ids);
            }}
          >
            {profileOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Direction</span>
          <select
            className="measure-select"
            value={direction}
            onChange={(e) => setDirection(e.target.value as ExtrudeDirection)}
          >
            <option value="normal">One Side</option>
            <option value="symmetric">Symmetric</option>
            <option value="reverse">Reversed</option>
          </select>
        </div>

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Start</span>
          <select
            className="measure-select"
            value={startType}
            onChange={(e) => setStartType(e.target.value as 'profile' | 'offset')}
          >
            <option value="profile">Profile Plane</option>
            <option value="offset">Offset</option>
          </select>
        </div>
        {startType === 'offset' && (
          <div className="sketch-palette-row">
            <span className="sketch-palette-label">Offset</span>
            <div className="extrude-input">
              <ExpressionInput value={startOffset} onChange={setStartOffset} step={0.1} />
              <span className="extrude-unit">{units}</span>
            </div>
          </div>
        )}

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Extent</span>
          <select
            className="measure-select"
            value={extentType}
            onChange={(e) => setExtentType(e.target.value as 'distance' | 'all')}
          >
            <option value="distance">Distance</option>
            <option value="all">All</option>
          </select>
        </div>

        {extentType === 'distance' && (
          <div className="sketch-palette-row">
            <span className="sketch-palette-label">Distance</span>
            <div className="extrude-input">
              <ExpressionInput value={distance} onChange={setDistance} step={0.1} />
              <span className="extrude-unit">{units}</span>
            </div>
          </div>
        )}

        {effectiveBodyKind === 'solid' && (
          <>
            <div className="sketch-palette-row">
              <span className="sketch-palette-label">Operation</span>
              <select
                className="measure-select"
                value={effectiveOperation}
                disabled={isCutMode}
                title={isCutMode ? 'Negative distance → auto-switched to Cut' : undefined}
                onChange={(e) => setOperation(e.target.value as ExtrudeOperation)}
              >
                <option value="new-body">New Body</option>
                <option value="join">Join</option>
                <option value="cut">Cut</option>
              </select>
            </div>

            <div className="sketch-palette-row">
              <span className="sketch-palette-label">Taper</span>
              <div className="extrude-input">
                <input
                  type="number"
                  step="0.5"
                  min="-89"
                  max="89"
                  value={taperAngle}
                  onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v)) setTaperAngle(Math.max(-89, Math.min(89, v))); }}
                />
                <span className="extrude-unit">°</span>
              </div>
            </div>

            <div className="sketch-palette-row">
              <span className="sketch-palette-label">Thin Extrude</span>
              <label className="sketch-palette-check">
                <input type="checkbox" checked={thinEnabled} onChange={() => setThinEnabled(!thinEnabled)} />
                <span className="sketch-palette-checkmark" />
              </label>
            </div>
            {thinEnabled && (
              <>
                <div className="sketch-palette-row">
                  <span className="sketch-palette-label">Thickness</span>
                  <div className="extrude-input">
                    <input
                      type="number"
                      step="0.1"
                      min="0.01"
                      value={thinThickness}
                      onChange={(e) => { const v = Number(e.target.value); if (!Number.isNaN(v) && v > 0) setThinThickness(v); }}
                    />
                    <span className="extrude-unit">{units}</span>
                  </div>
                </div>
                <div className="sketch-palette-row">
                  <span className="sketch-palette-label">Side</span>
                  <select
                    className="measure-select"
                    value={thinSide}
                    onChange={(e) => setThinSide(e.target.value as 'inside' | 'outside' | 'center')}
                  >
                    <option value="inside">Inside</option>
                    <option value="outside">Outside</option>
                    <option value="center">Center</option>
                  </select>
                </div>
              </>
            )}
          </>
        )}

        <div className="sketch-palette-row">
          <span className="sketch-palette-label">Output</span>
          <select
            className="measure-select"
            value={effectiveBodyKind}
            onChange={(e) => setBodyKind(e.target.value as 'solid' | 'surface')}
          >
            <option value="solid" disabled={!allClosedProfiles}>Solid Body</option>
            <option value="surface">Surface Body</option>
          </select>
        </div>

        <div className="extrude-panel-actions">
          <button className="btn btn-secondary" onClick={cancelExtrudeTool}>
            <X size={14} /> Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={commitExtrude}
            disabled={!canCommit}
          >
            <Check size={14} /> OK
          </button>
        </div>
      </div>
    </div>
  );
}
