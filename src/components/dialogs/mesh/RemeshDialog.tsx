import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function RemeshDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const [mode, setMode] = useState<'Refine' | 'Coarsen'>('Refine');
  const [iterations, setIterations] = useState(2);
  const [preserveShape, setPreserveShape] = useState(true);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Remesh')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Remesh ${n}`,
      type: 'import',
      params: { isRemesh: true, mode, iterations, preserveShape },
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
          <span className="dialog-title">Remesh</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Mode</label>
            <select value={mode} onChange={(e) => setMode(e.target.value as 'Refine' | 'Coarsen')}>
              <option value="Refine">Refine</option>
              <option value="Coarsen">Coarsen</option>
            </select>
          </div>
          <div className="form-group">
            <label>Iterations (1–5)</label>
            <input
              type="number"
              min={1}
              max={5}
              value={iterations}
              onChange={(e) => setIterations(Math.min(5, Math.max(1, parseInt(e.target.value, 10) || 2)))}
            />
          </div>
          <div className="form-group form-group-inline">
            <label>Preserve Shape</label>
            <input
              type="checkbox"
              checked={preserveShape}
              onChange={(e) => setPreserveShape(e.target.checked)}
            />
          </div>
          <p className="dialog-hint">Refines or coarsens mesh faces via subdivision or edge collapse.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
