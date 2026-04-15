import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function ConvertMeshToBRepDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const [conversionMode, setConversionMode] = useState<'Facet' | 'Prismatic' | 'Organic'>('Facet');
  const [mergeCoplanar, setMergeCoplanar] = useState(true);
  const [tolerance, setTolerance] = useState(0.01);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Convert to BRep')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Convert to BRep ${n}`,
      type: 'import',
      params: { isConvertMeshToBRep: true, conversionMode, mergeCoplanar, tolerance },
      bodyKind: 'solid',
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
          <span className="dialog-title">Convert Mesh to BRep</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Conversion Mode</label>
            <select value={conversionMode} onChange={(e) => setConversionMode(e.target.value as typeof conversionMode)}>
              <option value="Facet">Facet</option>
              <option value="Prismatic">Prismatic</option>
              <option value="Organic">Organic</option>
            </select>
          </div>
          <div className="form-group form-group-inline">
            <label>Merge Coplanar Faces</label>
            <input
              type="checkbox"
              checked={mergeCoplanar}
              onChange={(e) => setMergeCoplanar(e.target.checked)}
            />
          </div>
          <div className="form-group">
            <label>Tolerance (0.001–1.0)</label>
            <input
              type="number"
              min={0.001}
              max={1.0}
              step={0.001}
              value={tolerance}
              onChange={(e) => setTolerance(Math.min(1.0, Math.max(0.001, parseFloat(e.target.value) || 0.01)))}
            />
          </div>
          <p className="dialog-hint">Converts the mesh body into a solid BRep. Facet mode is fastest (one triangle = one face).</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
