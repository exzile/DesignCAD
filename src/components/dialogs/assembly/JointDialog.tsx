import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import { useComponentStore } from '../../../store/componentStore';
import * as THREE from 'three';

export function JointDialog({ onClose }: { onClose: () => void }) {
  const [jointType, setJointType] = useState('rigid');
  const [name, setName] = useState('Joint 1');
  const [rotMin, setRotMin] = useState(-180);
  const [rotMax, setRotMax] = useState(180);
  const [transMin, setTransMin] = useState(0);
  const [transMax, setTransMax] = useState(50);

  const addJoint = useComponentStore((s) => s.addJoint);
  const activeComponentId = useComponentStore((s) => s.activeComponentId);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const handleApply = () => {
    addJoint({
      name,
      type: jointType as any,
      componentId1: activeComponentId,
      componentId2: activeComponentId,
      origin: new THREE.Vector3(0, 0, 0),
      axis: new THREE.Vector3(0, 1, 0),
      rotationLimits: ['revolute', 'cylindrical'].includes(jointType)
        ? { min: rotMin, max: rotMax } : undefined,
      translationLimits: ['slider', 'cylindrical', 'pin-slot'].includes(jointType)
        ? { min: transMin, max: transMax } : undefined,
      rotationValue: 0,
      translationValue: 0,
      locked: false,
    });

    setStatusMessage(`Created ${jointType} joint: ${name}`);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <h3>Joint</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Joint Type</label>
            <select value={jointType} onChange={(e) => setJointType(e.target.value)}>
              <option value="rigid">Rigid</option>
              <option value="revolute">Revolute (Rotation)</option>
              <option value="slider">Slider (Translation)</option>
              <option value="cylindrical">Cylindrical</option>
              <option value="pin-slot">Pin-Slot</option>
              <option value="planar">Planar</option>
              <option value="ball">Ball</option>
            </select>
          </div>
          {['revolute', 'cylindrical'].includes(jointType) && (
            <div className="settings-grid">
              <div className="form-group">
                <label>Rotation Min (deg)</label>
                <input type="number" value={rotMin} onChange={(e) => setRotMin(parseFloat(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Rotation Max (deg)</label>
                <input type="number" value={rotMax} onChange={(e) => setRotMax(parseFloat(e.target.value))} />
              </div>
            </div>
          )}
          {['slider', 'cylindrical', 'pin-slot'].includes(jointType) && (
            <div className="settings-grid">
              <div className="form-group">
                <label>Translation Min (mm)</label>
                <input type="number" value={transMin} onChange={(e) => setTransMin(parseFloat(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Translation Max (mm)</label>
                <input type="number" value={transMax} onChange={(e) => setTransMax(parseFloat(e.target.value))} />
              </div>
            </div>
          )}
          <p className="dialog-hint">Select two components to connect with this joint.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
