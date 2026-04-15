import { useState } from 'react';
import { X } from 'lucide-react';

export interface DirectEditParams {
  mode: 'offset-face' | 'extrude' | 'taper';
  distance: number;
  tapAngle?: number;
  faceId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (params: DirectEditParams) => void;
  selectedFaceInfo?: string;
}

export default function DirectEditDialog({ open, onClose, onConfirm, selectedFaceInfo }: Props) {
  const [mode, setMode] = useState<'offset-face' | 'extrude' | 'taper'>('offset-face');
  const [distance, setDistance] = useState(10);
  const [tapAngle, setTapAngle] = useState(0);

  if (!open) return null;

  const handleOK = () => {
    const params: DirectEditParams = { mode, distance };
    if (mode === 'taper') params.tapAngle = tapAngle;
    onConfirm(params);
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Direct Edit</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          {selectedFaceInfo && (
            <p className="dialog-hint" style={{ marginBottom: 12 }}>
              Editing: {selectedFaceInfo}
            </p>
          )}

          <div className="form-group">
            <label>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'offset-face' | 'extrude' | 'taper')}>
              <option value="offset-face">Offset Face</option>
              <option value="extrude">Extrude</option>
              <option value="taper">Taper</option>
            </select>
          </div>

          <div className="form-group">
            <label>Distance (mm)</label>
            <input
              type="number"
              value={distance}
              onChange={(e) => setDistance(Math.max(-500, Math.min(500, parseFloat(e.target.value) || 10)))}
              min={-500}
              max={500}
              step={0.5}
            />
          </div>

          {mode === 'taper' && (
            <div className="form-group">
              <label>Taper Angle (°)</label>
              <input
                type="number"
                value={tapAngle}
                onChange={(e) => setTapAngle(Math.max(-45, Math.min(45, parseFloat(e.target.value) || 0)))}
                min={-45}
                max={45}
                step={1}
              />
            </div>
          )}

          <p className="dialog-hint">Changes are applied live. Click OK to commit.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
