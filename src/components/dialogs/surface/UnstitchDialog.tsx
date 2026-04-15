import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function UnstitchDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const surfaceFeatures = features.filter(
    (f) => (f.params as Record<string, unknown>)?.bodyKind === 'surface' ||
            f.type === 'sweep' || f.type === 'extrude'
  );
  const [selectedId, setSelectedId] = useState<string>(surfaceFeatures[0]?.id ?? '');
  const [keepOriginal, setKeepOriginal] = useState(false);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Unstitch')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Unstitch ${n}`,
      type: 'split-body',
      params: { unstitch: true, keepOriginal, sourceFeatureId: selectedId },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    });
    setStatusMessage(`Unstitch ${n}: separated surface faces`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Unstitch</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          {surfaceFeatures.length === 0 ? (
            <p className="dialog-hint">No surface bodies found. Create a surface first.</p>
          ) : (
            <div className="form-group">
              <label>Body</label>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {surfaceFeatures.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
          <label className="checkbox-label">
            <input type="checkbox" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} />
            Keep Original Body
          </label>
          <p className="dialog-hint">Separates the selected stitched body back into individual face surfaces.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK} disabled={surfaceFeatures.length === 0 || !selectedId}>OK</button>
        </div>
      </div>
    </div>
  );
}
