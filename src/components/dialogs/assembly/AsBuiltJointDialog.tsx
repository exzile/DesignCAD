import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import type { JointType } from '../../../types/cad';

interface Props {
  onClose: () => void;
}

const JOINT_TYPES: { value: JointType; label: string }[] = [
  { value: 'rigid',       label: 'Rigid' },
  { value: 'revolute',    label: 'Revolute' },
  { value: 'slider',      label: 'Slider' },
  { value: 'cylindrical', label: 'Cylindrical' },
  { value: 'pin-slot',    label: 'Pin-Slot' },
  { value: 'planar',      label: 'Planar' },
  { value: 'ball',        label: 'Ball' },
];

export default function AsBuiltJointDialog({ onClose }: Props) {
  const addFeature  = useCADStore((s) => s.addFeature);
  const features    = useCADStore((s) => s.features);

  const [component1, setComponent1] = useState('');
  const [component2, setComponent2] = useState('');
  const [jointType, setJointType]   = useState<JointType>('rigid');

  function handleOK() {
    const n    = features.filter((f) => f.params?.asBuilt).length + 1;
    const name = `As-Built Joint ${n}`;
    addFeature({
      id:         `ab-joint-${Date.now()}`,
      name,
      type:       'import',
      params:     { asBuilt: true, jointType, component1, component2 },
      visible:    true,
      suppressed: false,
      timestamp:  Date.now(),
    });
    onClose();
  }

  return (
    <div className="dialog-overlay">
      <div className="dialog-panel">
        <div className="dialog-header">
          <span className="dialog-title">As-Built Joint</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="dialog-body">
          <div className="form-row">
            <label className="form-label">Component 1</label>
            <input
              className="form-input"
              type="text"
              placeholder="Component name"
              value={component1}
              onChange={(e) => setComponent1(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Component 2</label>
            <input
              className="form-input"
              type="text"
              placeholder="Component name"
              value={component2}
              onChange={(e) => setComponent2(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Joint Type</label>
            <select
              className="form-select"
              value={jointType}
              onChange={(e) => setJointType(e.target.value as JointType)}
            >
              {JOINT_TYPES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <p className="form-note">Locks current positions of selected components.</p>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOK}>OK</button>
        </div>
      </div>
    </div>
  );
}
