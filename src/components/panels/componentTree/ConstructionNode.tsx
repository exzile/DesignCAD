import { Layers, Axis3D, CircleDot, Eye, EyeOff } from 'lucide-react';
import { useComponentStore } from '../../../store/componentStore';

export function ConstructionNode({ id }: { id: string }) {
  const construction = useComponentStore((s) => s.constructions[id]);
  const toggleVisibility = useComponentStore((s) => s.toggleConstructionVisibility);

  if (!construction) return null;

  const icon = construction.type === 'plane' ? <Layers size={12} /> :
               construction.type === 'axis' ? <Axis3D size={12} /> :
               <CircleDot size={12} />;

  return (
    <div className="tree-item construction-item">
      {icon}
      <span className="tree-name construction-name">{construction.name}</span>
      <button
        className="tree-action"
        onClick={() => toggleVisibility(id)}
      >
        {construction.visible ? <Eye size={11} /> : <EyeOff size={11} />}
      </button>
    </div>
  );
}
