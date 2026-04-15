// Boss: cylindrical boss (raised hub for screw attachment)
// Params: diameter, height, wallThickness, draftAngle, headFillet
import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function BossDialog({ onClose }: { onClose: () => void }) {
  const commitBoss = useCADStore((s) => s.commitBoss);
  const closeBossDialog = useCADStore((s) => s.closeBossDialog);

  const [diameter, setDiameter] = useState(8);
  const [height, setHeight] = useState(10);
  const [wallThickness, setWallThickness] = useState(1.5);
  const [draftAngle, setDraftAngle] = useState(1);
  const [headFillet, setHeadFillet] = useState(0.5);

  const handleClose = () => {
    closeBossDialog();
    onClose();
  };

  const handleApply = () => {
    commitBoss({ diameter, height, wallThickness, draftAngle, headFillet });
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Boss</h3>
          <button className="dialog-close" onClick={handleClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="settings-grid">
            <div className="form-group">
              <label>Diameter (mm)</label>
              <input
                type="number"
                value={diameter}
                onChange={(e) => setDiameter(Math.max(0.5, parseFloat(e.target.value) || 8))}
                step={0.5}
                min={0.5}
              />
            </div>
            <div className="form-group">
              <label>Height (mm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(0.5, parseFloat(e.target.value) || 10))}
                step={0.5}
                min={0.5}
              />
            </div>
          </div>
          <div className="settings-grid">
            <div className="form-group">
              <label>Wall Thickness (mm)</label>
              <input
                type="number"
                value={wallThickness}
                onChange={(e) => setWallThickness(Math.max(0.1, parseFloat(e.target.value) || 1.5))}
                step={0.1}
                min={0.1}
              />
            </div>
            <div className="form-group">
              <label>Draft Angle (°)</label>
              <input
                type="number"
                value={draftAngle}
                onChange={(e) => setDraftAngle(Math.max(0, Math.min(45, parseFloat(e.target.value) || 1)))}
                step={0.5}
                min={0}
                max={45}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Head Fillet (mm)</label>
            <input
              type="number"
              value={headFillet}
              onChange={(e) => setHeadFillet(Math.max(0, parseFloat(e.target.value) || 0.5))}
              step={0.1}
              min={0}
            />
          </div>
          <p className="dialog-hint">Creates a hollow cylindrical boss (raised hub) for screw attachment, with optional draft taper.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={handleClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
