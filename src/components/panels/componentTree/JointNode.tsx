import { Link2, Lock, Unlock } from 'lucide-react';
import { useComponentStore } from '../../../store/componentStore';

export function JointNode({ id }: { id: string }) {
  const joint = useComponentStore((s) => s.joints[id]);
  const toggleLock = useComponentStore((s) => s.toggleJointLock);

  if (!joint) return null;

  return (
    <div className="tree-item joint-item">
      <Link2 size={12} />
      <span className="tree-name">{joint.name}</span>
      <span className="joint-type-badge">{joint.type}</span>
      <button
        className="tree-action"
        onClick={() => toggleLock(id)}
      >
        {joint.locked ? <Lock size={11} /> : <Unlock size={11} />}
      </button>
    </div>
  );
}
