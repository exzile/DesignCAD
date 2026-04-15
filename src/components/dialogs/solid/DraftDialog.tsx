import { useState } from 'react';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';
import type { Feature } from '../../../types/cad';

export function DraftDialog({ onClose }: { onClose: () => void }) {
  const editingFeatureId = useCADStore((s) => s.editingFeatureId);
  const features = useCADStore((s) => s.features);
  const editing = editingFeatureId ? features.find((f) => f.id === editingFeatureId) : null;
  const p = editing?.params ?? {};

  const bodyFeatures = features.filter((f) => !!f.mesh);

  const [selectedBodyId, setSelectedBodyId] = useState<string>(String(p.bodyId ?? bodyFeatures[0]?.id ?? ''));
  const [draftType, setDraftType] = useState<'fixed-plane' | 'parting-line'>((p.draftType as 'fixed-plane' | 'parting-line') ?? 'fixed-plane');
  const [angle, setAngle] = useState(Number(p.angle ?? 3));
  const [mode, setMode] = useState<'one-side' | 'two-side' | 'symmetric'>((p.mode as 'one-side' | 'two-side' | 'symmetric') ?? 'one-side');
  const [pullAxis, setPullAxis] = useState<'+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z'>((p.pullAxis as '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z') ?? '+Y');
  const [fixedPlaneY, setFixedPlaneY] = useState(Number(p.fixedPlaneOffset ?? 0));

  const addFeature = useCADStore((s) => s.addFeature);
  const updateFeatureParams = useCADStore((s) => s.updateFeatureParams);
  const commitDraft = useCADStore((s) => s.commitDraft);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const getPullAxisDir = (): THREE.Vector3 => {
    switch (pullAxis) {
      case '+X': return new THREE.Vector3(1, 0, 0);
      case '-X': return new THREE.Vector3(-1, 0, 0);
      case '+Y': return new THREE.Vector3(0, 1, 0);
      case '-Y': return new THREE.Vector3(0, -1, 0);
      case '+Z': return new THREE.Vector3(0, 0, 1);
      case '-Z': return new THREE.Vector3(0, 0, -1);
    }
  };

  const handleApply = () => {
    if (editing) {
      updateFeatureParams(editing.id, { draftType, angle, mode, pullAxis, fixedPlaneOffset: fixedPlaneY, bodyId: selectedBodyId });
      if (selectedBodyId) commitDraft(selectedBodyId, getPullAxisDir(), angle, fixedPlaneY);
      setStatusMessage(`Updated draft: ${angle}° (${mode})`);
    } else if (selectedBodyId) {
      commitDraft(selectedBodyId, getPullAxisDir(), angle, fixedPlaneY);
      setStatusMessage(`Draft applied: ${angle}° along ${pullAxis}`);
    } else {
      const feature: Feature = {
        id: crypto.randomUUID(),
        name: `Draft (${angle}°)`,
        type: 'draft',
        params: { draftType, angle, mode, pullAxis, fixedPlaneOffset: fixedPlaneY },
        visible: true,
        suppressed: false,
        timestamp: Date.now(),
      };
      addFeature(feature);
      setStatusMessage(`Draft applied: ${angle}° (${mode})`);
    }
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>{editing ? 'Edit Draft' : 'Draft'}</h3>
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
            <label>Type</label>
            <select value={draftType} onChange={(e) => setDraftType(e.target.value as 'fixed-plane' | 'parting-line')}>
              <option value="fixed-plane">Fixed Plane</option>
              <option value="parting-line">Parting Line</option>
            </select>
          </div>
          <div className="form-group">
            <label>Pull Direction</label>
            <select value={pullAxis} onChange={(e) => setPullAxis(e.target.value as '+X' | '-X' | '+Y' | '-Y' | '+Z' | '-Z')}>
              <option value="+Y">+Y Axis (Up)</option>
              <option value="-Y">-Y Axis (Down)</option>
              <option value="+Z">+Z Axis</option>
              <option value="-Z">-Z Axis</option>
              <option value="+X">+X Axis</option>
              <option value="-X">-X Axis</option>
            </select>
          </div>
          <div className="settings-grid">
            <div className="form-group">
              <label>Draft Angle (°)</label>
              <input type="number" value={angle}
                onChange={(e) => setAngle(Math.max(0.1, Math.min(89, parseFloat(e.target.value) || 3)))}
                step={0.5} min={0.1} max={89} />
            </div>
            <div className="form-group">
              <label>Mode</label>
              <select value={mode} onChange={(e) => setMode(e.target.value as 'one-side' | 'two-side' | 'symmetric')}>
                <option value="one-side">One Side</option>
                <option value="two-side">Two Sides</option>
                <option value="symmetric">Symmetric</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Fixed Plane Offset</label>
            <input type="number" value={fixedPlaneY}
              onChange={(e) => setFixedPlaneY(parseFloat(e.target.value) || 0)}
              step={0.5} />
          </div>
          <p className="dialog-hint">Select the face(s) to draft in the viewport.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>OK</button>
        </div>
      </div>
    </div>
  );
}
