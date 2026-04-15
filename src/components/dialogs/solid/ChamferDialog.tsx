import { useState } from 'react';
import { X } from 'lucide-react';

export type ChamferMode = 'equal-dist' | 'two-dist' | 'dist-angle';

export interface ChamferParams {
  mode: ChamferMode;
  distance: number;
  distance2?: number;
  angle?: number;
  edgeIds: string[];
  propagate: boolean;
}

interface ChamferDialogProps {
  open: boolean;
  selectedEdgeCount: number;
  onClose: () => void;
  onConfirm: (params: ChamferParams) => void;
}

export default function ChamferDialog({ open, selectedEdgeCount, onClose, onConfirm }: ChamferDialogProps) {
  const [mode, setMode] = useState<ChamferMode>('equal-dist');
  const [distance, setDistance] = useState(2);
  const [distance2, setDistance2] = useState(2);
  const [angle, setAngle] = useState(45);
  const [propagate, setPropagate] = useState(true);

  if (!open) return null;

  const handleOK = () => {
    const params: ChamferParams = {
      mode,
      distance,
      edgeIds: [],
      propagate,
    };
    if (mode === 'two-dist') {
      params.distance2 = distance2;
    }
    if (mode === 'dist-angle') {
      params.angle = angle;
    }
    onConfirm(params);
  };

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Chamfer</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <p className="dialog-hint" style={{ marginBottom: 12 }}>
            {selectedEdgeCount} edge(s) selected
          </p>

          <div className="form-group">
            <label>Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ChamferMode)}
            >
              <option value="equal-dist">Equal Distance</option>
              <option value="two-dist">Two Distances</option>
              <option value="dist-angle">Distance + Angle</option>
            </select>
          </div>

          <div className="form-group">
            <label>Distance (mm)</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(clamp(parseFloat(e.target.value) || 2, 0.01, 500))}
              min={0.01}
              max={500}
              step={0.5}
            />
          </div>

          {mode === 'two-dist' && (
            <div className="form-group">
              <label>Distance 2 (mm)</label>
              <input
                type="number"
                value={distance2}
                onChange={(e) => setDistance2(clamp(parseFloat(e.target.value) || 2, 0.01, 500))}
                min={0.01}
                max={500}
                step={0.5}
              />
            </div>
          )}

          {mode === 'dist-angle' && (
            <div className="form-group">
              <label>Angle (°)</label>
              <input
                type="number"
                value={angle}
                onChange={(e) => setAngle(clamp(parseFloat(e.target.value) || 45, 1, 89))}
                min={1}
                max={89}
                step={1}
              />
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={propagate}
                onChange={(e) => setPropagate(e.target.checked)}
              />
              Propagate Along Tangent Edges
            </label>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleOK}
            disabled={selectedEdgeCount === 0}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
