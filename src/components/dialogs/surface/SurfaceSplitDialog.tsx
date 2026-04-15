import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function SurfaceSplitDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const [splitType, setSplitType] = useState<'split-face' | 'split-body'>('split-face');
  const [target, setTarget] = useState('');
  const [tool, setTool] = useState('');
  const [keepBothSides, setKeepBothSides] = useState(true);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Surface Split')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Surface Split ${n}`,
      type: 'split-body',
      params: { splitType, target, tool, keepBothSides, isSurfaceSplit: true },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    });
    setStatusMessage(`Surface Split ${n}: ${splitType}`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Surface Split</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Split Type</label>
            <select value={splitType} onChange={(e) => setSplitType(e.target.value as 'split-face' | 'split-body')}>
              <option value="split-face">Split Face</option>
              <option value="split-body">Split Body</option>
            </select>
          </div>
          <div className="form-group">
            <label>Target</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="body or face to split"
            />
          </div>
          <div className="form-group">
            <label>Tool</label>
            <input
              type="text"
              value={tool}
              onChange={(e) => setTool(e.target.value)}
              placeholder="splitting surface or plane"
            />
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={keepBothSides} onChange={(e) => setKeepBothSides(e.target.checked)} />
            Keep Both Sides
          </label>
          <p className="dialog-hint">Select target geometry and the splitting tool in the viewport.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
