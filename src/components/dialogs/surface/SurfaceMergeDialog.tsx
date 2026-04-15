import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function SurfaceMergeDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);

  const [mergeType, setMergeType] = useState<'tangent' | 'curvature' | 'position'>('tangent');
  const [tolerance, setTolerance] = useState(0.01);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Surface Merge')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Surface Merge ${n}`,
      type: 'thicken',
      params: { isSurfaceMerge: true, mergeType, tolerance },
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
          <span className="dialog-title">Merge (Surface)</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label className="dialog-label">Merge Type</label>
            <select
              className="dialog-input"
              value={mergeType}
              onChange={(e) => setMergeType(e.target.value as 'tangent' | 'curvature' | 'position')}
            >
              <option value="tangent">Tangent</option>
              <option value="curvature">Curvature</option>
              <option value="position">Position</option>
            </select>
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Tolerance (mm)</label>
            <input
              className="dialog-input"
              type="number"
              min={0.001}
              max={1.0}
              step={0.001}
              value={tolerance}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v)) setTolerance(Math.min(1.0, Math.max(0.001, v)));
              }}
            />
          </div>
          <p className="dialog-hint">Select surfaces to merge into a single quilt face.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
