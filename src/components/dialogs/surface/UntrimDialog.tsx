import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function UntrimDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);

  const [untrimType, setUntrimType] = useState<'extend' | 'fill'>('extend');
  const [mergeAdjacent, setMergeAdjacent] = useState(true);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Untrim')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Untrim ${n}`,
      type: 'sweep',
      params: { isUntrim: true, untrimType, mergeAdjacent },
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
          <span className="dialog-title">Untrim</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label className="dialog-label">Untrim Type</label>
            <select
              className="dialog-input"
              value={untrimType}
              onChange={(e) => setUntrimType(e.target.value as 'extend' | 'fill')}
            >
              <option value="extend">Extend</option>
              <option value="fill">Fill</option>
            </select>
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={mergeAdjacent}
              onChange={(e) => setMergeAdjacent(e.target.checked)}
            />
            Merge Adjacent Faces
          </label>
          <p className="dialog-hint">Select trimmed edges or surfaces to untrim in the viewport.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
