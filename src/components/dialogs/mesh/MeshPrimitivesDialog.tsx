import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

type MeshPrimitiveKind = 'Box' | 'Sphere' | 'Cylinder' | 'Torus';

export function MeshPrimitivesDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const [kind, setKind] = useState<MeshPrimitiveKind>('Box');
  const [size, setSize] = useState(20);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith(`Mesh ${kind}`)).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Mesh ${kind} ${n}`,
      type: 'primitive',
      params: { kind, size, isMesh: true },
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
          <span className="dialog-title">Mesh Primitives</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as MeshPrimitiveKind)}>
              <option value="Box">Box</option>
              <option value="Sphere">Sphere</option>
              <option value="Cylinder">Cylinder</option>
              <option value="Torus">Torus</option>
            </select>
          </div>
          <div className="form-group">
            <label>Size (mm)</label>
            <input
              type="number"
              min={0.1}
              value={size}
              onChange={(e) => setSize(parseFloat(e.target.value) || 20)}
            />
          </div>
          <p className="dialog-hint">Creates a mesh body primitive (not a solid).</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
