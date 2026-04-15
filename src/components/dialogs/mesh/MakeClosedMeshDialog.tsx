import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function MakeClosedMeshDialog({ onClose }: { onClose: () => void }) {
  const features = useCADStore((s) => s.features);
  const commitMakeClosedMesh = useCADStore((s) => s.commitMakeClosedMesh);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const meshFeatures = features.filter((f) => f.mesh != null);
  const [featureId, setFeatureId] = useState(meshFeatures[0]?.id ?? '');

  const handleOK = () => {
    if (!featureId) {
      setStatusMessage('Make Closed Mesh: select a feature first');
      return;
    }
    commitMakeClosedMesh(featureId);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-panel">
        <div className="dialog-header">
          <span className="dialog-title">Make Closed Mesh</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Feature</label>
            <select value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
              {meshFeatures.length === 0 && <option value="">No mesh features</option>}
              {meshFeatures.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <p className="dialog-hint">Fills boundary loops to produce a watertight mesh.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
