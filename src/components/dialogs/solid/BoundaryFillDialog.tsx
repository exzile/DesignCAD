import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import type { Feature } from '../../../types/cad';

export function BoundaryFillDialog({ onClose }: { onClose: () => void }) {
  const [fillType, setFillType] = useState<'between-surfaces' | 'enclosed-volume'>('between-surfaces');
  const [operation, setOperation] = useState<'new-body' | 'join' | 'cut'>('new-body');
  const [target, setTarget] = useState('');
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const boundaryFillCount = features.filter((f) => f.params?.isBoundaryFill).length + 1;

  const handleApply = () => {
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Boundary Fill ${boundaryFillCount}`,
      type: 'extrude',
      params: { fillType, operation, isBoundaryFill: true, target },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    addFeature(feature);
    setStatusMessage(`Created Boundary Fill ${boundaryFillCount} (${fillType}, ${operation})`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Boundary Fill</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Fill Type</label>
            <select value={fillType} onChange={(e) => setFillType(e.target.value as 'between-surfaces' | 'enclosed-volume')}>
              <option value="between-surfaces">Between Surfaces</option>
              <option value="enclosed-volume">Enclosed Volume</option>
            </select>
          </div>
          <div className="form-group">
            <label>Operation</label>
            <select value={operation} onChange={(e) => setOperation(e.target.value as 'new-body' | 'join' | 'cut')}>
              <option value="new-body">New Body</option>
              <option value="join">Join</option>
              <option value="cut">Cut</option>
            </select>
          </div>
          <div className="form-group">
            <label>Target (optional)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Select boundary surfaces in viewport"
            />
          </div>
          <p className="dialog-hint">Select intersecting surfaces or bodies that define the enclosed region to fill.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
