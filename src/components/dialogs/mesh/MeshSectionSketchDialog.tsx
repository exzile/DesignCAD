import { useState } from 'react';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';

export function MeshSectionSketchDialog({ onClose }: { onClose: () => void }) {
  const features = useCADStore((s) => s.features);
  const commitMeshSectionSketch = useCADStore((s) => s.commitMeshSectionSketch);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const meshFeatures = features.filter((f) => f.mesh != null);
  const [featureId, setFeatureId] = useState(meshFeatures[0]?.id ?? '');
  const [plane, setPlane] = useState<'XY' | 'XZ' | 'YZ'>('XY');
  const [offset, setOffset] = useState(0);
  const [done, setDone] = useState(false);

  // Plane definitions: normal, then constant = -offset into the plane equation n·x = d
  const planeConfigs: Record<string, { normal: THREE.Vector3 }> = {
    XY: { normal: new THREE.Vector3(0, 1, 0) },
    XZ: { normal: new THREE.Vector3(0, 0, 1) },
    YZ: { normal: new THREE.Vector3(1, 0, 0) },
  };

  const handleOK = () => {
    if (!featureId) {
      setStatusMessage('Mesh Section Sketch: select a feature first');
      return;
    }
    const { normal } = planeConfigs[plane];
    // THREE.Plane: normal·point + constant = 0 → constant = -offset
    const threePlane = new THREE.Plane(normal.clone(), -offset);
    commitMeshSectionSketch(featureId, threePlane);
    setDone(true);
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog-panel">
        <div className="dialog-header">
          <span className="dialog-title">Mesh Section Sketch</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          {done ? (
            <p className="dialog-hint" style={{ color: 'var(--color-success, #22c55e)' }}>
              Section sketch created successfully.
            </p>
          ) : (
            <>
              <div className="form-group">
                <label>Feature</label>
                <select value={featureId} onChange={(e) => setFeatureId(e.target.value)}>
                  {meshFeatures.length === 0 && <option value="">No mesh features</option>}
                  {meshFeatures.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Plane</label>
                <select value={plane} onChange={(e) => setPlane(e.target.value as typeof plane)}>
                  <option value="XY">XY (horizontal)</option>
                  <option value="XZ">XZ (front vertical)</option>
                  <option value="YZ">YZ (side vertical)</option>
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
              <p className="dialog-hint">Intersects the mesh with the plane to create a polyline sketch.</p>
            </>
          )}
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>{done ? 'Close' : 'Cancel'}</button>
          {!done && <button className="btn btn-primary" onClick={handleOK}>OK</button>}
        </div>
      </div>
    </div>
  );
}
