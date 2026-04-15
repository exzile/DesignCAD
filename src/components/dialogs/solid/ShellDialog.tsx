import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import type { Feature } from '../../../types/cad';

export function ShellDialog({ onClose }: { onClose: () => void }) {
  // D186: pre-fill from feature being edited
  const editingFeatureId = useCADStore((s) => s.editingFeatureId);
  const features = useCADStore((s) => s.features);
  const editing = editingFeatureId ? features.find((f) => f.id === editingFeatureId) : null;
  const p = editing?.params ?? {};

  const bodyFeatures = features.filter((f) => !!f.mesh);

  const [selectedBodyId, setSelectedBodyId] = useState<string>(String(p.bodyId ?? bodyFeatures[0]?.id ?? ''));
  const [thickness, setThickness] = useState(Number(p.thickness ?? 2));
  const [direction, setDirection] = useState<'inward' | 'outward' | 'symmetric'>((p.direction as 'inward' | 'outward' | 'symmetric') ?? 'inward');
  const [tangentChain, setTangentChain] = useState(p.tangentChain !== false);

  const addFeature = useCADStore((s) => s.addFeature);
  const updateFeatureParams = useCADStore((s) => s.updateFeatureParams);
  const commitShell = useCADStore((s) => s.commitShell);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const handleApply = () => {
    if (editing) {
      updateFeatureParams(editing.id, { thickness, direction, tangentChain, bodyId: selectedBodyId });
      if (selectedBodyId) commitShell(selectedBodyId, thickness, direction);
      setStatusMessage(`Updated shell (${thickness}mm ${direction})`);
    } else if (selectedBodyId) {
      // Commit geometry directly onto selected body
      commitShell(selectedBodyId, thickness, direction);
      setStatusMessage(`Created ${direction} shell with ${thickness}mm thickness`);
    } else {
      // No body yet — store as stub feature
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Shell (${thickness}mm ${direction})`,
        type: 'shell',
        params: { thickness, direction, tangentChain, removeFaces: '' },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
      };
      addFeature(feature);
      setStatusMessage(`Created ${direction} shell with ${thickness}mm thickness`);
    }
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>{editing ? 'Edit Shell' : 'Shell'}</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Body</label>
            <select value={selectedBodyId} onChange={(e) => setSelectedBodyId(e.target.value)}>
              {bodyFeatures.length === 0 && <option value="">— no bodies —</option>}
              {bodyFeatures.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Direction</label>
            <select value={direction} onChange={(e) => setDirection(e.target.value as 'inward' | 'outward' | 'symmetric')}>
              <option value="inward">Inward</option>
              <option value="outward">Outward</option>
              <option value="symmetric">Symmetric</option>
            </select>
          </div>
          <div className="form-group">
            <label>Thickness (mm)</label>
            <input type="number" value={thickness} onChange={(e) => setThickness(parseFloat(e.target.value) || 2)} step={0.5} min={0.1} />
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={tangentChain} onChange={(e) => setTangentChain(e.target.checked)} />
            Tangent Chain face selection
          </label>
          <p className="dialog-hint">Select faces to remove in the viewport, or leave empty to shell all faces.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
