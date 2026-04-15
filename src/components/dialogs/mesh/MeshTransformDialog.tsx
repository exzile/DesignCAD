import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

type TransformMode = 'Move' | 'Copy' | 'Scale';

export function MeshTransformDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const [mode, setMode] = useState<TransformMode>('Move');
  const isScale = mode === 'Scale';
  const [x, setX] = useState(isScale ? 1 : 0);
  const [y, setY] = useState(isScale ? 1 : 0);
  const [z, setZ] = useState(isScale ? 1 : 0);
  const [uniform, setUniform] = useState(true);

  const handleModeChange = (newMode: TransformMode) => {
    setMode(newMode);
    const defaultVal = newMode === 'Scale' ? 1 : 0;
    setX(defaultVal);
    setY(defaultVal);
    setZ(defaultVal);
  };

  const handleXChange = (val: number) => {
    setX(val);
    if (isScale && uniform) {
      setY(val);
      setZ(val);
    }
  };

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith(`Mesh ${mode}`)).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Mesh ${mode} ${n}`,
      type: 'import',
      params: { isMeshTransform: true, mode, x, y, z, uniform },
      bodyKind: 'mesh',
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    });
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-panel">
        <div className="dialog-header">
          <span className="dialog-title">Mesh Transform</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Mode</label>
            <select value={mode} onChange={(e) => handleModeChange(e.target.value as TransformMode)}>
              <option value="Move">Move</option>
              <option value="Copy">Copy</option>
              <option value="Scale">Scale</option>
            </select>
          </div>
          <div className="form-group">
            <label>X ({isScale ? 'scale' : 'mm'})</label>
            <input
              type="number"
              step={isScale ? 0.1 : 1}
              value={x}
              onChange={(e) => handleXChange(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-group">
            <label>Y ({isScale ? 'scale' : 'mm'})</label>
            <input
              type="number"
              step={isScale ? 0.1 : 1}
              value={y}
              onChange={(e) => setY(parseFloat(e.target.value) || 0)}
              disabled={isScale && uniform}
            />
          </div>
          <div className="form-group">
            <label>Z ({isScale ? 'scale' : 'mm'})</label>
            <input
              type="number"
              step={isScale ? 0.1 : 1}
              value={z}
              onChange={(e) => setZ(parseFloat(e.target.value) || 0)}
              disabled={isScale && uniform}
            />
          </div>
          {isScale && (
            <div className="form-group form-group-inline">
              <label>Uniform Scale</label>
              <input
                type="checkbox"
                checked={uniform}
                onChange={(e) => setUniform(e.target.checked)}
              />
            </div>
          )}
          <p className="dialog-hint">Moves, copies, or scales the mesh body.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
