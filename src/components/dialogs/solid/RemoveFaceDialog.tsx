import { useState } from 'react';
import { X } from 'lucide-react';
import * as THREE from 'three';
import { useCADStore } from '../../../store/cadStore';
const FACE_NORMALS: Record<string, THREE.Vector3> = {
  Top:    new THREE.Vector3(0,  1, 0),
  Bottom: new THREE.Vector3(0, -1, 0),
  Front:  new THREE.Vector3(0,  0, 1),
  Back:   new THREE.Vector3(0,  0, -1),
  Left:   new THREE.Vector3(-1, 0, 0),
  Right:  new THREE.Vector3(1,  0, 0),
};

export function RemoveFaceDialog({ onClose }: { onClose: () => void }) {
  const editingFeatureId = useCADStore((s) => s.editingFeatureId);
  const features = useCADStore((s) => s.features);
  const editing = editingFeatureId ? features.find((f) => f.id === editingFeatureId) : null;
  const p = editing?.params ?? {};

  const updateFeatureParams = useCADStore((s) => s.updateFeatureParams);
  const commitRemoveFace = useCADStore((s) => s.commitRemoveFace);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  const bodyFeatures = features.filter((f) => !!f.mesh);
  const [selectedId, setSelectedId] = useState<string>(String(p.bodyId ?? bodyFeatures[0]?.id ?? ''));
  const [faceDescription, setFaceDescription] = useState(String(p.faceDescription ?? 'Top'));
  const [keepShape, setKeepShape] = useState(p.keepShape !== false);

  const getFaceCentroid = (bodyId: string, faceDesc: string): THREE.Vector3 => {
    const mesh = features.find((f) => f.id === bodyId)?.mesh as THREE.Mesh | undefined;
    if (mesh?.isMesh) {
      const box = new THREE.Box3().setFromObject(mesh);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const n = FACE_NORMALS[faceDesc] ?? new THREE.Vector3(0, 1, 0);
      return new THREE.Vector3(
        center.x + n.x * size.x * 0.5,
        center.y + n.y * size.y * 0.5,
        center.z + n.z * size.z * 0.5,
      );
    }
    return new THREE.Vector3();
  };

  const handleApply = () => {
    if (!selectedId) {
      setStatusMessage('Remove Face: no body selected');
      return;
    }
    const faceNormal = FACE_NORMALS[faceDescription] ?? new THREE.Vector3(0, 1, 0);
    const faceCentroid = getFaceCentroid(selectedId, faceDescription);

    if (editing) {
      updateFeatureParams(editing.id, { bodyId: selectedId, faceDescription, keepShape });
      commitRemoveFace(selectedId, faceNormal, faceCentroid);
      setStatusMessage(`Updated Remove Face: "${faceDescription}" face`);
    } else {
      commitRemoveFace(selectedId, faceNormal, faceCentroid);
      setStatusMessage(`Remove Face applied: "${faceDescription}" face on ${features.find((f) => f.id === selectedId)?.name ?? selectedId}`);
    }
    onClose();
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog dialog-sm">
        <div className="dialog-header">
          <h3>{editing ? 'Edit Remove Face' : 'Remove Face'}</h3>
          <button className="dialog-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="dialog-body">
          <div className="form-group">
            <label>Body</label>
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {bodyFeatures.length === 0 && <option value="">— no bodies —</option>}
              {bodyFeatures.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Face to Remove</label>
            <select value={faceDescription} onChange={(e) => setFaceDescription(e.target.value)}>
              {Object.keys(FACE_NORMALS).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={keepShape}
                onChange={(e) => setKeepShape(e.target.checked)}
              />
              Keep Shape (extend adjacent faces)
            </label>
          </div>
          <p className="dialog-hint">Removes the specified face and extends adjacent faces to close the gap.</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply} disabled={!selectedId}>OK</button>
        </div>
      </div>
    </div>
  );
}
