import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function DriveJointsDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);

  const [jointType, setJointType] = useState('revolute');
  const [driveType, setDriveType] = useState('constant');
  const [value, setValue] = useState(0);
  const [duration, setDuration] = useState(5);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Drive Joints')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Drive Joints ${n}`,
      type: 'import',
      params: { isDriveJoint: true, jointType, driveType, value, duration },
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
          <span className="dialog-title">Drive Joints</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label className="dialog-label">Joint Type</label>
            <select
              className="dialog-input"
              value={jointType}
              onChange={(e) => setJointType(e.target.value)}
            >
              <option value="revolute">Revolute</option>
              <option value="slider">Slider</option>
              <option value="cylindrical">Cylindrical</option>
            </select>
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Drive Type</label>
            <select
              className="dialog-input"
              value={driveType}
              onChange={(e) => setDriveType(e.target.value)}
            >
              <option value="constant">Constant</option>
              <option value="ramp">Ramp</option>
            </select>
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Value</label>
            <input
              className="dialog-input"
              type="number"
              step={0.1}
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Duration (seconds)</label>
            <input
              className="dialog-input"
              type="number"
              min={0.1}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(Math.max(0.1, parseFloat(e.target.value) || 5))}
            />
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
