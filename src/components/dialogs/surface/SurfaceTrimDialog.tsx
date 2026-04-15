import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function SurfaceTrimDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const [trimmingTools, setTrimmingTools] = useState('');
  const [keep, setKeep] = useState<'first-half' | 'second-half' | 'both'>('first-half');
  const [removeInterior, setRemoveInterior] = useState(false);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Surface Trim')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Surface Trim ${n}`,
      type: 'split-body',
      params: { trimmingTools, keep, removeInterior, isSurfaceTrim: true },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    });
    setStatusMessage(`Surface Trim ${n}: keep ${keep}`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Surface Trim</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Trimming Tools</label>
            <input
              type="text"
              value={trimmingTools}
              onChange={(e) => setTrimmingTools(e.target.value)}
              placeholder="Select trimming surfaces/edges"
            />
          </div>
          <div className="form-group">
            <label>Keep</label>
            <select value={keep} onChange={(e) => setKeep(e.target.value as 'first-half' | 'second-half' | 'both')}>
              <option value="first-half">First Half</option>
              <option value="second-half">Second Half</option>
              <option value="both">Both</option>
            </select>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={removeInterior} onChange={(e) => setRemoveInterior(e.target.checked)} />
            Remove Interior
          </label>
          <p className="dialog-hint">Select the surface(s) to trim in the viewport, then specify trimming geometry.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
