import * as THREE from 'three';
import { Layers, Axis3D, CircleDot, Eye, EyeOff, ScanEye } from 'lucide-react';
import { useComponentStore } from '../../../store/componentStore';
import { useCADStore } from '../../../store/cadStore';

// Scratch — no per-click allocation (NAV-27)
const _mat = new THREE.Matrix4();
const _up = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _zero = new THREE.Vector3();
const _q = new THREE.Quaternion();

export function ConstructionNode({ id }: { id: string }) {
  const construction = useComponentStore((s) => s.constructions[id]);
  const toggleVisibility = useComponentStore((s) => s.toggleConstructionVisibility);
  const setCameraTargetQuaternion = useCADStore((s) => s.setCameraTargetQuaternion);
  const setStatusMessage = useCADStore((s) => s.setStatusMessage);

  if (!construction) return null;

  const icon = construction.type === 'plane' ? <Layers size={12} /> :
               construction.type === 'axis' ? <Axis3D size={12} /> :
               <CircleDot size={12} />;

  /** NAV-27: Look At a construction plane from its normal */
  const handleLookAt = () => {
    if (construction.type !== 'plane' || !construction.planeNormal) return;
    const n = construction.planeNormal;
    _dir.set(-n.x, -n.y, -n.z).normalize();
    _up.set(0, 1, 0);
    if (Math.abs(_up.dot(_dir)) > 0.99) _up.set(1, 0, 0);
    _mat.lookAt(_zero, _dir, _up);
    _q.setFromRotationMatrix(_mat);
    setCameraTargetQuaternion(_q.clone());
    setStatusMessage(`Look At: ${construction.name}`);
  };

  return (
    <div className="tree-item construction-item">
      {icon}
      <span className="tree-name construction-name">{construction.name}</span>
      {construction.type === 'plane' && (
        <button
          className="tree-action"
          title="Look At plane"
          onClick={handleLookAt}
        >
          <ScanEye size={11} />
        </button>
      )}
      <button
        className="tree-action"
        onClick={() => toggleVisibility(id)}
      >
        {construction.visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>
    </div>
  );
}
