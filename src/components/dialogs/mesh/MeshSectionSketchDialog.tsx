import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function MeshSectionSketchDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);
  const [plane, setPlane] = useState<'XY' | 'XZ' | 'YZ' | 'Custom'>('XY');
  const [offset, setOffset] = useState(0);
  const [createSketch, setCreateSketch] = useState(true);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Mesh Section')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Mesh Section ${n}`,
      type: 'sketch',
      params: { meshSectionSketch: true, plane, offset, createSketch },
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
          <span className="dialog-title">Mesh Section Sketch</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Plane</label>
            <select value={plane} onChange={(e) => setPlane(e.target.value as typeof plane)}>
              <option value="XY">XY</option>
              <option value="XZ">XZ</option>
              <option value="YZ">YZ</option>
              <option value="Custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label>Offset (mm)</label>
            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="form-group form-group-inline">
            <label>Create Sketch</label>
            <input
              type="checkbox"
              checked={createSketch}
              onChange={(e) => setCreateSketch(e.target.checked)}
            />
          </div>
          <p className="dialog-hint">Intersects the mesh with the selected plane to create a polyline sketch.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
