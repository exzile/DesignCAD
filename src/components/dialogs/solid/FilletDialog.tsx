import { useState } from 'react';
import { X } from 'lucide-react';

export interface FilletParams {
  radius: number;
  edgeIds: string[];
  variable: boolean;
  startRadius?: number;
  endRadius?: number;
  setback: boolean;
  propagate: boolean;
}

interface FilletDialogProps {
  open: boolean;
  selectedEdgeCount: number;
  onClose: () => void;
  onConfirm: (params: FilletParams) => void;
}

export default function FilletDialog({ open, selectedEdgeCount, onClose, onConfirm }: FilletDialogProps) {
  const [radius, setRadius] = useState(2);
  const [variable, setVariable] = useState(false);
  const [startRadius, setStartRadius] = useState(1);
  const [endRadius, setEndRadius] = useState(4);
  const [setback, setSetback] = useState(false);
  const [propagate, setPropagate] = useState(true);

  if (!open) return null;

  const handleOK = () => {
    const params: FilletParams = {
      radius,
      edgeIds: [],
      variable,
      setback,
      propagate,
    };
    if (variable) {
      params.startRadius = startRadius;
      params.endRadius = endRadius;
    }
    onConfirm(params);
  };

  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Fillet</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <p className="dialog-hint" style={{ marginBottom: 12 }}>
            {selectedEdgeCount} edge(s) selected
          </p>

          {!variable && (
            <div className="form-group">
              <label>Radius (mm)</label>
              <input
                type="number"
                value={radius}
                onChange={(e) => setRadius(clamp(parseFloat(e.target.value) || 2, 0.01, 500))}
                min={0.01}
                max={500}
                step={0.5}
              />
            </div>
          )}

          {variable && (
            <div className="settings-grid">
              <div className="form-group">
                <label>Start Radius (mm)</label>
                <input
                  type="number"
                  value={startRadius}
                  onChange={(e) => setStartRadius(clamp(parseFloat(e.target.value) || 1, 0.01, 500))}
                  min={0.01}
                  max={500}
                  step={0.5}
                />
              </div>
              <div className="form-group">
                <label>End Radius (mm)</label>
                <input
                  type="number"
                  value={endRadius}
                  onChange={(e) => setEndRadius(clamp(parseFloat(e.target.value) || 4, 0.01, 500))}
                  min={0.01}
                  max={500}
                  step={0.5}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={variable}
                onChange={(e) => setVariable(e.target.checked)}
              />
              Variable Radius
            </label>
          </div>

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

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={setback}
                onChange={(e) => setSetback(e.target.checked)}
              />
              Setback
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
