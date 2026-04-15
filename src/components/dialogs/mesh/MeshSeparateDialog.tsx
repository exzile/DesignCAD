import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function MeshSeparateDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const [method, setMethod] = useState<'Disconnected Islands' | 'By Color' | 'By Normal'>('Disconnected Islands');
  const [keepAll, setKeepAll] = useState(true);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Mesh Separate')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Mesh Separate ${n}`,
      type: 'split-body',
      params: { isMeshSeparate: true, method, keepAll },
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
          <span className="dialog-title">Mesh Separate</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
              <option value="Disconnected Islands">Disconnected Islands</option>
              <option value="By Color">By Color</option>
              <option value="By Normal">By Normal</option>
            </select>
          </div>
          <div className="form-group form-group-inline">
            <label>Keep All</label>
            <input
              type="checkbox"
              checked={keepAll}
              onChange={(e) => setKeepAll(e.target.checked)}
            />
          </div>
          <p className="dialog-hint">Splits the mesh body into multiple bodies at disconnected islands.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
