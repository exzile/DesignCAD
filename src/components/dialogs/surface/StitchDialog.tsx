import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function StitchDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const [stitchTolerance, setStitchTolerance] = useState(0.001);
  const [convertToSolid, setConvertToSolid] = useState(true);
  const [keepOriginal, setKeepOriginal] = useState(false);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Stitch')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Stitch ${n}`,
      type: 'thicken',
      params: { stitchTolerance, convertToSolid, keepOriginal, isStitch: true },
      visible: true,
      suppressed: false,
      timestamp: Date.now(),
    });
    setStatusMessage(`Stitch ${n}: tolerance ${stitchTolerance}mm${convertToSolid ? ', convert to solid' : ''}`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Stitch</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Tolerance (mm)</label>
            <input type="number" value={stitchTolerance} onChange={(e) => setStitchTolerance(parseFloat(e.target.value) || 0.001)} step={0.001} min={0.0001} />
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={convertToSolid} onChange={(e) => setConvertToSolid(e.target.checked)} />
            Convert to Solid (if watertight)
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={keepOriginal} onChange={(e) => setKeepOriginal(e.target.checked)} />
            Keep Original Surfaces
          </label>
          <p className="dialog-hint">Select the surfaces/quilts to stitch together in the viewport.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
