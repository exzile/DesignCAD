import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import { useComponentStore } from '../../../store/componentStore';
import * as THREE from 'three';

export function ConstructionPlaneDialog({ onClose, initialMethod }: { onClose: () => void; initialMethod?: string }) {
  const [method, setMethod] = useState(initialMethod ?? 'offset');
  const [distance, setDistance] = useState(10);
  const [referencePlane, setReferencePlane] = useState('XY');
  const [angle, setAngle] = useState(45);

  const activeComponentId = useComponentStore((s) => s.activeComponentId ?? s.rootComponentId);
  const addConstruction = useComponentStore((s) => s.addConstruction);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const handleApply = () => {
    const normal = new THREE.Vector3(0, 0, 1);
    const origin = new THREE.Vector3(0, 0, 0);
    let name = 'Plane';

    if (method === 'offset') {
      switch (referencePlane) {
        case 'XY': normal.set(0, 0, 1); origin.set(0, 0, distance); break;
        case 'XZ': normal.set(0, 1, 0); origin.set(0, distance, 0); break;
        case 'YZ': normal.set(1, 0, 0); origin.set(distance, 0, 0); break;
      }
      name = `Offset Plane (${referencePlane} + ${distance}mm)`;
    } else if (method === 'angle') {
      const rad = (angle * Math.PI) / 180;
      switch (referencePlane) {
        case 'XY': normal.set(0, Math.sin(rad), Math.cos(rad)); break;
        case 'XZ': normal.set(Math.sin(rad), Math.cos(rad), 0); break;
        case 'YZ': normal.set(Math.cos(rad), 0, Math.sin(rad)); break;
      }
      name = `Angled Plane (${angle}deg from ${referencePlane})`;
    } else if (method === 'midplane') {
      origin.set(0, 0, distance / 2);
      name = 'Midplane';
    }

    addConstruction({
      name,
      type: 'plane',
      componentId: activeComponentId,
      visible: true,
      planeNormal: normal,
      planeOrigin: origin,
      planeSize: 50,
      definition: method === 'offset'
        ? { method: 'offset-plane', referencePlane, distance }
        : method === 'angle'
        ? { method: 'angle-plane', referencePlane, angle, axis: 'x' }
        : { method: 'midplane', plane1: 'XY', plane2: 'XY' },
    });

    setStatusMessage(`Created construction plane: ${name}`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h3>Construction Plane</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="offset">Offset Plane</option>
              <option value="angle">Plane at Angle</option>
              <option value="midplane">Midplane</option>
            </select>
          </div>
          <div className="form-group">
            <label>Reference Plane</label>
            <select value={referencePlane} onChange={(e) => setReferencePlane(e.target.value)}>
              <option value="XY">XY Plane</option>
              <option value="XZ">XZ Plane</option>
              <option value="YZ">YZ Plane</option>
            </select>
          </div>
          {method === 'offset' && (
            <div className="form-group">
              <label>Offset Distance (mm)</label>
              <input type="number" value={distance} onChange={(e) => setDistance(parseFloat(e.target.value) || 0)} step={1} />
            </div>
          )}
          {method === 'angle' && (
            <div className="form-group">
              <label>Angle (degrees)</label>
              <input type="number" value={angle} onChange={(e) => setAngle(parseFloat(e.target.value) || 0)} min={-180} max={180} step={5} />
            </div>
          )}
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
