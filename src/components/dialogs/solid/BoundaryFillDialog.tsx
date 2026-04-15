import { useState } from 'react';
import { X } from 'lucide-react';
import { useCADStore } from '../../../store/cadStore';
import type { Feature } from '../../../types/cad';

export function BoundaryFillDialog({ onClose }: { onClose: () => void }) {
  const editingFeatureId = useCADStore((s) => s.editingFeatureId);
  const features = useCADStore((s) => s.features);
  const editing = editingFeatureId ? features.find((f) => f.id === editingFeatureId) : null;
  const p = editing?.params ?? {};

  const bodyFeatures = features.filter((f) => !!f.mesh);

  const [fillType, setFillType] = useState<'between-surfaces' | 'enclosed-volume'>((p.fillType as 'between-surfaces' | 'enclosed-volume') ?? 'between-surfaces');
  const [operation, setOperation] = useState<'new-body' | 'join' | 'cut'>((p.operation as 'new-body' | 'join' | 'cut') ?? 'new-body');
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    p.toolFeatureIds ? String(p.toolFeatureIds).split(',').filter(Boolean) : [],
  );

  const addFeature = useCADStore((s) => s.addFeature);
  const updateFeatureParams = useCADStore((s) => s.updateFeatureParams);
  const commitBoundaryFill = useCADStore((s) => s.commitBoundaryFill);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const boundaryFillCount = features.filter((f) => f.params?.isBoundaryFill).length + 1;

  const toggleTool = (id: string) => {
    setSelectedToolIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleApply = () => {
    if (editing) {
      updateFeatureParams(editing.id, { fillType, operation, isBoundaryFill: true, toolFeatureIds: selectedToolIds.join(',') });
      if (selectedToolIds.length > 0) commitBoundaryFill(selectedToolIds, operation);
      setStatusMessage(`Updated Boundary Fill (${fillType}, ${operation})`);
    } else if (selectedToolIds.length > 0) {
      commitBoundaryFill(selectedToolIds, operation);
      setStatusMessage(`Created Boundary Fill ${boundaryFillCount} (${fillType}, ${operation})`);
    } else {
      // Stub — no tool bodies selected yet
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Boundary Fill ${boundaryFillCount}`,
        type: 'extrude',
        params: { fillType, operation, isBoundaryFill: true, toolFeatureIds: '' },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
      };
      addFeature(feature);
      setStatusMessage(`Created Boundary Fill ${boundaryFillCount} (${fillType}, ${operation})`);
    }
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>{editing ? 'Edit Boundary Fill' : 'Boundary Fill'}</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Fill Type</label>
            <select value={fillType} onChange={(e) => setFillType(e.target.value as 'between-surfaces' | 'enclosed-volume')}>
              <option value="between-surfaces">Between Surfaces</option>
              <option value="enclosed-volume">Enclosed Volume</option>
            </select>
          </div>
          <div className="form-group">
            <label>Operation</label>
            <select value={operation} onChange={(e) => setOperation(e.target.value as 'new-body' | 'join' | 'cut')}>
              <option value="new-body">New Body</option>
              <option value="join">Join</option>
              <option value="cut">Cut</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tool Bodies (select all that form the boundary)</label>
            <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 4 }}>
              {bodyFeatures.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No bodies in scene</span>}
              {bodyFeatures.map((f) => (
                <label key={f.id} className="checkbox-label" style={{ display: 'flex', gap: 6, padding: '2px 0' }}>
                  <input
                    type="checkbox"
                    checked={selectedToolIds.includes(f.id)}
                    onChange={() => toggleTool(f.id)}
                  />
                  {f.name}
                </label>
              ))}
            </div>
          </div>
          <p className="dialog-hint">Select intersecting surfaces or bodies that define the enclosed region to fill.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
