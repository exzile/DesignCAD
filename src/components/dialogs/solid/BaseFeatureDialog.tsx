import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';

export function BaseFeatureDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('Base Feature 1');
  const openBaseFeature = useCADStore((s) => s.openBaseFeature);

  const handleApply = () => {
    openBaseFeature(name);
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>Create Base Feature</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <p className="dialog-hint">
            A Base Feature is a non-parametric container. Geometry modeled inside it will not trigger timeline recompute and can be freely edited without constraint. Use it to import or model bodies that shouldn&apos;t participate in the parametric history.
          </p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
