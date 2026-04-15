import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import type { Feature, BooleanOperation } from '../../../types/cad';

export function CombineDialog({ onClose }: { onClose: () => void }) {
  const [operation, setOperation] = useState<BooleanOperation>('join');
  const [keepTools, setKeepTools] = useState(false);

  const addFeature = useCADStore((s) => s.addFeature);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const handleApply = () => {
    const feature: Feature = {
      id: crypto.randomUUID(),
      name: `Combine (${operation})`,
      type: 'combine',
      params: { operation, keepTools },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    };
    addFeature(feature);
    setStatusMessage(`Created ${operation} operation${keepTools ? ' (keep tools)' : ''}`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Combine Bodies</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Operation</label>
            <select value={operation} onChange={(e) => setOperation(e.target.value as BooleanOperation)}>
              <option value="join">Join (Union)</option>
              <option value="cut">Cut (Subtract)</option>
              <option value="intersect">Intersect</option>
            </select>
          </div>
          <div className="boolean-preview">
            <div className="boolean-diagram">
              {operation === 'join' && <div className="bool-icon join">A + B</div>}
              {operation === 'cut' && <div className="bool-icon cut">A - B</div>}
              {operation === 'intersect' && <div className="bool-icon intersect">A &cap; B</div>}
            </div>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={keepTools} onChange={(e) => setKeepTools(e.target.checked)} />
            Keep Tools (preserve tool bodies)
          </label>
          <p className="dialog-hint">Select a target body and a tool body in the viewport.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
