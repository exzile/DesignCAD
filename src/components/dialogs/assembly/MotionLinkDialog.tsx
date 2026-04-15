import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function MotionLinkDialog({ onClose }: { onClose: () => void }) {
  const addFeature = useCADStore((s) => s.addFeature);
  const features = useCADStore((s) => s.features);

  const [sourceJoint, setSourceJoint] = useState('');
  const [targetJoint, setTargetJoint] = useState('');
  const [ratio, setRatio] = useState(1.0);
  const [offset, setOffset] = useState(0);

  const handleOK = () => {
    const n = features.filter((f) => f.name.startsWith('Motion Link')).length + 1;
    addFeature({
      id: crypto.randomUUID(),
      name: `Motion Link ${n}`,
      type: 'import',
      params: { isMotionLink: true, sourceJoint, targetJoint, ratio, offset },
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
          <span className="dialog-title">Motion Link</span>
          <button className="dialog-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="dialog-body">
          <div className="dialog-field">
            <label className="dialog-label">Source Joint</label>
            <input
              className="dialog-input"
              type="text"
              placeholder="Joint name"
              value={sourceJoint}
              onChange={(e) => setSourceJoint(e.target.value)}
            />
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Target Joint</label>
            <input
              className="dialog-input"
              type="text"
              placeholder="Joint name"
              value={targetJoint}
              onChange={(e) => setTargetJoint(e.target.value)}
            />
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Ratio</label>
            <input
              className="dialog-input"
              type="number"
              step={0.1}
              value={ratio}
              onChange={(e) => setRatio(parseFloat(e.target.value) || 1.0)}
            />
          </div>
          <div className="dialog-field">
            <label className="dialog-label">Offset</label>
            <input
              className="dialog-input"
              type="number"
              step={0.1}
              value={offset}
              onChange={(e) => setOffset(parseFloat(e.target.value) || 0)}
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
